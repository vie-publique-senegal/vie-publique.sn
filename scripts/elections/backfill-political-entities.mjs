/**
 * Backfill : une entité politique pérenne par participation (election_coalition).
 *
 * Voir docs/guidelines/elections/deployments/2026-07-migration-prod.md (phase 2 : règles de fusion)
 *
 * - Périmètre : coalitions non archivées, rattachées à au moins une liste, sans political_entity ;
 * - fusions inter-élections UNIQUEMENT via --merges (fichier validé éditorialement) ;
 *   jamais de fusion intra-élection (refusée) ; identité du groupe = participation la plus récente ;
 * - slugs générés depuis le nom normalisé (unicité dans election_political_entities, suffixe -2, -3…) ;
 * - dry-run par défaut : produit reports/entities-review-fusions.csv (rapprochements à arbitrer).
 *
 * Usage :
 *   node scripts/elections/backfill-political-entities.mjs                                  # dry-run + CSV
 *   node scripts/elections/backfill-political-entities.mjs --execute --merges=<fichier.csv> # exécution
 *
 * Format --merges : une ligne par fusion, IDs de coalitions séparés par des virgules,
 * le premier = participation de référence (doit être la plus récente du groupe).
 * Lignes vides et lignes commençant par # ignorées.
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './load-env.mjs';

const CMS_API_URL = process.env.CMS_API_URL;
const CMS_API_KEY = process.env.CMS_API_KEY;
const EXECUTE = process.argv.includes('--execute');
const mergesArg = process.argv.find((a) => a.startsWith('--merges='));

if (!CMS_API_URL || !CMS_API_KEY) {
  console.error('❌ CMS_API_URL et CMS_API_KEY sont requis.');
  process.exit(1);
}

const REPORTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'reports');

async function api(route, { method = 'GET', body } = {}) {
  const res = await fetch(`${CMS_API_URL}${route}`, {
    method,
    headers: { Authorization: `Bearer ${CMS_API_KEY}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${route} → HTTP ${res.status}\n${(await res.text()).slice(0, 500)}`);
  return res.status === 204 ? null : res.json();
}

const norm = (s) => (s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ').trim();

// Le slug est la clé publique durable : on retire les préfixes génériques (« Coalition… »),
// le nom de l'entité, lui, reste tel quel.
const toSlug = (s) => (norm(s).replace(/^(grande coalition|coalition|liste)\s+/, '').replace(/\s+/g, '-')) || 'entite';

(async () => {
  console.log(`🚀 Backfill entités politiques sur ${CMS_API_URL} — ${EXECUTE ? 'EXÉCUTION' : 'dry-run (aucune écriture)'}\n`);

  // 1. Charger participations actives + rattachement élection (via listes)
  const coalitions = (await api('/items/election_coalition?fields=id,name,acronym,type,status,logo,color,description,political_entity,head_of_list.person.id,head_of_list.person.slug&filter[status][_neq]=archived&limit=-1')).data;
  const lists = (await api('/items/election_electoral_lists?fields=coalition,election&limit=-1')).data;
  const elections = Object.fromEntries((await api('/items/elections?fields=id,slug,year&limit=-1')).data.map((e) => [e.id, e]));

  const electionByCoal = {};
  for (const l of lists) {
    if (!l.coalition) continue;
    (electionByCoal[l.coalition] = electionByCoal[l.coalition] || new Set()).add(l.election);
  }
  for (const [cid, els] of Object.entries(electionByCoal)) {
    if (els.size > 1) throw new Error(`Coalition #${cid} rattachée à ${els.size} élections — hypothèse « 1 coalition = 1 participation » violée, arbitrage requis.`);
  }

  const scope = coalitions.filter((c) => electionByCoal[c.id]);
  const skippedOrphans = coalitions.filter((c) => !electionByCoal[c.id]);
  const todo = scope.filter((c) => !c.political_entity);
  const byId = Object.fromEntries(scope.map((c) => [c.id, c]));
  const electionOf = (c) => elections[[...electionByCoal[c.id]][0]] || {};

  console.log(`${coalitions.length} coalitions non archivées · ${scope.length} avec listes · ${todo.length} sans entité (à traiter)`);
  if (skippedOrphans.length) console.log(`⚠️  ${skippedOrphans.length} orphelines ignorées (lancer e2a pour les archiver) : ${skippedOrphans.map((c) => '#' + c.id).join(', ')}`);

  // 2. CSV de revue des rapprochements inter-élections (têtes de liste + noms normalisés)
  const groupsBy = (keyFn) => {
    const acc = {};
    for (const c of scope) { const k = keyFn(c); if (k) (acc[k] = acc[k] || []).push(c); }
    return Object.entries(acc).filter(([, cs]) => cs.length > 1 && new Set(cs.map((x) => electionOf(x).id)).size > 1);
  };
  const headMatches = groupsBy((c) => c.head_of_list?.person?.slug);
  const nameMatches = groupsBy((c) => norm(c.name));

  mkdirSync(REPORTS_DIR, { recursive: true });
  const csvRows = [['match_type', 'match_key', 'coalition_ids', 'names', 'elections', 'heads']];
  for (const [type, matches] of [['head_of_list', headMatches], ['name', nameMatches]]) {
    for (const [key, cs] of matches) {
      csvRows.push([
        type, key,
        cs.map((c) => c.id).join(','),
        cs.map((c) => c.name).join(' | '),
        cs.map((c) => electionOf(c).slug).join(' | '),
        cs.map((c) => c.head_of_list?.person?.slug || '-').join(' | '),
      ]);
    }
  }
  const csvPath = join(REPORTS_DIR, 'entities-review-fusions.csv');
  writeFileSync(csvPath, csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n'));
  console.log(`\n📄 CSV de revue : ${csvPath} (${csvRows.length - 1} rapprochements — ${headMatches.length} par tête de liste, ${nameMatches.length} par nom)`);

  // 3. Fusions validées
  const merges = [];
  if (mergesArg) {
    const linesRaw = readFileSync(mergesArg.split('=')[1], 'utf8').split(/\r?\n/);
    for (const line of linesRaw) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const ids = t.split(',').map((x) => parseInt(x.trim(), 10));
      if (ids.some(Number.isNaN) || ids.length < 2) throw new Error(`Ligne --merges invalide : « ${line} »`);
      for (const id of ids) if (!byId[id]) throw new Error(`Fusion : coalition #${id} inconnue ou hors périmètre.`);
      const els = ids.map((id) => electionOf(byId[id]).id);
      if (new Set(els).size !== ids.length) throw new Error(`Fusion ${t} : deux participations à la même élection — fusion intra-élection refusée.`);
      const years = ids.map((id) => electionOf(byId[id]).year || 0);
      if (Math.max(...years) !== years[0]) throw new Error(`Fusion ${t} : le premier ID doit être la participation la plus récente (années : ${years.join(', ')}).`);
      merges.push(ids);
    }
    const flat = merges.flat();
    if (new Set(flat).size !== flat.length) throw new Error('Un ID de coalition apparaît dans plusieurs fusions.');
    console.log(`🔗 ${merges.length} fusions validées chargées.`);
  } else {
    console.log('🔗 Aucun fichier --merges : une entité par participation.');
  }

  // 4. Constitution des groupes (une entité par groupe)
  const merged = new Set(merges.flat());
  const groups = [
    ...merges.map((ids) => ({ ref: byId[ids[0]], members: ids.map((id) => byId[id]) })),
    ...todo.filter((c) => !merged.has(c.id)).map((c) => ({ ref: c, members: [c] })),
  ].filter((g) => g.members.some((m) => !m.political_entity));

  // 5. Slugs uniques (en tenant compte des entités déjà existantes)
  const existing = (await api('/items/election_political_entities?fields=slug&limit=-1')).data;
  const taken = new Set(existing.map((e) => e.slug).filter(Boolean));
  for (const g of groups) {
    const base = toSlug(g.ref.name);
    let slug = base, i = 2;
    while (taken.has(slug)) slug = `${base}-${i++}`;
    taken.add(slug);
    g.slug = slug;
  }

  console.log(`\n📦 ${groups.length} entités à créer (${groups.filter((g) => g.members.length > 1).length} fusionnées) :`);
  for (const g of groups.slice(0, 12)) console.log(`  ${g.slug} ← ${g.members.map((m) => `#${m.id} ${m.name} (${electionOf(m).slug})`).join(' + ')}`);
  if (groups.length > 12) console.log(`  … et ${groups.length - 12} autres`);

  if (!EXECUTE) {
    console.log('\n📋 Dry-run terminé. Valider les fusions du CSV puis relancer avec --execute [--merges=...].');
    return;
  }

  // 6. Création + liaison
  const report = { created: [], linked: [], date: new Date().toISOString(), cms: CMS_API_URL };
  for (const g of groups) {
    const entity = (await api('/items/election_political_entities', { method: 'POST', body: {
      status: 'published',
      slug: g.slug,
      name: g.ref.name,
      acronym: g.ref.acronym || null,
      type: g.ref.type || null,
      logo: g.ref.logo || null,
      color: g.ref.color || null,
      description: g.ref.description || null,
    } })).data;
    report.created.push({ id: entity.id, slug: g.slug, from: g.members.map((m) => m.id) });
    for (const m of g.members) {
      if (m.political_entity) continue;
      await api(`/items/election_coalition/${m.id}`, { method: 'PATCH', body: { political_entity: entity.id } });
      report.linked.push(m.id);
    }
    console.log(`✅ ${g.slug} (entité #${entity.id}) ← ${g.members.map((m) => '#' + m.id).join(', ')}`);
  }

  // 7. Vérifications
  const unlinked = (await api('/items/election_coalition?fields=id&filter[status][_neq]=archived&filter[political_entity][_null]=true&limit=-1')).data
    .filter((c) => electionByCoal[c.id]);
  const slugs = (await api('/items/election_political_entities?fields=slug&limit=-1')).data.map((e) => e.slug);
  const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  console.log(`\n🔍 Participations actives (avec listes) sans entité : ${unlinked.length} ${unlinked.length ? '❌ ' + unlinked.map((c) => '#' + c.id).join(', ') : '✅'}`);
  console.log(`🔍 Slugs entités dupliqués : ${dupSlugs.length ? '❌ ' + dupSlugs.join(', ') : '0 ✅'}`);

  const reportPath = join(REPORTS_DIR, 'entities-execution-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Rapport : ${reportPath}\n✅ Backfill appliqué (${report.created.length} entités, ${report.linked.length} participations liées).`);
})().catch((e) => { console.error(`\n❌ Échec : ${e.message}`); process.exit(1); });
