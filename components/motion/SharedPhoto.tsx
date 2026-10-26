/**
 * Card photo → item page hero, as one continuous motion, without
 * Reanimated's experimental shared transitions (not in 4.1).
 *
 * 1. A listing card's photo registers through `useSharedPhotoSource`. On press
 *    it measures the photo (`measureInWindow`, async but fast) and records a
 *    pending flight; navigation is never delayed.
 * 2. The item page calls `useSharedPhotoTarget(postId)` on mount: it claims the
 *    pending flight for that post (if fresh) and the root `SharedPhotoOverlay`
 *    flies a copy of the photo from the card rect to the hero rect (full
 *    width, gallery height) on spring.default, corner radius → 0, while the
 *    route itself only fades. Once the gallery reports its first photo (or a
 *    short timeout after landing) the copy cross-fades out.
 * 3. Leaving the item page (back button / gesture) while the photo is at the
 *    top: if the card is still mounted, shows the same post and is on screen,
 *    the copy flies back to it and fades; otherwise the normal pop runs.
 *
 * Only one overlay view animates (left/top/width/height + radius on that
 * single view so the photo keeps `cover` framing; everything else is
 * transform/opacity). With reduce motion nothing is recorded: no overlay.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { duration, spring as springTokens } from '@/theme/motion';
import AppImage from '../atoms/AppImage';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SourceToken {
  ref: React.RefObject<View | null>;
  postId: number;
  mounted: boolean;
  radius: number;
}

interface Pending {
  postId: number;
  uri: string;
  token: SourceToken;
  rect: Rect | null;
  at: number;
  claimed: boolean;
  /** Hero rect (window coords) given by the item page when it claims. */
  hero: Rect | null;
}

export interface Flight {
  id: number;
  postId: number;
  dir: 'open' | 'close';
  uri: string;
  from: Rect;
  to: Rect;
  fromRadius: number;
  toRadius: number;
}

/** A press older than this is not "the card that opened this page". */
const PENDING_TTL = 1500;
/** Fallback: fade the copy out this long after landing if no load signal. */
const READY_TIMEOUT = 250;

/* ---------------- store ---------------- */

let pending: Pending | null = null;
/** Claimed flights, by post id, kept for the way back. */
const sessions = new Map<number, { token: SourceToken; uri: string; hero: Rect }>();
let flight: Flight | null = null;
let readyPostId: number | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function setFlight(f: Flight | null) {
  flight = f;
  emit();
}

function maybeLaunch() {
  const p = pending;
  if (!p || !p.claimed || !p.rect || !p.hero) return;
  pending = null;
  sessions.set(p.postId, { token: p.token, uri: p.uri, hero: p.hero });
  readyPostId = null;
  setFlight({
    id: ++seq,
    postId: p.postId,
    dir: 'open',
    uri: p.uri,
    from: p.rect,
    to: p.hero,
    fromRadius: p.token.radius,
    toRadius: 0,
  });
}

function visibleRect(x: number, y: number, w: number, h: number): Rect | null {
  const win = Dimensions.get('window');
  if (!(w > 0 && h > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  // At least partly on screen.
  if (x + w <= 0 || y + h <= 0 || x >= win.width || y >= win.height) return null;
  return { x, y, w, h };
}

/* ---------------- source (card photo) ---------------- */

/**
 * For a card's photo container. `ref` goes on the photo View; call `launch()`
 * right before navigating to the item page (it returns immediately).
 */
export function useSharedPhotoSource(postId: number, uri: string | null | undefined, radius: number) {
  const reduce = useTheme().reduceMotion;
  const ref = useRef<View>(null);
  const token = useRef<SourceToken>({ ref, postId, mounted: true, radius }).current;
  token.postId = postId;
  token.radius = radius;
  useEffect(() => {
    token.mounted = true;
    return () => {
      token.mounted = false;
    };
  }, [token]);

  const launch = useCallback(() => {
    if (reduce || !uri || !ref.current) return;
    const p: Pending = { postId, uri, token, rect: null, at: Date.now(), claimed: false, hero: null };
    pending = p;
    ref.current.measureInWindow((x, y, w, h) => {
      if (pending !== p) return;
      const r = visibleRect(x, y, w, h);
      if (!r) {
        pending = null;
        return;
      }
      p.rect = r;
      maybeLaunch();
    });
  }, [reduce, uri, postId, token]);

  return { ref, launch };
}

/* ---------------- target (item page) ---------------- */

/**
 * Item page side. Claims the card press that opened this post (if any) on
 * mount and returns:
 * - `active`: a flight is landing here — skip the page's own photo entrance;
 * - `ready()`: call when the first gallery photo is displayed;
 * - `back(scrollY)`: call from `beforeRemove` to fly the photo home.
 */
export function useSharedPhotoTarget(postId: number, hero: Rect) {
  const claimedRef = useRef<boolean | null>(null);
  if (claimedRef.current === null) {
    const p = pending;
    claimedRef.current = !!p && p.postId === postId && Date.now() - p.at < PENDING_TTL;
  }
  const heroRef = useRef(hero);
  heroRef.current = hero;

  useLayoutEffect(() => {
    if (!claimedRef.current) return;
    const p = pending;
    if (!p || p.postId !== postId) return;
    p.claimed = true;
    p.hero = heroRef.current;
    maybeLaunch();
  }, [postId]);

  const ready = useCallback(() => {
    if (!claimedRef.current) return;
    readyPostId = postId;
    emit();
  }, [postId]);

  const back = useCallback(
    (scrollY: number) => {
      const s = sessions.get(postId);
      sessions.delete(postId);
      if (!s || scrollY > 8) return;
      const { token } = s;
      if (!token.mounted || token.postId !== postId || !token.ref.current) return;
      token.ref.current.measureInWindow((x, y, w, h) => {
        const r = visibleRect(x, y, w, h);
        if (!r || !token.mounted || token.postId !== postId) return;
        setFlight({
          id: ++seq,
          postId,
          dir: 'close',
          uri: s.uri,
          from: heroRef.current,
          to: r,
          fromRadius: 0,
          toRadius: token.radius,
        });
      });
    },
    [postId],
  );

  return { active: !!claimedRef.current, ready, back };
}

/* ---------------- overlay (mounted once, above the Stack) ---------------- */

export function SharedPhotoOverlay() {
  const f = useSyncExternalStore(subscribe, () => flight);
  const ready = useSyncExternalStore(subscribe, () => readyPostId);
  // Window → overlay coordinates (the root may not start at the window origin).
  const origin = useRef({ x: 0, y: 0 });
  const rootRef = useRef<View>(null);

  const p = useSharedValue(0);
  const fade = useSharedValue(1);
  const from = useSharedValue<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const to = useSharedValue<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const radii = useSharedValue<[number, number]>([0, 0]);
  const landed = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback((id: number) => {
    if (flight?.id === id) setFlight(null);
  }, []);

  const fadeOut = useCallback(
    (id: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      fade.value = withTiming(0, { duration: duration.short, reduceMotion: ReduceMotion.System }, (done) => {
        if (done) runOnJS(clear)(id);
      });
    },
    [clear, fade],
  );

  const onLanded = useCallback(
    (id: number, dir: 'open' | 'close', postId: number) => {
      if (flight?.id !== id) return;
      landed.current = id;
      if (dir === 'close' || readyPostId === postId) fadeOut(id);
      else timer.current = setTimeout(() => fadeOut(id), READY_TIMEOUT);
    },
    [fadeOut],
  );

  useLayoutEffect(() => {
    if (!f) return;
    const o = origin.current;
    from.value = { x: f.from.x - o.x, y: f.from.y - o.y, w: f.from.w, h: f.from.h };
    to.value = { x: f.to.x - o.x, y: f.to.y - o.y, w: f.to.w, h: f.to.h };
    radii.value = [f.fromRadius, f.toRadius];
    landed.current = null;
    fade.value = 1;
    p.value = 0;
    const s = springTokens.default;
    const id = f.id;
    const dir = f.dir;
    const postId = f.postId;
    p.value = withSpring(
      1,
      { damping: s.damping, stiffness: s.stiffness, mass: s.mass, reduceMotion: ReduceMotion.System },
      (done) => {
        if (done) runOnJS(onLanded)(id, dir, postId);
      },
    );
  }, [f, from, to, radii, fade, p, onLanded]);

  // Gallery photo displayed after landing → fade now.
  useEffect(() => {
    if (f && f.dir === 'open' && ready === f.postId && landed.current === f.id) fadeOut(f.id);
  }, [ready, f, fadeOut]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const style = useAnimatedStyle(() => {
    const a = from.value;
    const b = to.value;
    const t = p.value;
    return {
      opacity: fade.value,
      left: a.x + (b.x - a.x) * t,
      top: a.y + (b.y - a.y) * t,
      width: Math.max(1, a.w + (b.w - a.w) * t),
      height: Math.max(1, a.h + (b.h - a.h) * t),
      borderRadius: Math.max(0, radii.value[0] + (radii.value[1] - radii.value[0]) * t),
    };
  });

  return (
    <View
      ref={rootRef}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={() =>
        rootRef.current?.measureInWindow((x, y) => {
          origin.current = { x: x || 0, y: y || 0 };
        })
      }>
      {f && (
        <Animated.View style={[styles.flier, style]}>
          <AppImage uri={f.uri} style={StyleSheet.absoluteFill} transition={0} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flier: { position: 'absolute', overflow: 'hidden' },
});
