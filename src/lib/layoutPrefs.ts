interface LayoutPrefs {
  splitRatio: number;
  focusPanel: 'chat' | 'board' | null;
  lastTab: 'chat' | 'board' | 'lobby';
}

const DEFAULT_PREFS: LayoutPrefs = {
  splitRatio: 0.5,
  focusPanel: null,
  lastTab: 'chat',
};

class LayoutPreferences {
  private key = 'roleplayai-layout-prefs';

  get(): LayoutPrefs {
    try {
      if (typeof window === 'undefined') return DEFAULT_PREFS;
      
      // Try Capacitor Preferences first if available
      if ((window as any).Capacitor?.Plugins?.Preferences) {
        // Note: This would need to be async in real implementation
        // For now, fall back to localStorage
      }
      
      const stored = localStorage.getItem(this.key);
      if (!stored) return DEFAULT_PREFS;
      
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFS, ...parsed };
    } catch {
      return DEFAULT_PREFS;
    }
  }

  set(prefs: Partial<LayoutPrefs>): void {
    try {
      if (typeof window === 'undefined') return;
      
      const current = this.get();
      const updated = { ...current, ...prefs };
      
      localStorage.setItem(this.key, JSON.stringify(updated));
      
      // TODO: Also save to Capacitor Preferences if available
      if ((window as any).Capacitor?.Plugins?.Preferences) {
        // (window as any).Capacitor.Plugins.Preferences.set({ key: this.key, value: JSON.stringify(updated) });
      }
    } catch (error) {
      console.warn('Failed to save layout preferences:', error);
    }
  }

  setSplitRatio(ratio: number): void {
    this.set({ splitRatio: Math.max(0.2, Math.min(0.8, ratio)) });
  }

  setFocusPanel(panel: 'chat' | 'board' | null): void {
    this.set({ focusPanel: panel });
  }

  setLastTab(tab: 'chat' | 'board' | 'lobby'): void {
    this.set({ lastTab: tab });
  }
}

export const layoutPrefs = new LayoutPreferences();