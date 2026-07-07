/**
 * Backfill : création des election_persons depuis election_candidates
 *
 * Voir docs/guidelines/elections/deployments/2026-07-migration-prod.md (phase 2 : règles de dédoublonnage)
 *
 * Règles :
 *  - une person par candidat (les homonymes d'une même élection sont des personnes distinctes) ;
 *  - fusion UNIQUEMENT inter-élections, et uniquement si validée dans le fichier --merges ;
 *  - le dry-run produit un CSV de revue des fusions candidates (collisions nom+genre inter-élections).
 *
 * Usage :
 *   node scripts/elections/backfill-persons.mjs                             # dry-run
 *   node scripts/elections/backfill-persons.mjs --execute --merges=chemin  # exécution
 *
 * Format du fichier --merges : une ligne par fusion, IDs candidats séparés par des virgules,
 * le PREMIER id est le candidat "principal" (source des champs et du slug de la person).
 * Lignes vides et lignes commençant par # ignorées.
 *
 * Idempotent : les candidats ayant déjà `person` rempli sont sautés.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './load-env.mjs';

const CMS_API_URL = process.env.CMS_API_URL;
const CMS_API_KEY = process.env.CMS_API_KEY;
const EXECUTE = process.argv.includes('--execute');
const mergesArg = process.argv.find((a) => a.startsWith('--merges='));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.join(__dirname, 'reports');
const REVIEW_CSV = path.join(REPORT_DIR, 'persons-review-fusions.csv');

if (!CMS_API_URL || !CMS_API_KEY) {
  console.error('❌ CMS_API_URL et CMS_API_KEY sont requis.');
  process.exit(1);
}

// Champs identité lus sur les candidats : uniquement des colonnes existant en PROD
// (les champs dev-only slug/short_bio/long_bio/linkedin n'y ont jamais été créés).
const IDENTITY_FIELDS = ['first_name', 'last_name', 'gender', 'birthdate', 'birthplace', 'profession', 'tags', 'photo', 'biography', 'facebook', 'twitter'];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'-]+/g, ' ').trim();
const slugify = (s) => norm(s).replace(/[^a-z0-9 ]/g, '').trim().replace(/ +/g, '-');
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, (i + 1) * n));

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
  console.log(`🚀 Backfill persons sur ${CMS_API_URL} — mode ${EXECUTE ? '⚡ EXÉCUTION' : '🔍 DRY-RUN'}\n`);

  // --- Fusions validées (inter-élections uniquement) ---
  const merges = []; // [[idPrincipal, ...autres]]
  if (mergesArg) {
    const file = mergesArg.split('=')[1];
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const ids = t.split(',').map((x) => parseInt(x.trim(), 10)).filter(Number.isFinite);
      if (ids.length >= 2) merges.push(ids);
    }
    console.log(`📋 fusions validées chargées : ${merges.length}`);
  }
  const mergeGroupOf = new Map(); // candidateId -> index de groupe
  merges.forEach((ids, gi) => ids.forEach((id) => mergeGroupOf.set(id, gi)));

  // --- Lecture des candidats ---
  // Les candidats archivés sont exclus du backfill (ils ne reçoivent pas de person)
  const candidates = await fetchAll(
    'election_candidates',
    'filter[status][_neq]=archived&fields=id,person,status,position,' + IDENTITY_FIELDS.join(',') +
    ',electoral_list.election,electoral_list.is_substitute,electoral_list.coalition.name'
  );
  const todo = candidates.filter((c) => c.person == null);
  console.log(`candidats : ${candidates.length} au total, ${candidates.length - todo.length} déjà liés, ${todo.length} à traiter`);

  // --- Détection des collisions inter-élections (CSV de revue) ---
  const byKey = new Map();
  for (const c of candidates) {
    const key = `${norm(`${c.first_name} ${c.last_name}`)}|${c.gender || '?'}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(c);
  }
  const reviewRows = [];
  for (const [key, group] of byKey) {
    const elections = new Set(group.map((c) => c.electoral_list?.election));
    if (elections.size < 2) continue;
    const bds = new Set(group.map((c) => c.birthdate).filter(Boolean));
    const conflict = bds.size > 1;
    for (const c of group) {
      reviewRows.push([
        key, c.id, c.electoral_list?.election, c.electoral_list?.coalition?.name || '', c.position ?? '',
        c.electoral_list?.is_substitute ? 'suppléant' : 'titulaire', c.birthdate || '', conflict ? 'CONFLIT birthdate' : '',
        mergeGroupOf.has(c.id) ? `fusion validée #${mergeGroupOf.get(c.id) + 1}` : '',
      ].join(';'));
    }
  }
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REVIEW_CSV, 'cle;candidate_id;election;coalition;position;role;birthdate;alerte;statut_fusion\n' + reviewRows.join('\n'));
  console.log(`📄 CSV de revue des fusions candidates : ${REVIEW_CSV} (${reviewRows.length} lignes)`);

  // --- Constitution des persons à créer ---
  // Un "groupe" = une person : soit un groupe de fusion validé, soit un candidat seul.
  const groups = [];
  const seenInMerge = new Set();
  for (const ids of merges) {
    const members = ids.map((id) => todo.find((c) => c.id === id)).filter(Boolean);
    if (members.length !== ids.length) {
      const missing = ids.filter((id) => !todo.find((c) => c.id === id));
      const already = candidates.filter((c) => missing.includes(c.id) && c.person != null);
      if (already.length) console.log(`⏭️  fusion ${ids.join(',')} : membre(s) déjà lié(s), sautée`);
      else console.log(`⚠️  fusion ${ids.join(',')} : candidat(s) introuvable(s) ${missing.join(',')}, sautée`);
      ids.forEach((id) => seenInMerge.add(id));
      continue;
    }
    const electionsInGroup = new Set(members.map((c) => c.electoral_list?.election));
    if (electionsInGroup.size < 2) {
      console.log(`⚠️  fusion ${ids.join(',')} : candidats de la MÊME élection — interdite par la règle 1, sautée`);
      ids.forEach((id) => seenInMerge.add(id));
      continue;
    }
    groups.push(members);
    ids.forEach((id) => seenInMerge.add(id));
  }
  for (const c of todo) if (!seenInMerge.has(c.id)) groups.push([c]);

  // --- Slugs uniques : générés depuis le NOM de la personne, unicité contre les persons uniquement.
  // (Ne jamais réutiliser les slugs candidats : leur historique de suffixes — données archivées,
  // ordre d'import — polluerait les slugs persons.)
  const existingPersonSlugs = new Set((await fetchAll('election_persons', 'fields=slug')).map((p) => p.slug).filter(Boolean));
  const takeSlug = (base) => {
    let slug = base || 'person';
    let i = 2;
    const root = slug;
    while (existingPersonSlugs.has(slug)) slug = `${root}-${i++}`;
    existingPersonSlugs.add(slug);
    return slug;
  };

  const personsPayload = groups.map((members) => {
    const primary = members[0];
    const person = { status: 'published' };
    for (const f of IDENTITY_FIELDS) {
      person[f] = members.map((m) => m[f]).find((v) => v != null && v !== '') ?? null;
    }
    person.first_name = primary.first_name;
    person.last_name = primary.last_name;
    // La bio legacy du candidat (`biography`) devient la bio courte de la person
    // (election_persons n'a pas de champ biography).
    person.short_bio = person.biography ?? null;
    delete person.biography;
    person.slug = takeSlug(slugify(`${primary.first_name} ${primary.last_name}`));
    return person;
  });

  console.log(`\npersons à créer : ${personsPayload.length} (dont ${groups.filter((g) => g.length > 1).length} fusion(s) multi-candidats)`);
  console.log(`liaisons candidate.person à écrire : ${groups.reduce((n, g) => n + g.length, 0)}`);

  if (!EXECUTE) {
    console.log('\n🔍 Dry-run terminé. Valider le CSV de revue, préparer le fichier --merges, puis relancer avec --execute.');
    return;
  }

  // --- Création des persons ---
  const created = [];
  for (const c of chunk(personsPayload, 100)) {
    const res = await api('/items/election_persons', { method: 'POST', body: c });
    created.push(...res.data);
    if (created.length % 1000 < 100) console.log(`   ... ${created.length}/${personsPayload.length} persons créées`);
  }
  console.log(`✅ ${created.length} persons créées`);

  // --- Liaison des candidats ---
  const patches = [];
  groups.forEach((members, i) => {
    for (const m of members) patches.push({ id: m.id, person: created[i].id });
  });
  let done = 0;
  for (const c of chunk(patches, 100)) {
    await api('/items/election_candidates', { method: 'PATCH', body: c });
    done += c.length;
    if (done % 1000 < 100) console.log(`   ... ${done}/${patches.length} candidats liés`);
  }
  console.log(`✅ ${done} candidats liés`);

  // --- Vérifications ---
  console.log('\n🔍 Vérifications...');
  const unlinked = (await api('/items/election_candidates?aggregate[count]=id&filter[person][_null]=true&filter[status][_neq]=archived')).data[0].count.id;
  const totalPersons = (await api('/items/election_persons?aggregate[count]=id')).data[0].count.id;
  console.log(`   candidats sans person : ${unlinked} ${Number(unlinked) === 0 ? '✅' : '❌'}`);
  console.log(`   persons au total : ${totalPersons}`);
  const dupSlugs = await api('/items/election_persons?aggregate[count]=id&groupBy[]=slug&filter[slug][_nnull]=true');
  const dups = dupSlugs.data.filter((r) => Number(r.count.id) > 1);
  console.log(`   slugs persons dupliqués : ${dups.length} ${dups.length === 0 ? '✅' : '❌ ' + JSON.stringify(dups.slice(0, 5))}`);

  fs.writeFileSync(path.join(REPORT_DIR, 'persons-execution-report.json'), JSON.stringify({
    date: new Date().toISOString(), cms: CMS_API_URL,
    personsCreated: created.length, candidatesLinked: done,
    merges: merges.length, unlinkedAfter: Number(unlinked),
  }, null, 2));
  console.log(`\n✅ Backfill terminé. Rapport : scripts/elections/reports/persons-execution-report.json`);
})().catch((e) => { console.error(`\n❌ Échec : ${e.message}`); process.exit(1); });
