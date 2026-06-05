import { HelpSection } from './HelpSection';

export type HelpTabId =
  | 'basics'
  | 'characters'
  | 'weapons'
  | 'evolutions'
  | 'passives'
  | 'maps'
  | 'endless'
  | 'settings'
  | 'testing';

export interface HelpTabDefinition {
  id: HelpTabId;
  title: string;
  iconKey?: string;
  fallback: string;
  sections: HelpSection[];
}
