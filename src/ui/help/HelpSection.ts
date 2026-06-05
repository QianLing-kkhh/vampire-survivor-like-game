export type HelpLineType =
  | 'title'
  | 'subtitle'
  | 'paragraph'
  | 'bullet'
  | 'iconRow'
  | 'statRow'
  | 'divider';

export interface HelpLine {
  type: HelpLineType;
  text?: string;
  iconKey?: string;
  fallback?: string;
  label?: string;
  value?: string;
}

export interface HelpSection {
  title: string;
  lines: HelpLine[];
}
