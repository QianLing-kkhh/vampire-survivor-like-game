import { I18n } from '../../i18n/I18n';

export class HelpFormatter {
  static t(key: string, fallback: string): string {
    const translated = I18n.t(key);

    return translated === key ? fallback : translated;
  }

  static nameFromKey(nameKey: string | undefined, fallbackId: string): string {
    if (!nameKey) {
      return HelpFormatter.labelFromId(fallbackId);
    }

    return HelpFormatter.t(nameKey, HelpFormatter.labelFromId(fallbackId));
  }

  static labelFromId(id: string | undefined): string {
    if (!id) {
      return 'Unknown';
    }

    return id
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  static initials(label: string): string {
    return label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';
  }

  static number(value: unknown): string | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? `${Math.round(value * 100) / 100}`
      : undefined;
  }

  static joinDefined(parts: Array<string | undefined>, separator = ' / '): string {
    return parts.filter((part): part is string => Boolean(part && part.length > 0)).join(separator);
  }
}
