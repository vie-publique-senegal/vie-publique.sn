/**
 * Backfill des résultats par circonscription (copie 1:1 depuis carte)
 * et de la population du référentiel des circonscriptions
 *
 * Actions (idempotentes) :
 *  1. une ligne election_constituency_results par couple (election, constituency) de carte —
 *     champs repris : winning_coalition (carte.coalition_gagnante), winning_list, voters,
 *     seat, participation_10h/12h/14h/17h ; les couples déjà présents sont sautés ;
 *     les lignes carte en double sur un même couple sont ignorées (rapportées) ;
 *  2. population du référentiel (election_constituencies.population) depuis carte.population,
 *     uniquement si null — en cas de valeurs divergentes entre élections, la ligne carte
 *     de l'élection la plus récente fait foi (rapporté).
 *
 * La collection carte n'est jamais modifiée (copie seule) et reste la source de lecture
 * des endpoints jusqu'à la bascule.
 *
 * Usage :
 *   node scripts/elections/backfill-constituency-results.mjs            # dry-run
 *   node scripts/elections/backfill-constituency-results.mjs --execute  # exécution
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
    const res = await api(`/items/${collection}?limit=200&page=${page}&sort=id&${params}`);
    items.push(...res.data);
    if (res.data.length < 200) return items;
    page++;
  }
}

(async () => {
  console.log(`🚀 Backfill résultats par circonscription sur ${CMS_API_URL} — mode ${EXECUTE ? '⚡ EXÉCUTION' : '🔍 DRY-RUN'}\n`);

  const carte = await fetchAll('carte', 'fields=id,election,constituencie,coalition_gagnante,winning_list,voters,seat,participation_10h,participation_12h,participation_14h,participation_17h,population');
  console.log(`Lignes carte source : ${carte.length}`);

  const elections = await api('/items/elections?fields=id,election_date&limit=50&sort=id');
  const electionDate = new Map(elections.data.map((e) => [e.id, e.election_date || '']));

  // --- 1. Résultats ---
  const existing = await fetchAll('election_constituency_results', 'fields=id,election,constituency');
  const existingKeys = new Set(existing.map((r) => `${r.election}|${r.constituency}`));
  console.log(`Résultats déjà présents dans la cible : ${existing.length}`);

  const toCreate = [];
  const skippedDuplicates = [];
  const seen = new Set();
  for (const r of carte) {
    if (r.election == null || r.constituencie == null) {
      console.warn(`⚠️  carte ${r.id} : election ou constituencie null — ignorée`);
      continue;
    }
    const key = `${r.election}|${r.constituencie}`;
    if (seen.has(key)) { skippedDuplicates.push(`carte ${r.id} (couple ${key} déjà traité)`); continue; }
    seen.add(key);
    if (existingKeys.has(key)) continue;
    toCreate.push({
      status: 'published',
      election: r.election,
      constituency: r.constituencie,
      winning_coalition: r.coalition_gagnante ?? null,
      winning_list: r.winning_list ?? null,
      voters: r.voters ?? null,
      seat: r.seat ?? null,
      participation_10h: r.participation_10h ?? null,
      participation_12h: r.participation_12h ?? null,
      participation_14h: r.participation_14h ?? null,
      participation_17h: r.participation_17h ?? null,
    });
  }
  if (skippedDuplicates.length) {
    console.log(`Lignes carte en double sur un couple (ignorées) : ${skippedDuplicates.length}`);
    for (const s of skippedDuplicates) console.log('  ' + s);
  }
  console.log(`Résultats à créer : ${toCreate.length}`);

  // --- 2. Population du référentiel (source : ligne carte la plus récente non nulle) ---
  const constituencies = await fetchAll('election_constituencies', 'fields=id,name,population');
  const popByConstituency = new Map();
  for (const r of carte) {
    if (r.population == null || r.constituencie == null) continue;
    const current = popByConstituency.get(r.constituencie);
    if (!current || (electionDate.get(r.election) || '') > (electionDate.get(current.election) || '')) {
      popByConstituency.set(r.constituencie, { population: r.population, election: r.election });
    } else if (current.population !== r.population && (electionDate.get(r.election) || '') < (electionDate.get(current.election) || '')) {
      console.log(`  divergence population circo ${r.constituencie} : ${r.population} (élection ${r.election}) vs ${current.population} (élection ${current.election} retenue)`);
    }
  }
  const popPatches = [];
  for (const c of constituencies) {
    if (c.population != null) continue;
    const pop = popByConstituency.get(c.id);
    if (pop) popPatches.push({ id: c.id, population: pop.population });
  }
  console.log(`Populations à poser sur le référentiel : ${popPatches.length} (uniquement population null)`);

  if (!EXECUTE) { console.log('\n🔍 Dry-run terminé. Relancer avec --execute pour appliquer.'); return; }

  let done = 0;
  for (let i = 0; i < toCreate.length; i += 100) {
    await api('/items/election_constituency_results', { method: 'POST', body: toCreate.slice(i, i + 100) });
    done += Math.min(100, toCreate.length - i);
    if (done % 200 === 0) console.log(`  ... ${done}/${toCreate.length}`);
  }
  console.log(`✅ ${done} résultats créés`);

  let popDone = 0;
  for (const p of popPatches) {
    await api(`/items/election_constituencies/${p.id}`, { method: 'PATCH', body: { population: p.population } });
    if (++popDone % 200 === 0) console.log(`  ... ${popDone}/${popPatches.length}`);
  }
  console.log(`✅ ${popDone} populations posées`);

  // --- Contrôles bloquants ---
  const after = await fetchAll('election_constituency_results', 'fields=id,election,constituency,winning_coalition,voters');
  const keys = after.map((r) => `${r.election}|${r.constituency}`);
  const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
  const expected = seen.size;
  // échantillon : 5 lignes comparées champ à champ à leur source carte
  const byKey = new Map(carte.filter((r) => r.election != null && r.constituencie != null).map((r) => [`${r.election}|${r.constituencie}`, r]));
  let sampleErrors = 0;
  for (const r of after.filter((_, i) => i % Math.ceil(after.length / 5) === 0)) {
    const src = byKey.get(`${r.election}|${r.constituency}`);
    if (!src || (src.coalition_gagnante ?? null) !== r.winning_coalition || (src.voters ?? null) !== r.voters) {
      sampleErrors++;
      console.error(`  échantillon KO : résultat ${r.id} vs carte ${src?.id}`);
    }
  }
  console.log(`\nContrôles : lignes=${after.length} (attendu ${expected}) · doublons (election, constituency)=${dups.length} (attendu 0) · échantillon KO=${sampleErrors} (attendu 0)`);
  if (after.length !== expected || dups.length || sampleErrors) {
    console.error('❌ Contrôles de sortie en échec');
    process.exit(1);
  }
  console.log('✅ Contrôles de sortie OK');
})().catch((e) => { console.error(`\n❌ Échec : ${e.message}`); process.exit(1); });
