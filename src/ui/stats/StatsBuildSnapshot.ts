export type StatsBuildTabId =
  | 'overview'
  | 'attributes'
  | 'weapons'
  | 'passives'
  | 'relics'
  | 'status'
  | 'run';

export interface StatsBuildIconRef {
  id: string;
  label: string;
  iconKey?: string;
  fallback: string;
}

export interface StatsBuildStatLine {
  label: string;
  value: string;
}

export interface StatsBuildCard {
  id: string;
  title: string;
  subtitle?: string;
  iconKey?: string;
  fallback: string;
  badges?: string[];
  rows: StatsBuildStatLine[];
  relatedIcons?: StatsBuildIconRef[];
  description?: string;
}

export interface StatsBuildSnapshot {
  title: string;
  createdAtSeconds: number;
  overview: StatsBuildStatLine[];
  attributes: StatsBuildStatLine[];
  weapons: StatsBuildCard[];
  passives: StatsBuildCard[];
  relics: StatsBuildCard[];
  status: StatsBuildCard[];
  run: StatsBuildStatLine[];
}
