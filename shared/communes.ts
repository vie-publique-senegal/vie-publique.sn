// Données du module Collectivités territoriales - port fidèle du prototype
// vpsn-collectivites (senegal-local-guide/src/data/communes.ts).
//
// ⚠️ DONNÉES DE DÉMONSTRATION : 18 communes réelles en « seeds » ; le reste
// (budgets, conseillers, adjoints, projets, documents, actualités, contacts…)
// est généré procéduralement et n'a AUCUNE valeur officielle. À remplacer par
// des données réelles (Directus) avant toute communication publique.
//
// Placé dans shared/ (importable via #shared/communes) car consommé à la fois
// par les pages app/ et par le handler sitemap Nitro (même mécanisme que
// #shared/clean-text utilisé par server/utils/rss.ts).

import type { Commune, Conseiller, Parti } from '~~/types/collectivite';

const cover = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1600&q=70`;

// Photos d'archives libres évoquant l'Afrique de l'Ouest / paysages sénégalais
const COVERS = [
  '1526481280695-3c469368e02a', // marché
  '1516026672322-bc52d61a55d5', // architecture ouest-africaine
  '1489493585363-d69421e0edd3', // Dakar côte
  '1533105079780-92b9be482077', // village
  '1580060839134-75a5edca2e99', // pêcheurs
  '1504198266287-1659872e6590', // route
  '1524492412937-b28074a5d7da', // mosquée
  '1590090598388-8283f5e75d47', // Saint-Louis
  '1518709594023-6eab9bab7b23', // marché
  '1517154421773-0529f29ea451', // pirogue
  '1509233725247-49e657c54213', // Sénégal
  '1502920917128-1aa500764cbd', // paysage
];

const partiPool: Parti[] = ['APR', 'BBY', 'PASTEF', 'Yewwi', 'PDS', 'Indépendant'];

function makeConseillers(majParti: Parti, total: number): Conseiller[] {
  const arr: Conseiller[] = [];
  const majCount = Math.ceil(total * 0.6);
  const oppCount = Math.floor(total * 0.35);
  const noms = [
    'Mamadou Diop',
    'Aïssatou Sow',
    'Ibrahima Ndiaye',
    'Fatou Ba',
    'Cheikh Fall',
    'Aminata Sarr',
    'Ousmane Diallo',
    'Mariama Cissé',
    'Modou Gueye',
    'Awa Thiam',
    'Babacar Sy',
    'Ndeye Faye',
    'Serigne Mbacké',
    'Rokhaya Diagne',
    'Alioune Kane',
    'Bineta Ndour',
    'Moustapha Wade',
    'Khady Camara',
    'Pape Sène',
    'Oumou Diouf',
    'Lamine Kébé',
    'Sokhna Ly',
    'Assane Touré',
    'Nafissatou Bâ',
    'Souleymane Diakhaté',
  ];
  for (let i = 0; i < total; i++) {
    const nom = noms[i % noms.length];
    if (i < majCount) {
      arr.push({
        nom,
        parti: majParti,
        groupe: 'Majorité',
        commission: ['Finances', 'Éducation', 'Urbanisme', 'Santé', 'Culture'][i % 5],
      });
    } else if (i < majCount + oppCount) {
      const opp = partiPool.filter((p) => p !== majParti)[i % (partiPool.length - 1)];
      arr.push({
        nom,
        parti: opp,
        groupe: 'Opposition',
        commission: ['Finances', 'Contrôle'][i % 2],
      });
    } else {
      arr.push({ nom, parti: 'Indépendant', groupe: 'Indépendant' });
    }
  }
  return arr;
}

interface Seed {
  slug: string;
  nom: string;
  region: string;
  departement: string;
  chefLieu: boolean;
  type: Commune['type'];
  population: number;
  superficie: number;
  latitude: number;
  longitude: number;
  maireNom: string;
  maireSexe: 'H' | 'F';
  parti: Parti;
  profession: string;
  altitude?: number;
  tabsMasques?: string[];
}

/* prettier-ignore */
const seeds: Seed[] = [
  { slug: 'dakar-plateau', nom: 'Dakar-Plateau', region: 'Dakar', departement: 'Dakar', chefLieu: true, type: "Commune d'arrondissement", population: 36760, superficie: 4.0, latitude: 14.6717, longitude: -17.4382, maireNom: 'Alioune Ndoye', maireSexe: 'H', parti: 'BBY', profession: 'Homme politique', altitude: 12, tabsMasques: ['budget', 'projets', 'services', 'documents', 'actualites'] },
  { slug: 'mermoz-sacre-coeur', nom: 'Mermoz–Sacré-Cœur', region: 'Dakar', departement: 'Dakar', chefLieu: false, type: "Commune d'arrondissement", population: 41500, superficie: 3.2, latitude: 14.7130, longitude: -17.4756, maireNom: 'Barthélémy Dias', maireSexe: 'H', parti: 'Yewwi', profession: 'Homme politique' },
  { slug: 'guediawaye', nom: 'Guédiawaye', region: 'Dakar', departement: 'Guédiawaye', chefLieu: true, type: 'Ville', population: 329659, superficie: 13.0, latitude: 14.7692, longitude: -17.4103, maireNom: 'Ahmed Aïdara', maireSexe: 'H', parti: 'Yewwi', profession: 'Journaliste' },
  { slug: 'pikine', nom: 'Pikine', region: 'Dakar', departement: 'Pikine', chefLieu: true, type: 'Ville', population: 1170791, superficie: 87.3, latitude: 14.7549, longitude: -17.3961, maireNom: 'Abdoulaye Thimbo', maireSexe: 'H', parti: 'BBY', profession: 'Ingénieur' },
  { slug: 'thies', nom: 'Thiès', region: 'Thiès', departement: 'Thiès', chefLieu: true, type: 'Ville', population: 320000, superficie: 61.0, latitude: 14.7910, longitude: -16.9359, maireNom: 'Babacar Diop', maireSexe: 'H', parti: 'PASTEF', profession: 'Enseignant-chercheur', altitude: 70 },
  { slug: 'mbour', nom: 'Mbour', region: 'Thiès', departement: 'Mbour', chefLieu: true, type: 'Ville', population: 232777, superficie: 22.0, latitude: 14.4197, longitude: -16.9683, maireNom: 'Cheikh Issa Sall', maireSexe: 'H', parti: 'BBY', profession: 'Économiste' },
  { slug: 'saint-louis', nom: 'Saint-Louis', region: 'Saint-Louis', departement: 'Saint-Louis', chefLieu: true, type: 'Ville', population: 254171, superficie: 45.2, latitude: 16.0179, longitude: -16.4896, maireNom: 'Mansour Faye', maireSexe: 'H', parti: 'BBY', profession: 'Homme politique' },
  { slug: 'ziguinchor', nom: 'Ziguinchor', region: 'Ziguinchor', departement: 'Ziguinchor', chefLieu: true, type: 'Ville', population: 205294, superficie: 44.0, latitude: 12.5833, longitude: -16.2719, maireNom: 'Ousmane Sonko', maireSexe: 'H', parti: 'PASTEF', profession: 'Inspecteur des impôts' },
  { slug: 'kaolack', nom: 'Kaolack', region: 'Kaolack', departement: 'Kaolack', chefLieu: true, type: 'Ville', population: 233708, superficie: 22.0, latitude: 14.1620, longitude: -16.0770, maireNom: 'Serigne Mboup', maireSexe: 'H', parti: 'Indépendant', profession: "Chef d'entreprise" },
  { slug: 'louga', nom: 'Louga', region: 'Louga', departement: 'Louga', chefLieu: true, type: 'Ville', population: 105135, superficie: 32.0, latitude: 15.6144, longitude: -16.2264, maireNom: 'Moustapha Diop', maireSexe: 'H', parti: 'BBY', profession: 'Homme politique' },
  { slug: 'diourbel', nom: 'Diourbel', region: 'Diourbel', departement: 'Diourbel', chefLieu: true, type: 'Ville', population: 118000, superficie: 9.7, latitude: 14.6552, longitude: -16.2333, maireNom: 'Malick Fall', maireSexe: 'H', parti: 'PDS', profession: 'Commerçant' },
  { slug: 'touba', nom: 'Touba', region: 'Diourbel', departement: 'Mbacké', chefLieu: false, type: 'Ville', population: 753315, superficie: 550.0, latitude: 14.8500, longitude: -15.8833, maireNom: 'Abdou Lahad Kâ', maireSexe: 'H', parti: 'Indépendant', profession: 'Guide religieux' },
  { slug: 'tambacounda', nom: 'Tambacounda', region: 'Tambacounda', departement: 'Tambacounda', chefLieu: true, type: 'Ville', population: 107293, superficie: 44.0, latitude: 13.7707, longitude: -13.6673, maireNom: 'Papa Banda Dièye', maireSexe: 'H', parti: 'BBY', profession: 'Enseignant' },
  { slug: 'kolda', nom: 'Kolda', region: 'Kolda', departement: 'Kolda', chefLieu: true, type: 'Ville', population: 92454, superficie: 32.0, latitude: 12.8833, longitude: -14.9500, maireNom: 'Mame Boye Diao', maireSexe: 'H', parti: 'BBY', profession: 'Inspecteur du Trésor' },
  { slug: 'matam', nom: 'Matam', region: 'Matam', departement: 'Matam', chefLieu: true, type: 'Ville', population: 26188, superficie: 15.0, latitude: 15.6559, longitude: -13.2554, maireNom: 'Mamadou Mory Diaw', maireSexe: 'H', parti: 'BBY', profession: 'Ingénieur' },
  { slug: 'fatick', nom: 'Fatick', region: 'Fatick', departement: 'Fatick', chefLieu: true, type: 'Ville', population: 30514, superficie: 21.0, latitude: 14.3390, longitude: -16.4110, maireNom: 'Matar Bâ', maireSexe: 'H', parti: 'BBY', profession: 'Ministre' },
  { slug: 'kaffrine', nom: 'Kaffrine', region: 'Kaffrine', departement: 'Kaffrine', chefLieu: true, type: 'Ville', population: 46671, superficie: 20.0, latitude: 14.1050, longitude: -15.5500, maireNom: 'Abdoulaye Wilane', maireSexe: 'H', parti: 'BBY', profession: 'Journaliste' },
  { slug: 'sedhiou', nom: 'Sédhiou', region: 'Sédhiou', departement: 'Sédhiou', chefLieu: true, type: 'Ville', population: 25578, superficie: 20.0, latitude: 12.7080, longitude: -15.5560, maireNom: 'Abdoulaye Diop', maireSexe: 'H', parti: 'BBY', profession: 'Ministre' },
  { slug: 'kedougou', nom: 'Kédougou', region: 'Kédougou', departement: 'Kédougou', chefLieu: true, type: 'Ville', population: 30105, superficie: 3.0, latitude: 12.5556, longitude: -12.1747, maireNom: 'Mamadou Hadji Cissé', maireSexe: 'H', parti: 'BBY', profession: 'Comptable' },
];

function buildCommune(seed: Seed, index: number): Commune {
  const majParti = seed.parti;
  const conseillersTotal = Math.min(46, Math.max(20, Math.round(Math.log10(seed.population) * 8)));
  const budgetTotal = Math.round(seed.population * 0.012 + 200); // millions FCFA
  return {
    tabsMasques: seed.tabsMasques,
    slug: seed.slug,
    nom: seed.nom,
    region: seed.region,
    departement: seed.departement,
    chefLieu: seed.chefLieu,
    type: seed.type,
    codeAdministratif: `SN-${seed.region.slice(0, 2).toUpperCase()}-${(index + 1).toString().padStart(3, '0')}`,
    population: seed.population,
    superficie: seed.superficie,
    densite: Math.round(seed.population / seed.superficie),
    altitude: seed.altitude ?? Math.round(20 + ((index * 7) % 80)),
    latitude: seed.latitude,
    longitude: seed.longitude,
    dateCreation: ['1960-01-01', '1972-07-15', '1996-03-22', '2013-12-28'][index % 4],
    photoCouverture: cover(COVERS[index % COVERS.length]),
    mairie: {
      adresse: `Avenue de la République, ${seed.nom}, ${seed.region}`,
      telephone: `+221 33 ${(900 + index).toString()} ${(10 + index).toString().padStart(2, '0')} ${(20 + index).toString().padStart(2, '0')}`,
      email: `contact@mairie-${seed.slug}.sn`,
      siteWeb: index % 3 === 0 ? `https://www.mairie-${seed.slug}.sn` : undefined,
      facebook: index % 2 === 0 ? `https://facebook.com/mairie${seed.slug}` : undefined,
      horaires: 'Lundi – Vendredi, 08h00 – 17h00',
    },
    maire: {
      nom: seed.maireNom,
      sexe: seed.maireSexe,
      dateNaissance: `19${55 + (index % 20)}-0${1 + (index % 9)}-${10 + (index % 18)}`,
      profession: seed.profession,
      parti: seed.parti,
      dateElection: '2022-01-23',
      debutMandat: '2022-02-15',
      finMandat: '2027-02-14',
      nombreMandats: 1 + (index % 3),
      biographie: `${seed.maireNom} est ${seed.profession.toLowerCase()} de formation. Élu(e) à la tête de la commune de ${seed.nom} lors des élections locales de janvier 2022 sous les couleurs de ${seed.parti}, il/elle a placé son mandat sous le signe de la gouvernance participative, du développement territorial et de la modernisation des services municipaux.`,
    },
    adjoints: [
      {
        nom: 'Fatou Ndiaye',
        fonction: '1er Adjoint - Finances et Budget',
        telephone: '+221 77 123 45 67',
      },
      { nom: 'Ibrahima Sarr', fonction: '2e Adjoint - Urbanisme', telephone: '+221 77 234 56 78' },
      {
        nom: 'Aïssatou Diop',
        fonction: '3e Adjoint - Éducation et Jeunesse',
        telephone: '+221 77 345 67 89',
      },
      { nom: 'Modou Faye', fonction: '4e Adjoint - Santé et Action sociale' },
      { nom: 'Ndeye Coumba Ba', fonction: '5e Adjoint - Culture et Sports' },
    ],
    secretaireMunicipal: { nom: 'El Hadji Mamadou Ndour', telephone: '+221 77 456 78 90' },
    conseillers: makeConseillers(majParti, conseillersTotal),
    territoire: {
      villages: Math.max(0, Math.round(seed.superficie / 10)),
      quartiers: Math.max(4, Math.round(seed.population / 8000)),
      conseilsQuartier: Math.max(2, Math.round(seed.population / 20000)),
      postesSante: Math.max(1, Math.round(seed.population / 30000)),
      ecoles: Math.max(3, Math.round(seed.population / 5000)),
      marches: Math.max(1, Math.round(seed.population / 40000)),
      postesPolice: Math.max(1, Math.round(seed.population / 80000)),
      brigadesGendarmerie: seed.chefLieu ? 1 : 0,
    },
    resultats: [
      {
        scrutin: 'Présidentielle',
        annee: 2024,
        participation: 61.3,
        vainqueur: 'Bassirou Diomaye Faye',
        score: 54.3,
      },
      {
        scrutin: 'Législatives',
        annee: 2024,
        participation: 49.7,
        vainqueur: 'PASTEF',
        score: 55.1,
      },
      { scrutin: 'Locales', annee: 2022, participation: 46.8, vainqueur: majParti, score: 51.2 },
      {
        scrutin: 'Présidentielle',
        annee: 2019,
        participation: 66.2,
        vainqueur: 'Macky Sall',
        score: 58.4,
      },
    ],
    budget: {
      annee: 2024,
      total: budgetTotal,
      recettes: Math.round(budgetTotal * 1.02),
      depenses: budgetTotal,
      investissement: Math.round(budgetTotal * 0.35),
      fonctionnement: Math.round(budgetTotal * 0.65),
      dette: Math.round(budgetTotal * 0.12),
    },
    projets: [
      {
        titre: 'Réhabilitation de la voirie urbaine',
        categorie: 'Routes',
        statut: 'En cours',
        budget: 450,
      },
      {
        titre: "Construction d'un forage à Ndiobène",
        categorie: 'Eau',
        statut: 'Terminé',
        budget: 85,
      },
      {
        titre: 'Éclairage public solaire - Phase II',
        categorie: 'Éclairage',
        statut: 'En cours',
        budget: 120,
      },
      { titre: 'Nouveau marché central', categorie: 'Marché', statut: 'À venir', budget: 780 },
      {
        titre: "Construction d'une école élémentaire",
        categorie: 'Éducation',
        statut: 'En cours',
        budget: 210,
      },
      {
        titre: "Aménagement d'espaces verts",
        categorie: 'Environnement',
        statut: 'Terminé',
        budget: 60,
      },
    ],
    services: [
      'État civil',
      'Urbanisme',
      'Taxes municipales',
      'Marchés',
      'Voirie',
      'Hygiène publique',
      'Environnement',
      'Action sociale',
    ],
    documents: [
      {
        titre: 'Délibération n°2024-045 - Vote du budget 2024',
        type: 'Délibération',
        date: '2024-02-12',
      },
      {
        titre: 'Arrêté municipal portant réglementation des marchés',
        type: 'Arrêté',
        date: '2024-05-03',
      },
      { titre: 'Compte administratif 2023', type: 'Compte administratif', date: '2024-06-30' },
      { titre: 'Plan de Développement Communal 2024–2029', type: 'PDC', date: '2024-01-15' },
      { titre: "Appel d'offres - Voirie urbaine", type: "Appel d'offres", date: '2024-08-20' },
      { titre: "Rapport annuel d'activité 2023", type: 'Rapport', date: '2024-04-10' },
    ],
    actualites: [
      {
        titre: `Le maire de ${seed.nom} inaugure un nouveau centre de santé`,
        date: '2025-11-18',
        extrait:
          'En présence des autorités administratives et des populations, une nouvelle infrastructure sanitaire a été inaugurée…',
        categorie: 'Actualité',
      },
      {
        titre: 'Conseil municipal - Session budgétaire',
        date: '2025-10-24',
        extrait:
          "Le conseil s'est réuni pour délibérer sur le budget rectificatif de l'exercice en cours…",
        categorie: 'Conseil municipal',
      },
      {
        titre: 'Communiqué : campagne de propreté urbaine',
        date: '2025-09-30',
        extrait: "La mairie annonce le lancement d'une grande campagne de salubrité…",
        categorie: 'Communiqué',
      },
      {
        titre: "Visite officielle du Ministre de l'Intérieur",
        date: '2025-09-12',
        extrait:
          'Une délégation ministérielle a été reçue à la mairie pour évoquer la sécurité territoriale…',
        categorie: 'Actualité',
      },
    ],
    chiffresCles: {
      tauxAlphabetisation: 45 + (index % 40),
    },
  };
}

export const COMMUNES: Commune[] = seeds.map(buildCommune);

export const REGIONS = Array.from(new Set(COMMUNES.map((c) => c.region))).sort();
export const DEPARTEMENTS = Array.from(new Set(COMMUNES.map((c) => c.departement))).sort();
export const PARTIS: Parti[] = ['APR', 'BBY', 'PASTEF', 'Yewwi', 'PDS', 'Indépendant'];

export function getCommune(slug: string): Commune | undefined {
  return COMMUNES.find((c) => c.slug === slug);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

export function formatFCFA(millions: number): string {
  if (millions >= 1000) return `${(millions / 1000).toFixed(2)} Md FCFA`;
  return `${formatNumber(millions)} M FCFA`;
}
