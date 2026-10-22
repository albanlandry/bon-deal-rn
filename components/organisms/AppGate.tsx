/**
 * App-wide ops gate (docs/08 §A "Ops"), rendered over the navigation stack:
 *
 * - Maintenance: `/app-config` maintenance_mode, or any 503 `code:
 *   "maintenance"`. A friendly full-screen page with the server's message, a
 *   retry button and an automatic retry every 30 s; the app comes back on its
 *   own when it's over (queries are refetched, the profile reloaded).
 * - Update required: `/app-config` min_app_version above this version, or any
 *   426 `code: "update_required"`. Blocking, with a store button.
 * - Update available: latest_app_version above this version. A dismissible
 *   banner, shown at most once a day.
 *
 * The navigation stack stays mounted underneath, so the user lands back where
 * they were. The illustration "breathes" twice on arrival (docs/09 §4),
 * static with reduce motion; the banner slides down from the top.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Platform, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { enterFade, enterFromTop, exitFade, exitUp } from '../motion/anim';
import Breathe from '../motion/Breathe';
import PressableScale from '../motion/PressableScale';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { analytics, track } from '@/lib/analytics';
import { appConfigQuery, BdAppConfig, fetchAppConfig } from '@/lib/api/appConfig';
import {
  clearMaintenance,
  clearUpdateRequired,
  reportMaintenance,
  reportUpdateRequired,
  StoreUrls,
  useAppStatus,
} from '@/lib/appStatus';
import { APP_VERSION } from '@/lib/appVersion';
import { isVersionBelow } from '@/lib/semver';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import IconButton from '../atoms/IconButton';

export const MAINTENANCE_RETRY_S = 30;
const BANNER_KEY = 'bondeal.update_banner.shown_at';
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAINTENANCE = 'BonDeal fait une petite pause pour s’améliorer. Merci de votre patience !';
const DEFAULT_UPDATE = 'Une nouvelle version de BonDeal est disponible. Mettez l’application à jour pour continuer.';

function storeUrl(urls: StoreUrls | null | undefined): string | null {
  const configured = Platform.OS === 'ios' ? urls?.ios_store_url : urls?.android_store_url;
  if (configured) return configured;
  const pkg = Constants.expoConfig?.android?.package;
  return Platform.OS === 'android' && pkg ? `https://play.google.com/store/apps/details?id=${pkg}` : null;
}

async function openStore(urls: StoreUrls | null | undefined) {
  const url = storeUrl(urls);
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    // no store / browser available: nothing else we can do
  }
}

/** Apply /app-config to the gate. Returns true when the app may be used. */
function applyConfig(cfg: BdAppConfig): boolean {
  if (cfg.maintenance_mode) {
    reportMaintenance(cfg.maintenance_message ?? null);
    return false;
  }
  if (isVersionBelow(APP_VERSION, cfg.min_app_version)) {
    reportUpdateRequired({
      message: null,
      min_app_version: cfg.min_app_version,
      android_store_url: cfg.android_store_url,
      ios_store_url: cfg.ios_store_url,
    });
    return false;
  }
  return true;
}

export default function AppGate() {
  const status = useAppStatus();
  const qc = useQueryClient();
  const { jwt, user, refreshUser } = useAuth();
  const config = useQuery(appConfigQuery());
  const blocked = !!status.maintenance || !!status.updateRequired;

  // /app-config on start and whenever the app comes back to the foreground.
  useEffect(() => {
    if (config.data) applyConfig(config.data);
  }, [config.data]);
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (prev.match(/inactive|background/) && next === 'active') {
        config.refetch();
        track('app_open', { source: 'resume' });
      }
      prev = next;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Analytics: timers + flush on background; one app_open per cold start.
  useEffect(() => {
    analytics.start();
    track('app_open', { source: 'cold_start' });
    return () => analytics.stop();
  }, []);

  /**
   * Is the API usable again? /app-config is exempt from the gate, so also
   * probe a gated public endpoint (the server caches settings ~10 s).
   */
  const probe = useCallback(async (): Promise<boolean> => {
    try {
      const cfg = await fetchAppConfig();
      qc.setQueryData(appConfigQuery().queryKey, cfg);
      if (!applyConfig(cfg)) return false;
      await apiFetch('/geo/countries'); // re-reports 503 / 426 if still gated
    } catch {
      return false;
    }
    clearMaintenance();
    clearUpdateRequired();
    qc.invalidateQueries();
    if (jwt && !user) refreshUser();
    return true;
  }, [qc, jwt, user, refreshUser]);

  // Hardware back must not reveal the screen underneath.
  useEffect(() => {
    if (!blocked) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [blocked]);

  if (status.updateRequired) {
    return <UpdateRequiredScreen info={status.updateRequired} onRetry={probe} supportEmail={config.data?.support_email} />;
  }
  if (status.maintenance) {
    return (
      <MaintenanceScreen
        message={status.maintenance.message}
        supportEmail={config.data?.support_email}
        onRetry={probe}
      />
    );
  }
  return <UpdateBanner config={config.data} />;
}

// --- Screens -------------------------------------------------------------------------------

function GateLayout({
  icon,
  tone,
  title,
  message,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: 'brand' | 'trust';
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <Animated.View
      entering={enterFade(250)}
      exiting={exitFade(200)}
      style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.canvas }]}
      accessibilityViewIsModal>
      <SafeAreaView style={styles.gate}>
        <View style={styles.gateBody}>
          <Breathe style={[styles.halo, { backgroundColor: tone === 'trust' ? t.colors.trustTint : t.colors.brandTint }]}>
            <View style={[styles.circle, { backgroundColor: t.colors.surface }]}>
              <Ionicons name={icon} size={52} color={tone === 'trust' ? t.colors.trust : t.colors.brandStrong} />
            </View>
          </Breathe>
          <AppText variant="h1" align="center" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body" color="inkMuted" align="center" style={styles.gateMessage}>
            {message}
          </AppText>
        </View>
        <View style={styles.gateActions}>{children}</View>
      </SafeAreaView>
    </Animated.View>
  );
}

function SupportLink({ email }: { email?: string | null }) {
  if (!email) return null;
  return (
    <Button
      label={`Contacter ${email}`}
      variant="ghost"
      icon="mail-outline"
      onPress={() => Linking.openURL(`mailto:${email}`).catch(() => {})}
    />
  );
}

function MaintenanceScreen({
  message,
  supportEmail,
  onRetry,
}: {
  message: string | null;
  supportEmail?: string | null;
  onRetry: () => Promise<boolean>;
}) {
  const [left, setLeft] = useState(MAINTENANCE_RETRY_S);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const retry = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    await onRetry();
    busyRef.current = false;
    setBusy(false);
    setLeft(MAINTENANCE_RETRY_S);
  }, [onRetry]);

  // Countdown to the automatic retry (every 30 s).
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (left === 0) retry();
  }, [left, retry]);

  return (
    <GateLayout
      icon="construct-outline"
      tone="brand"
      title="On revient très vite"
      message={message || DEFAULT_MAINTENANCE}>
      <Button label="Réessayer" onPress={retry} loading={busy} fullWidth size="lg" haptic />
      <AppText variant="caption" color="inkMuted" align="center" accessibilityLiveRegion="polite">
        {busy ? 'Vérification…' : `Nouvel essai automatique dans ${left} s`}
      </AppText>
      <SupportLink email={supportEmail} />
    </GateLayout>
  );
}

function UpdateRequiredScreen({
  info,
  supportEmail,
  onRetry,
}: {
  info: NonNullable<ReturnType<typeof useAppStatus>['updateRequired']>;
  supportEmail?: string | null;
  onRetry: () => Promise<boolean>;
}) {
  const url = storeUrl(info);
  const [busy, setBusy] = useState(false);
  return (
    <GateLayout
      icon="cloud-download-outline"
      tone="trust"
      title="Mise à jour requise"
      message={info.message || DEFAULT_UPDATE}>
      {url ? (
        <Button
          label={Platform.OS === 'ios' ? 'Ouvrir l’App Store' : 'Mettre à jour'}
          icon="arrow-down-circle-outline"
          onPress={() => openStore(info)}
          fullWidth
          size="lg"
          haptic
        />
      ) : (
        <AppText variant="small" color="inkMuted" align="center">
          Installez la dernière version depuis votre magasin d’applications.
        </AppText>
      )}
      <AppText variant="caption" color="inkMuted" align="center">
        {`Version installée : ${APP_VERSION}${info.min_app_version ? ` · requise : ${info.min_app_version}` : ''}`}
      </AppText>
      <Button
        label="J’ai mis à jour, vérifier"
        variant="ghost"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await onRetry();
          setBusy(false);
        }}
      />
      <SupportLink email={supportEmail} />
    </GateLayout>
  );
}

// --- Soft update banner --------------------------------------------------------------------

function UpdateBanner({ config }: { config?: BdAppConfig }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const latest = config?.latest_app_version;
  const outdated = !!latest && isVersionBelow(APP_VERSION, latest);

  useEffect(() => {
    if (!outdated) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const shownAt = Number((await AsyncStorage.getItem(BANNER_KEY)) || 0);
        if (Date.now() - shownAt < DAY_MS) return; // at most once a day
        await AsyncStorage.setItem(BANNER_KEY, String(Date.now()));
      } catch {
        // storage unavailable: still show it this session
      }
      if (!cancelled) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [outdated, latest]);

  if (!visible) return null;
  return (
    <Animated.View
      entering={enterFromTop(250)}
      exiting={exitUp(200)}
      style={[
        styles.banner,
        {
          top: insets.top + 8,
          backgroundColor: t.colors.surface,
          borderColor: t.colors.line,
          borderRadius: t.radius.md,
        },
        t.elevation.sheet as any,
      ]}
      accessibilityRole="alert">
      <View style={[styles.bannerIcon, { backgroundColor: t.colors.trustTint, borderRadius: t.radius.sm }]}>
        <Ionicons name="sparkles-outline" size={20} color={t.colors.trust} />
      </View>
      <PressableScale
        style={[styles.flex, styles.bannerTap]}
        accessibilityRole="button"
        accessibilityLabel={`Nouvelle version ${latest} disponible. Mettre à jour`}
        onPress={() => {
          setVisible(false);
          openStore(config);
        }}>
        <AppText variant="labelStrong">Nouvelle version disponible</AppText>
        <AppText variant="caption" color="inkMuted">
          {storeUrl(config) ? `BonDeal ${latest} · Touchez pour mettre à jour` : `BonDeal ${latest} est disponible`}
        </AppText>
      </PressableScale>
      <IconButton icon="close" label="Plus tard" onPress={() => setVisible(false)} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gate: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  gateBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  gateMessage: { maxWidth: 360 },
  gateActions: { gap: 8, alignItems: 'stretch' },
  halo: { width: 168, height: 168, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  circle: { width: 112, height: 112, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bannerTap: { minHeight: 48, justifyContent: 'center' },
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingVertical: 8,
    paddingRight: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
