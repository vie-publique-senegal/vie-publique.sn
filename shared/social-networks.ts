/**
 * Réseaux sociaux de VP (collection Directus `vp_social_stats`) : icône et couleurs
 * de marque déduites du nom saisi au CMS, format du nombre d'abonnés.
 * Partagé entre la home (`HomeSocialNetworks`) et la page `/liens` (via `/api/liens`).
 */

export interface SocialNetworkMeta {
  icon: string;
  color: string;
  colorDark: string;
  hoverBorderClass: string;
}

const X_META: SocialNetworkMeta = {
  icon: 'i-simple-icons-x',
  color: '#000000',
  colorDark: '#e5e7eb',
  hoverBorderClass: 'hover:border-gray-500 dark:hover:border-gray-400',
};

const SOCIAL_NETWORK_META: Record<string, SocialNetworkMeta> = {
  linkedin: {
    icon: 'i-simple-icons-linkedin',
    color: '#0A66C2',
    colorDark: '#60a5fa',
    hoverBorderClass: 'hover:border-[#0A66C2]/50 dark:hover:border-[#60a5fa]/50',
  },
  facebook: {
    icon: 'i-simple-icons-facebook',
    color: '#1877F2',
    colorDark: '#60a5fa',
    hoverBorderClass: 'hover:border-[#1877F2]/50 dark:hover:border-[#60a5fa]/50',
  },
  instagram: {
    icon: 'i-simple-icons-instagram',
    color: '#E4405F',
    colorDark: '#f472b6',
    hoverBorderClass: 'hover:border-[#E4405F]/50 dark:hover:border-[#f472b6]/50',
  },
  twitter: X_META,
  x: X_META,
  youtube: {
    icon: 'i-simple-icons-youtube',
    color: '#FF0000',
    colorDark: '#f87171',
    hoverBorderClass: 'hover:border-[#FF0000]/50 dark:hover:border-[#f87171]/50',
  },
  tiktok: {
    icon: 'i-simple-icons-tiktok',
    color: '#000000',
    colorDark: '#e5e7eb',
    hoverBorderClass: 'hover:border-gray-500 dark:hover:border-gray-400',
  },
  whatsapp: {
    icon: 'i-simple-icons-whatsapp',
    color: '#25D366',
    colorDark: '#4ade80',
    hoverBorderClass: 'hover:border-[#25D366]/50 dark:hover:border-[#4ade80]/50',
  },
};

const DEFAULT_META: SocialNetworkMeta = {
  icon: 'i-heroicons-globe-alt',
  color: '#6b7280',
  colorDark: '#9ca3af',
  hoverBorderClass: 'hover:border-gray-400 dark:hover:border-gray-500',
};

export const getSocialNetworkMeta = (name: string): SocialNetworkMeta => {
  const key = name.toLowerCase().trim();
  // Exact match first, then partial match (e.g. "Twitter (X)" matches "twitter")
  return (
    SOCIAL_NETWORK_META[key] ||
    Object.entries(SOCIAL_NETWORK_META).find(([k]) => key.includes(k))?.[1] ||
    DEFAULT_META
  );
};

/** 120000 → « 120K », 1500000 → « 1.5M ». */
export const formatFollowers = (count: number): string => {
  if (count >= 1000000) {
    const val = count / 1000000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (count >= 1000) {
    const val = count / 1000;
    return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
  }
  return count.toString();
};
