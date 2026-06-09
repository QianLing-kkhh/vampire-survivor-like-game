export type IconTooltipKind =
  | 'weapon'
  | 'passive'
  | 'relic'
  | 'character'
  | 'mapMechanic'
  | 'status'
  | 'generic';

export interface IconTooltipData {
  kind: IconTooltipKind;
  id: string;
  title?: string;
  description?: string;
  descriptionKey?: string;
  fallback?: string;
}

export interface ResolvedIconTooltip {
  title: string;
  description: string;
}

