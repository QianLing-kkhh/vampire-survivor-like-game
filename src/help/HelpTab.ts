export type HelpTabId =
  | 'controls'
  | 'weapons'
  | 'ui'
  | 'evolution'
  | 'passives'
  | 'upgrades'
  | 'treasures'
  | 'endless';

export interface HelpLine {
  iconKey?: string;
  fallback: string;
  text: string;
}

export interface HelpSection {
  id: HelpTabId;
  title: string;
  iconKey?: string;
  fallback: string;
  lines: HelpLine[];
}
