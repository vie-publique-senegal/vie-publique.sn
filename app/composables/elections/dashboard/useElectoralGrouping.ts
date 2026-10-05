import { matchesSearch } from '#shared/search';

export function useElectoralGrouping() {
  const groupListsByConstituency = (lists: any[]) => {
    const groups: Record<string, any> = {};

    lists.forEach(list => {
      const name = list.constituency?.name ||
                   (list.type === 'national' ? 'Circonscription Nationale' : 'Inconnue');
      if (!groups[name]) {
        groups[name] = { name, titulaires: null, suppleants: null };
      }
      if (list.is_substitute) {
        groups[name].suppleants = list;
      } else {
        groups[name].titulaires = list;
      }
    });

    return Object.values(groups).sort((a: any, b: any) =>
      a.name.localeCompare(b.name)
    );
  };

  // Nom complet du candidat, insensible à la casse et aux accents (« ndeye » trouve « Ndèye »)
  const filterListsBySearch = (lists: any[], query: string) => {
    return lists.map(list => ({
      ...list,
      candidates: list.candidates.filter((c: any) =>
        matchesSearch(query, `${c.first_name || ''} ${c.last_name || ''}`)
      )
    })).filter(list => list.candidates.length > 0);
  };

  const filterListsByType = (lists: any[], type: string) => {
    return lists.filter(l => l.type === type);
  };

  return { groupListsByConstituency, filterListsBySearch, filterListsByType };
}
