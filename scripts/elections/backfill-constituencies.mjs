/**
 * Backfill du référentiel election_constituencies : régions, hiérarchie, slugs
 *
 * Actions (toutes idempotentes, jamais de réécriture d'une valeur déjà posée) :
 *  1. création des 14 régions (nationale_type=region) si absentes ;
 *  2. parent des départements → leur région (via le champ texte `region` normalisé) ;
 *  3. slug de toute ligne qui n'en a pas :
 *     - région          : region-<nom>          (toutes les régions ont un département homonyme)
 *     - département     : <nom>
 *     - commune         : <nom>, puis <nom>-<slug du département> en cas de collision, puis suffixe numérique
 *     - diaspora/autres : <nom>
 *  4. code officiel (pcode OCHA COD-AB) des régions et départements, posé uniquement
 *     si `code` est null (le slug est la clé contractuelle, le code est informatif).
 *
 * Usage :
 *   node scripts/elections/backfill-constituencies.mjs            # dry-run
 *   node scripts/elections/backfill-constituencies.mjs --execute  # exécution
 *
 * L'environnement cible est celui de la section active du .env (CMS_API_URL / CMS_API_KEY).
 */

import './load-env.mjs';

const CMS_API_URL = process.env.CMS_API_URL;
const CMS_API_KEY = process.env.CMS_API_KEY;
const EXECUTE = process.argv.includes('--execute');

if (!CMS_API_URL || !CMS_API_KEY) {
  console.error('❌ CMS_API_URL et CMS_API_KEY sont requis.');
  process.exit(1);
}

// Les 14 régions administratives (graphie officielle accentuée)
const REGIONS = [
  'Dakar', 'Diourbel', 'Fatick', 'Kaffrine', 'Kaolack', 'Kédougou', 'Kolda',
  'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda', 'Thiès', 'Ziguinchor',
];

// Codes officiels (pcode OCHA COD-AB Sénégal v02, valid_on 2024-05-20,
// https://data.humdata.org/dataset/cod-ab-sen). Correspondance vérifiée nom à nom
// contre le référentiel ; 3 graphies divergentes appariées manuellement :
// Birkilane→Birkelane, Médina Yoro Foulah→Médina-Yorofoula, Ranérou Ferlo→Ranérou.
const REGION_CODES = {
  Dakar: 'SN01', Diourbel: 'SN02', Fatick: 'SN03', Kaffrine: 'SN04',
  Kaolack: 'SN05', 'Kédougou': 'SN06', Kolda: 'SN07', Louga: 'SN08',
  Matam: 'SN09', 'Saint-Louis': 'SN10', 'Sédhiou': 'SN11', Tambacounda: 'SN12',
  'Thiès': 'SN13', Ziguinchor: 'SN14',
};
const DEPARTMENT_CODES = {
  'DAKAR': 'SN0101', 'GUEDIAWAYE': 'SN0102', 'PIKINE': 'SN0103', 'RUFISQUE': 'SN0104', 'KEUR MASSAR': 'SN0105',
  'BAMBEY': 'SN0201', 'DIOURBEL': 'SN0202', 'MBACKE': 'SN0203',
  'FATICK': 'SN0301', 'FOUNDIOUGNE': 'SN0302', 'GOSSAS': 'SN0303',
  'BIRKILANE': 'SN0401', 'KAFFRINE': 'SN0402', 'KOUNGHEUL': 'SN0403', 'MALEM HODAR': 'SN0404',
  'GUINGUINEO': 'SN0501', 'KAOLACK': 'SN0502', 'NIORO DU RIP': 'SN0503',
  'KEDOUGOU': 'SN0601', 'SALEMATA': 'SN0602', 'SARAYA': 'SN0603',
  'KOLDA': 'SN0701', 'MEDINA YORO FOULAH': 'SN0702', 'VELINGARA': 'SN0703',
  'KEBEMER': 'SN0801', 'LINGUERE': 'SN0802', 'LOUGA': 'SN0803',
  'KANEL': 'SN0901', 'MATAM': 'SN0902', 'RANEROU FERLO': 'SN0903',
  'DAGANA': 'SN1001', 'PODOR': 'SN1002', 'SAINT LOUIS': 'SN1003',
  'BOUNKILING': 'SN1101', 'GOUDOMP': 'SN1102', 'SEDHIOU': 'SN1103',
  'BAKEL': 'SN1201', 'GOUDIRY': 'SN1202', 'KOUMPENTOUM': 'SN1203', 'TAMBACOUNDA': 'SN1204',
  'MBOUR': 'SN1301', 'THIES': 'SN1302', 'TIVAOUANE': 'SN1303',
  'BIGNONA': 'SN1401', 'OUSSOUYE': 'SN1402', 'ZIGUINCHOR': 'SN1403',
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'-]+/g, ' ').trim();
const slugify = (s) => norm(s).replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');

async function api(route, { method = 'GET', body } = {}) {
  const res = await fetch(`${CMS_API_URL}${route}`, {
    method,
    headers: { Authorization: `Bearer ${CMS_API_KEY}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${route} → HTTP ${res.status}\n${(await res.text()).slice(0, 500)}`);
  return res.status === 204 ? null : res.json();
}

async function fetchAll(collection, params) {
  const items = [];
  let page = 1;
  for (;;) {
    const res = await api(`/items/${collection}?limit=200&page=${page}&${params}`);
    items.push(...res.data);
    if (res.data.length < 200) return items;
    page++;
  }
}

(async () => {
  console.log(`🚀 Backfill circonscriptions sur ${CMS_API_URL} — mode ${EXECUTE ? '⚡ EXÉCUTION' : '🔍 DRY-RUN'}\n`);

  const rows = await fetchAll('election_constituencies', 'fields=id,status,name,type,nationale_type,region,parent,slug,code');
  console.log(`Lignes existantes : ${rows.length}`);

  const report = { regionsCreated: 0, parentsSet: 0, slugsSet: 0, codesSet: 0, collisions: [], warnings: [] };
  const patches = new Map(); // id → données à PATCHer
  const patch = (id, data) => patches.set(id, { ...(patches.get(id) || {}), ...data });

  // --- 1. Régions ---
  const existingRegions = new Map(
    rows.filter((r) => r.nationale_type === 'region').map((r) => [norm(r.name), r]),
  );
  const regionIdByNorm = new Map();
  const toCreate = [];
  for (const name of REGIONS) {
    const existing = existingRegions.get(norm(name));
    if (existing) {
      regionIdByNorm.set(norm(name), existing.id);
      continue;
    }
    toCreate.push({
      status: 'published',
      name,
      type: 'national',
      nationale_type: 'region',
      region: name,
      slug: `region-${slugify(name)}`,
      code: REGION_CODES[name] ?? null,
    });
  }
  console.log(`Régions : ${existingRegions.size} existantes, ${toCreate.length} à créer`);
  if (EXECUTE && toCreate.length) {
    const res = await api('/items/election_constituencies', { method: 'POST', body: toCreate });
    for (const r of res.data) regionIdByNorm.set(norm(r.name), r.id);
    report.regionsCreated = res.data.length;
  } else {
    for (const r of toCreate) regionIdByNorm.set(norm(r.name), `(nouvelle: ${r.name})`);
    report.regionsCreated = toCreate.length;
  }

  // --- 2. Parents des départements ---
  const departments = rows.filter((r) => r.type === 'national' && r.nationale_type === 'departement');
  for (const d of departments) {
    if (d.parent != null) continue;
    const regionId = regionIdByNorm.get(norm(d.region));
    if (regionId == null) {
      report.warnings.push(`département ${d.id} "${d.name}" : région "${d.region}" inconnue — parent non posé`);
      continue;
    }
    patch(d.id, { parent: regionId });
    report.parentsSet++;
  }

  // --- 3. Slugs ---
  const usedSlugs = new Set(rows.map((r) => r.slug).filter(Boolean));
  for (const r of toCreate) usedSlugs.add(r.slug);
  const deptById = new Map(departments.map((d) => [d.id, d]));

  const claim = (row, base, fallback) => {
    let slug = base;
    if (usedSlugs.has(slug) && fallback) slug = fallback;
    let i = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${i++}`;
    if (slug !== base) report.collisions.push(`${row.id} "${row.name}" : ${base} → ${slug}`);
    usedSlugs.add(slug);
    patch(row.id, { slug });
    report.slugsSet++;
  };

  // ordre : régions existantes sans slug → départements → diaspora/national → communes
  for (const r of rows.filter((x) => x.nationale_type === 'region' && !x.slug)) claim(r, `region-${slugify(r.name)}`);
  for (const r of departments.filter((x) => !x.slug)) claim(r, slugify(r.name));
  for (const r of rows.filter((x) => !x.slug && x.nationale_type == null && x.type !== 'diaspora' && x.nationale_type !== 'region')) claim(r, slugify(r.name));
  for (const r of rows.filter((x) => x.type === 'diaspora' && !x.slug)) claim(r, slugify(r.name));
  for (const r of rows.filter((x) => x.nationale_type === 'commune' && !x.slug)) {
    const dept = deptById.get(r.parent);
    claim(r, slugify(r.name), dept ? `${slugify(r.name)}-${slugify(dept.name)}` : undefined);
  }

  // --- 4. Codes des régions et départements (uniquement si code null) ---
  for (const r of rows.filter((x) => x.nationale_type === 'region')) {
    if (r.code != null) continue;
    const code = Object.entries(REGION_CODES).find(([name]) => norm(name) === norm(r.name))?.[1];
    if (code) {
      patch(r.id, { code });
      report.codesSet++;
    }
  }
  for (const d of departments) {
    if (d.code != null) continue;
    const code = DEPARTMENT_CODES[norm(d.name).toUpperCase()];
    if (code) {
      patch(d.id, { code });
      report.codesSet++;
    }
  }

  // --- Application ---
  console.log(`\nPatches à appliquer : ${patches.size} lignes (parents: ${report.parentsSet}, slugs: ${report.slugsSet}, codes: ${report.codesSet})`);
  if (report.collisions.length) {
    console.log(`Collisions de slug résolues (${report.collisions.length}) :`);
    for (const c of report.collisions) console.log(`  ${c}`);
  }
  for (const w of report.warnings) console.warn(`⚠️  ${w}`);

  if (EXECUTE) {
    let done = 0;
    for (const [id, data] of patches) {
      await api(`/items/election_constituencies/${id}`, { method: 'PATCH', body: data });
      if (++done % 100 === 0) console.log(`  ... ${done}/${patches.size}`);
    }
    console.log(`✅ ${done} lignes mises à jour, ${report.regionsCreated} régions créées`);

    // --- Contrôles bloquants ---
    const after = await fetchAll('election_constituencies', 'fields=id,status,name,nationale_type,parent,slug');
    const regions = after.filter((r) => r.nationale_type === 'region');
    const noSlug = after.filter((r) => r.status === 'published' && !r.slug);
    const slugs = after.map((r) => r.slug).filter(Boolean);
    const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    const deptsNoParent = after.filter((r) => r.nationale_type === 'departement' && r.parent == null);
    console.log(`\nContrôles : régions=${regions.length} (attendu 14) · publiées sans slug=${noSlug.length} (attendu 0) · slugs dupliqués=${dupSlugs.length} (attendu 0) · départements sans parent=${deptsNoParent.length} (attendu 0)`);
    if (regions.length !== 14 || noSlug.length || dupSlugs.length || deptsNoParent.length) {
      console.error('❌ Contrôles de sortie en échec :', JSON.stringify({ noSlug: noSlug.map((r) => r.id), dupSlugs, deptsNoParent: deptsNoParent.map((r) => r.id) }));
      process.exit(1);
    }
    console.log('✅ Contrôles de sortie OK');
  } else {
    console.log('\n🔍 Dry-run terminé. Relancer avec --execute pour appliquer.');
  }
})();
