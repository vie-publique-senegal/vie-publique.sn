export type ElectionStatsProfession = {
  profession: string;
  count: {
    id: string;
  };
};

export type ElectionStatsList = {
  coalition: number;
  count: {
    id: string;
  };
};

export type ElectionStatsGender = {
  gender: 'F' | 'M' | 'unknown';
  label: string;
  count: number;
};
