const MONTHS_LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Formatage et helpers partagés par les pages présidents / premiers ministres. */
export const useLeaderFormat = () => {
  const formatLongDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
  };

  const year = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
  };

  const formatPeriod = (start: string, end: string | null): string => {
    const s = formatLongDate(start);
    return end ? `du ${s} au ${formatLongDate(end)}` : `depuis le ${s}`;
  };

  const formatDuration = (days: number): string => {
    if (days < 31) return `${days} jour${days > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return `${years} an${years > 1 ? 's' : ''}`;
    return `${years} an${years > 1 ? 's' : ''} et ${rem} mois`;
  };

  const initials = (name: string): string =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');

  const isSafeUrl = (u: string | null): boolean => !!u && /^https?:\/\//.test(u) && u.length < 2048;

  const documentUrl = (d: { id: number; slug: string | null }): string =>
    d.slug ? `/documents/${d.id}/${d.slug}` : `/documents/${d.id}`;

  return {
    formatLongDate,
    year,
    formatPeriod,
    formatDuration,
    initials,
    isSafeUrl,
    documentUrl,
  };
};
