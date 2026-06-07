export type HelpLineType =
  | 'title'
  | 'subtitle'
  | 'paragraph'
  | 'bullet'
  | 'iconRow'
  | 'iconChain'
  | 'statRow'
  | 'divider';

export interface HelpIconRef {
  iconKey?: string;
  iconKind?: 'weapon' | 'passive' | 'mapMechanic';
  iconId?: string;
  fallback?: string;
}

export interface HelpLine {
  type: HelpLineType;
  text?: string;
  iconKey?: string;
  iconKind?: HelpIconRef['iconKind'];
  iconId?: string;
  icons?: HelpIconRef[];
  fallback?: string;
  label?: string;
  value?: string;
}

export interface HelpSection {
  title: string;
  lines: HelpLine[];
}
