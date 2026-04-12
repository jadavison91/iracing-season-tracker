const SETTINGS_KEY = 'iracing-v3-ng-settings';

export type LookbackWeeks = 12 | 24 | 36;

export interface AppSettings {
  lookbackWeeks: LookbackWeeks;
}

const DEFAULTS: AppSettings = {
  lookbackWeeks: 24,
};

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const merged = { ...getSettings(), ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
  return merged;
}
