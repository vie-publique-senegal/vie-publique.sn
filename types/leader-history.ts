/**
 * Types pour l'historique des présidents et Premiers ministres du Sénégal.
 * Les mandats sont dérivés de la collection `governments` (champs `president`
 * et `prime_minister`).
 */

export type LeaderBrief = {
  id: number;
  full_name: string;
  slug: string;
  photo: string | null;
};

export type GovernmentBrief = {
  id: number;
  name: string;
  slug: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  prime_minister: LeaderBrief | null;
  president: LeaderBrief;
};

export type PresidentialTerm = {
  president: LeaderBrief;
  start_date: string; // date du premier gouvernement sous ce président
  end_date: string | null; // null = mandat en cours
  governments: GovernmentBrief[];
  prime_ministers: LeaderBrief[]; // liste dédupliquée des PMs nommés
  stats: {
    governments_count: number;
    duration_days: number;
    pm_count: number; // nombre de PMs distincts
    periods_without_pm: number; // gouvernements sans PM
  };
};

export type PrimeMinisterialTerm = {
  prime_minister: LeaderBrief;
  president: LeaderBrief; // premier président sous qui il a servi
  start_date: string;
  end_date: string | null;
  governments: GovernmentBrief[];
  presidents: LeaderBrief[]; // dédupliqué (si plusieurs présidents)
  stats: {
    governments_count: number;
    duration_days: number;
  };
};

/** Période de présidence directe (sans Premier ministre). */
export type PrimeMinisterGap = {
  start_date: string;
  end_date: string | null;
  president: LeaderBrief;
  governments: GovernmentBrief[];
  label: string;
};

/** Données biographiques complètes d'une personnalité. */
export type LeaderProfile = {
  id: number;
  full_name: string;
  slug: string;
  sexe: 'male' | 'female' | null;
  photo: string | null;
  short_bio: string | null;
  long_bio: string | null;
  birthdate: string | null;
  birthplace: string | null;
  education: string | null;
  website: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  tiktok: string | null;
  linkedin: string | null;
};

/** Nomination officielle (décret) à une fonction. */
export type LeaderAppointment = {
  appointment_date: string | null;
  end_date: string | null;
  end_reason: string | null;
  source_label: string | null;
  source_document: { id: number; title: string; slug: string | null } | null;
  source_excerpt: string | null;
  notes: string | null;
};

export type LeaderNav = { slug: string; full_name: string } | null;

export type PresidentsResponse = {
  terms: PresidentialTerm[];
  total: number;
};

export type PresidentDetailResponse = {
  term: PresidentialTerm;
  profile: LeaderProfile;
  appointment: LeaderAppointment | null;
  prev: LeaderNav;
  next: LeaderNav;
};

export type PrimeMinistersResponse = {
  terms: PrimeMinisterialTerm[];
  total: number;
  gaps: PrimeMinisterGap[];
};

export type PrimeMinisterDetailResponse = {
  term: PrimeMinisterialTerm;
  profile: LeaderProfile;
  appointment: LeaderAppointment | null;
  prev: LeaderNav;
  next: LeaderNav;
};
