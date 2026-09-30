/**
 * Small settings kept on this device. Storage can be unavailable or cleared,
 * so reads fall back to a default and writes are best effort.
 */
export function loadSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`fieldglass.${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function saveSetting<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`fieldglass.${key}`, JSON.stringify(value));
  } catch {
    // Not critical: the setting just won't survive a restart.
  }
}
