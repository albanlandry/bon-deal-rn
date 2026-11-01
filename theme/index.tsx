/**
 * Theme provider + hooks.
 *
 * - Follows the system colour scheme by default; the user can override it
 *   (system / light / dark) and the choice is persisted locally.
 * - Tracks the OS "reduce motion" setting so animated components can skip or
 *   shorten their animations (`theme.reduceMotion`, `theme.duration(ms)`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, StyleSheet, useColorScheme } from 'react-native';
import {
  ColorSchemeName,
  ColorTokens,
  darkColors,
  elevation,
  lightColors,
  motion,
  radius,
  spacing,
  ThemePreference,
  touch,
  type,
} from './tokens';

export * from './tokens';
export * from './color';
export { categoryColors, type CategoryColors } from './category';

export const PREF_KEY = 'bondeal.theme.preference';

export interface Theme {
  scheme: ColorSchemeName;
  isDark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof type;
  motion: typeof motion;
  elevation: typeof elevation;
  touch: typeof touch;
  reduceMotion: boolean;
  /** Returns 0 when reduce-motion is on, else the given duration. */
  duration: (ms: number) => number;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

function buildTheme(
  scheme: ColorSchemeName,
  reduceMotion: boolean,
  preference: ThemePreference,
  setPreference: (p: ThemePreference) => void,
): Theme {
  return {
    scheme,
    isDark: scheme === 'dark',
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    type,
    motion,
    elevation,
    touch,
    reduceMotion,
    duration: (ms: number) => (reduceMotion ? 0 : ms),
    preference,
    setPreference,
  };
}

const fallbackTheme = buildTheme('light', false, 'system', () => {});
const ThemeContext = createContext<Theme>(fallbackTheme);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => mounted && setReduceMotion(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
  }, []);

  const scheme: ColorSchemeName =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => buildTheme(scheme, reduceMotion, preference, setPreference),
    [scheme, reduceMotion, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Memoised themed stylesheet:
 *   const styles = useStyles(makeStyles);
 *   const makeStyles = (t: Theme) => StyleSheet.create({...});
 */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (t: Theme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}

/** Helper so factories can be declared outside components with types. */
export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (t: Theme) => T,
): (t: Theme) => T {
  return (t: Theme) => StyleSheet.create(factory(t));
}
