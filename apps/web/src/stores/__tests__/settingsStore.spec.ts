import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '@/stores/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      theme: 'light',
      fontSize: 'standard',
      fontFamily: 'sans',
      soundEnabled: true,
      language: 'en',
      homeLayout: 'sidebar',
    });
  });

  it('has expected initial values', () => {
    const state = useSettingsStore.getState();
    expect(['light', 'dark']).toContain(state.theme);
    expect(state.fontSize).toBe('standard');
    expect(state.fontFamily).toBe('sans');
    expect(state.soundEnabled).toBe(true);
    expect(state.language).toBe('en');
    expect(state.homeLayout).toBe('sidebar');
  });

  it('toggleTheme switches between light and dark', () => {
    useSettingsStore.setState({ theme: 'light' });
    useSettingsStore.getState().toggleTheme();
    expect(useSettingsStore.getState().theme).toBe('dark');
    useSettingsStore.getState().toggleTheme();
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('setFontSize updates font size', () => {
    useSettingsStore.getState().setFontSize('large');
    expect(useSettingsStore.getState().fontSize).toBe('large');
    useSettingsStore.getState().setFontSize('medium');
    expect(useSettingsStore.getState().fontSize).toBe('medium');
  });

  it('setFontFamily updates font family', () => {
    useSettingsStore.getState().setFontFamily('serif');
    expect(useSettingsStore.getState().fontFamily).toBe('serif');
    useSettingsStore.getState().setFontFamily('display');
    expect(useSettingsStore.getState().fontFamily).toBe('display');
  });

  it('toggleSound flips soundEnabled', () => {
    useSettingsStore.setState({ soundEnabled: true });
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  it('setLanguage updates language', () => {
    useSettingsStore.getState().setLanguage('ka');
    expect(useSettingsStore.getState().language).toBe('ka');
    useSettingsStore.getState().setLanguage('tr');
    expect(useSettingsStore.getState().language).toBe('tr');
  });

  it('setHomeLayout updates layout', () => {
    useSettingsStore.getState().setHomeLayout('tabs');
    expect(useSettingsStore.getState().homeLayout).toBe('tabs');
    useSettingsStore.getState().setHomeLayout('sidebar');
    expect(useSettingsStore.getState().homeLayout).toBe('sidebar');
  });

  it('persists settings to localStorage under doodledraw-settings', () => {
    useSettingsStore.getState().setLanguage('ru');
    const raw = localStorage.getItem('doodledraw-settings');
    expect(raw).toBeTruthy();
    expect(raw).toContain('ru');
  });
});
