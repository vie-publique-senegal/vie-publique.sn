/**
 * Backfill des fichiers électoraux 2024 et des bureaux de vote
 *
 * Actions (idempotentes, jamais de réécriture d'une valeur déjà posée) :
 *  1. création des 2 lignes « Fichier électoral 2024 » (national + diaspora) si absentes
 *     (recherche par scope + year) ;
 *  2. rattachement des élections législatives et présidentielle 2024 (résolues par
 *     type + année, jamais par ID) aux 2 fichiers, uniquement si la FK est null ;
 *  3. copie des bureaux nationaux (election_map_national) rattachés aux législatives 2024
 *     vers election_polling_stations — circonscription par matching du texte `department`
 *     normalisé contre les départements du référentiel (toute ligne non résolue est bloquante) ;
 *  4. copie des bureaux diaspora (election_map_diaspora) des législatives 2024 —
 *     circonscription par la table pays → zone du script (toute ligne non résolue est bloquante).
 *
 * Les collections sources ne sont jamais modifiées (copie seule).
 * Le dry-run écrit reports/polling-stations-country-zones.csv (correspondance pays → zone à revoir).
 *
 * Usage :
 *   node scripts/elections/backfill-polling-stations.mjs            # dry-run
 *   node scripts/elections/backfill-polling-stations.mjs --execute  # exécution
 *
 * L'environnement cible est celui de la section active du .env (CMS_API_URL / CMS_API_KEY).
 */

import './load-env.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CMS_API_URL = process.env.CMS_API_URL;
const CMS_API_KEY = process.env.CMS_API_KEY;
const EXECUTE = process.argv.includes('--execute');
const REPORTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'reports');

if (!CMS_API_URL || !CMS_API_KEY) {
  console.error('❌ CMS_API_URL et CMS_API_KEY sont requis.');
  process.exit(1);
}

const YEAR = 2024;

// Zones des 8 circonscriptions de l'étranger (slugs du référentiel) par pays
// (texte `country` normalisé des bureaux diaspora). Rattachements incertains
// signalés dans le CSV de revue — corriger ici puis rejouer si besoin.
const COUNTRY_ZONES = {
  // Afrique de l'Ouest
  'benin': 'afrique-ouest', 'burkina faso': 'afrique-ouest', 'cap vert': 'afrique-ouest',
  'cote d ivoire': 'afrique-ouest', 'gambie': 'afrique-ouest', 'ghana': 'afrique-ouest',
  'guinee': 'afrique-ouest', 'guinee bissau': 'afrique-ouest', 'mali': 'afrique-ouest',
  'niger': 'afrique-ouest', 'nigeria': 'afrique-ouest', 'sierra leone': 'afrique-ouest',
  'togo': 'afrique-ouest',
  // Afrique du Centre
  'cameroun': 'afrique-centre', 'gabon': 'afrique-centre', 'guinee equatoriale': 'afrique-centre',
  'rep. dem. congo': 'afrique-centre', 'republique du congo': 'afrique-centre', 'tchad': 'afrique-centre',
  // Afrique du Nord
  'egypte': 'afrique-nord', 'maroc': 'afrique-nord', 'mauritanie': 'afrique-nord', 'tunisie': 'afrique-nord',
  // Afrique australe
  'afrique du sud': 'afrique-australe', 'angola': 'afrique-australe',
  'mozambique': 'afrique-australe', 'zambie': 'afrique-australe',
  // Amérique - Océanie
  'argentine': 'amerique-oceanie', 'bresil': 'amerique-oceanie',
  'canada': 'amerique-oceanie', 'etats unis d amerique': 'amerique-oceanie',
  // Asie - Moyen-Orient
  'arabie saoudite': 'asie-moyen-orient', 'emirats arabes unis': 'asie-moyen-orient',
  'koweit': 'asie-moyen-orient', 'liban': 'asie-moyen-orient', 'turquie': 'asie-moyen-orient',
  // Europe du Sud
  'espagne': 'europe-du-sud', 'italie': 'europe-du-sud', 'portugal': 'europe-du-sud',
  // Europe Ouest-Centre-Nord
  'allemagne': 'europe-ouest-centre-nord', 'angleterre': 'europe-ouest-centre-nord',
  'belgique': 'europe-ouest-centre-nord', 'danemark': 'europe-ouest-centre-nord',
  'finlande': 'europe-ouest-centre-nord', 'france': 'europe-ouest-centre-nord',
  'luxembourg': 'europe-ouest-centre-nord', 'norvege': 'europe-ouest-centre-nord',
  'pays bas': 'europe-ouest-centre-nord', 'suede': 'europe-ouest-centre-nord',
  'suisse': 'europe-ouest-centre-nord',
};

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'-]+/g, ' ').trim();

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

async function resolveElection(type) {
  const res = await api(`/items/elections?filter[type][_eq]=${type}&filter[year][_eq]=${YEAR}&filter[status][_nin]=draft,archived&fields=id,name,electoral_file_national,electoral_file_diaspora&sort=id`);
  if (res.data.length !== 1) throw new Error(`élection ${type} ${YEAR} : ${res.data.length} correspondance(s) (attendu 1)`);
  return res.data[0];
}

(async () => {
  console.log(`🚀 Backfill fichiers électoraux + bureaux sur ${CMS_API_URL} — mode ${EXECUTE ? '⚡ EXÉCUTION' : '🔍 DRY-RUN'}\n`);

  const legislative = await resolveElection('legislative');
  const presidential = await resolveElection('presidential');
  console.log(`Élections ${YEAR} : législatives=${legislative.id}, présidentielle=${presidential.id}`);

  // --- 1. Les 2 fichiers électoraux ---
  const files = {};
  for (const scope of ['national', 'diaspora']) {
    const existing = await api(`/items/election_electoral_files?filter[scope][_eq]=${scope}&filter[year][_eq]=${YEAR}&fields=id,name&sort=id`);
    if (existing.data.length > 1) throw new Error(`fichier ${scope} ${YEAR} : ${existing.data.length} lignes (attendu 0 ou 1)`);
    if (existing.data.length === 1) {
      files[scope] = existing.data[0].id;
      console.log(`⏭️  fichier ${scope} ${YEAR} : déjà présent (id ${files[scope]})`);
    } else if (EXECUTE) {
      const res = await api('/items/election_electoral_files', { method: 'POST', body: {
        status: 'published',
        name: `Fichier électoral ${YEAR} — ${scope}`,
        scope, year: YEAR,
      } });
      files[scope] = res.data.id;
      console.log(`✅ fichier ${scope} ${YEAR} créé (id ${files[scope]})`);
    } else {
      files[scope] = `(nouveau ${scope})`;
      console.log(`➕ fichier ${scope} ${YEAR} : à créer`);
    }
  }

  // --- 2. Rattachement des élections (jamais de réécriture) ---
  for (const el of [legislative, presidential]) {
    const patch = {};
    if (el.electoral_file_national == null) patch.electoral_file_national = files.national;
    if (el.electoral_file_diaspora == null) patch.electoral_file_diaspora = files.diaspora;
    if (!Object.keys(patch).length) {
      console.log(`⏭️  élection ${el.id} : fichiers déjà rattachés`);
    } else if (EXECUTE) {
      await api(`/items/elections/${el.id}`, { method: 'PATCH', body: patch });
      console.log(`✅ élection ${el.id} rattachée : ${Object.keys(patch).join(', ')}`);
    } else {
      console.log(`➕ élection ${el.id} : à rattacher (${Object.keys(patch).join(', ')})`);
    }
  }

  // --- 3. Référentiel ---
  const constituencies = await fetchAll('election_constituencies', 'fields=id,name,slug,type,nationale_type');
  const deptByNorm = new Map(constituencies.filter((c) => c.nationale_type === 'departement').map((c) => [norm(c.name), c.id]));
  const zoneBySlug = new Map(constituencies.filter((c) => c.type === 'diaspora').map((c) => [c.slug, c.id]));

  // --- 4. Bureaux déjà migrés (clé d'idempotence, vérifiée sans doublon en dev et prod) ---
  const existing = await fetchAll('election_polling_stations', 'fields=id,electoral_file,polling_place,office_number,municipality,locality,country');
  const existingKeys = new Set(existing.map((b) => [b.electoral_file, b.polling_place, b.office_number, b.municipality || '', b.country || '', b.locality || ''].join('|')));
  console.log(`\nBureaux déjà présents dans la cible : ${existing.length}`);

  const toCreate = [];
  const problems = [];

  // --- 5. National ---
  const national = await fetchAll('election_map_national', `filter[election][_eq]=${legislative.id}&fields=id,polling_place,office_number,voters,implantation,municipality,department`);
  console.log(`Bureaux nationaux source (législatives ${YEAR}) : ${national.length}`);
  for (const b of national) {
    const constituency = deptByNorm.get(norm(b.department));
    if (!constituency) { problems.push(`national ${b.id} : département "${b.department}" non résolu`); continue; }
    const row = {
      status: 'published', electoral_file: files.national, constituency,
      polling_place: b.polling_place, office_number: String(b.office_number),
      voters: b.voters ?? null, municipality: b.municipality ?? null, implantation: b.implantation ?? null,
    };
    const key = [row.electoral_file, row.polling_place, row.office_number, row.municipality || '', '', ''].join('|');
    if (!existingKeys.has(key)) toCreate.push(row);
  }

  // --- 6. Diaspora ---
  const diaspora = await fetchAll('election_map_diaspora', `filter[election][_eq]=${legislative.id}&fields=id,polling_place,office_number,voters,country,locality,diplomatic_representation`);
  console.log(`Bureaux diaspora source (législatives ${YEAR}) : ${diaspora.length}`);
  const countryStats = new Map();
  for (const b of diaspora) {
    const zoneSlug = COUNTRY_ZONES[norm(b.country)];
    const constituency = zoneSlug ? zoneBySlug.get(zoneSlug) : null;
    if (!constituency) { problems.push(`diaspora ${b.id} : pays "${b.country}" non résolu (zone: ${zoneSlug || 'absente de la table'})`); continue; }
    countryStats.set(b.country, { zone: zoneSlug, count: (countryStats.get(b.country)?.count || 0) + 1 });
    const row = {
      status: 'published', electoral_file: files.diaspora, constituency,
      polling_place: b.polling_place, office_number: String(b.office_number),
      voters: b.voters ?? null, country: b.country ?? null, locality: b.locality ?? null,
      diplomatic_representation: b.diplomatic_representation ?? null,
    };
    const key = [row.electoral_file, row.polling_place, row.office_number, '', row.country || '', row.locality || ''].join('|');
    if (!existingKeys.has(key)) toCreate.push(row);
  }

  // --- CSV de revue pays → zone ---
  mkdirSync(REPORTS_DIR, { recursive: true });
  const csv = ['country;zone;bureaux', ...[...countryStats.entries()].sort().map(([c, s]) => `${c};${s.zone};${s.count}`)].join('\n');
  writeFileSync(join(REPORTS_DIR, 'polling-stations-country-zones.csv'), csv);
  console.log(`\nCorrespondance pays → zone : ${countryStats.size} pays (revue : reports/polling-stations-country-zones.csv)`);

  if (problems.length) {
    console.error(`\n❌ ${problems.length} ligne(s) non résolue(s) :`);
    for (const p of problems.slice(0, 20)) console.error('  ' + p);
    process.exit(1);
  }

  console.log(`\nBureaux à créer : ${toCreate.length} (national+diaspora, ${existingKeys.size ? 'hors déjà migrés' : 'cible vide'})`);

  if (!EXECUTE) { console.log('\n🔍 Dry-run terminé. Relancer avec --execute pour appliquer.'); return; }

  let done = 0;
  for (let i = 0; i < toCreate.length; i += 100) {
    await api('/items/election_polling_stations', { method: 'POST', body: toCreate.slice(i, i + 100) });
    done += Math.min(100, toCreate.length - i);
    if (done % 2000 < 100) console.log(`  ... ${done}/${toCreate.length}`);
  }
  console.log(`✅ ${done} bureaux créés`);

  // --- Contrôles bloquants ---
  const sum = (rows) => rows.reduce((s, r) => s + (r.voters || 0), 0);
  const targetNat = await fetchAll('election_polling_stations', `filter[electoral_file][_eq]=${files.national}&fields=id,voters,constituency`);
  const targetDia = await fetchAll('election_polling_stations', `filter[electoral_file][_eq]=${files.diaspora}&fields=id,voters,constituency`);
  const noConstituency = [...targetNat, ...targetDia].filter((b) => b.constituency == null).length;
  console.log(`\nContrôles : national ${targetNat.length}/${national.length} · diaspora ${targetDia.length}/${diaspora.length} · sans circonscription=${noConstituency} (attendu 0)`);
  console.log(`Sommes voters : national ${sum(targetNat)}/${sum(national)} · diaspora ${sum(targetDia)}/${sum(diaspora)}`);
  if (targetNat.length !== national.length || targetDia.length !== diaspora.length || noConstituency ||
      sum(targetNat) !== sum(national) || sum(targetDia) !== sum(diaspora)) {
    console.error('❌ Contrôles de sortie en échec');
    process.exit(1);
  }
  console.log('✅ Contrôles de sortie OK');
})().catch((e) => { console.error(`\n❌ Échec : ${e.message}`); process.exit(1); });
