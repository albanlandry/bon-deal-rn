// app/boutique-eclair.tsx — Boutique Éclair ⚡ (bulk drafts from 1–3 scene photos).
//
// Tesler: the AI absorbs the work of listing many items at once; the
// analysis shows its steps (labor illusion) and the results are editable
// suggestions the seller ticks and confirms (IKEA effect). Output is drafts
// only — nothing is published without the seller.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AppImage,
  AppText,
  Button,
  Card,
  CategoryTag,
  IconButton,
  PressableScale,
  ProgressBar,
  ScreenHeader,
  TextField,
  showToast,
} from '@/components/ui';
import SellLaborSteps from '@/components/molecules/SellLaborSteps';
import ActionDock, { dockBottom, DockButton, useDockColors } from '@/components/organisms/ActionDock';
import SellOptionSheet from '@/components/molecules/SellOptionSheet';
import Animated from 'react-native-reanimated';
import { enterUp, layoutSpring } from '@/components/motion/anim';
import { ApiError } from '@/lib/api';
import { uploadImages, bulkDraft } from '@/lib/api/ai';
import { createPost } from '@/lib/api/posts';
import { CATEGORIES, categoryLabel } from '@/constants/catalog';
import { formatAmount } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { createStyles, Theme, useStyles, useTheme } from '@/theme';
import { track } from '@/lib/analytics';

interface DraftItem {
  key: string;
  include: boolean;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string | null;
  rangeMin: number | null;
  rangeMax: number | null;
  comparableCount: number | null;
}

const ANALYSIS_STEPS = [
  'Envoi des photos…',
  'Repérage des articles…',
  'Estimation des prix…',
  'Rédaction des brouillons…',
];

function aiErrMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'Limite atteinte, réessayez plus tard.';
    if (e.status === 400) return 'Aucune photo exploitable.';
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status === 502 || e.status === 503) return 'L’assistant IA est indisponible.';
    return e.message;
  }
  return 'Assistant IA indisponible. Réessayez.';
}

function parsePrice(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return n > 0 ? n : null;
}

export default function BoutiqueEclairScreen() {
  // Analytics (opt-in): the sell flow was opened (multi-item AI mode).
  useEffect(() => {
    track('start_listing', { source: 'boutique_eclair' });
  }, []);
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dock = useDockColors();
  const [dockH, setDockH] = useState(72);
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [catModalFor, setCatModalFor] = useState<string | null>(null);
  // Drafts are created one by one: N/M progress in the bottom bar.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const analyzeMut = useMutation({
    mutationFn: async () => {
      const urls = await uploadImages(photos);
      return bulkDraft(urls);
    },
    onSuccess: (drafts) => {
      if (!drafts.length) {
        showToast.info('Boutique Éclair', 'Aucun article détecté sur les photos.');
        return;
      }
      haptics.success();
      setItems(
        drafts.map((d, i) => ({
          key: `d${i}`,
          include: true,
          title: d.title,
          description: d.description,
          price: d.price_suggestion?.suggested != null ? String(d.price_suggestion.suggested) : '',
          category: d.categories[0] ?? 'other',
          condition: d.condition,
          rangeMin: d.price_suggestion?.range_min ?? null,
          rangeMax: d.price_suggestion?.range_max ?? null,
          comparableCount: d.price_suggestion?.comparable_count ?? null,
        })),
      );
    },
    onError: (e) => showToast.error('Boutique Éclair', aiErrMessage(e)),
  });

  const createMut = useMutation({
    // One failure doesn't stop the batch: the failed items stay on screen.
    mutationFn: async () => {
      const approved = items.filter((i) => i.include && i.title.trim());
      const created: string[] = [];
      let lastError: unknown = null;
      setProgress({ done: 0, total: approved.length });
      for (const d of approved) {
        const fd = new FormData();
        fd.append('title', d.title.trim());
        fd.append('description', d.description.trim() || d.title.trim());
        fd.append('state', 'draft');
        fd.append('is_free', 'false');
        const price = parsePrice(d.price);
        if (price != null) fd.append('price', String(price));
        if (d.category) fd.append('categories', d.category);
        if (d.condition) fd.append('condition', d.condition);
        try {
          await createPost(fd);
          created.push(d.key);
        } catch (e) {
          lastError = e;
        }
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
      return { created, total: approved.length, lastError };
    },
    onSuccess: ({ created, total, lastError }) => {
      setProgress(null);
      const n = created.length;
      if (n > 0) qc.invalidateQueries({ queryKey: ['posts'] });
      if (n === total) {
        haptics.success();
        showToast.success(
          'Boutique Éclair',
          `${n} brouillon${n > 1 ? 's' : ''} créé${n > 1 ? 's' : ''}. Complétez-les dans « Mes annonces ».`,
        );
        router.back();
        return;
      }
      if (n === 0) {
        showToast.error('Échec', aiErrMessage(lastError));
        return;
      }
      // Partial success: keep only the failed drafts so a retry doesn't duplicate.
      const failed = total - n;
      setItems((prev) => prev.filter((it) => !created.includes(it.key)));
      showToast.info(
        `${n} brouillon${n > 1 ? 's' : ''} créé${n > 1 ? 's' : ''} sur ${total}`,
        `${failed} article${failed > 1 ? 's' : ''} n’${failed > 1 ? 'ont' : 'a'} pas pu être enregistré${failed > 1 ? 's' : ''}. Réessayez.`,
      );
    },
    onError: (e) => {
      setProgress(null);
      showToast.error('Échec', aiErrMessage(e));
    },
  });

  const pickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast.error('Permission requise', 'Autorisez l’accès à vos photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3,
        quality: 0.7,
      });
      if (!result.canceled && result.assets.length) {
        setPhotos(result.assets.slice(0, 3).map((a) => a.uri));
        setItems([]);
      }
    } catch {
      showToast.error('Erreur', 'Impossible d’accéder aux photos.');
    }
  };

  const patchItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const includedCount = items.filter((i) => i.include && i.title.trim()).length;
  const reviewing = items.length > 0;
  const catTarget = items.find((i) => i.key === catModalFor);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Boutique Éclair" subtitle="Plusieurs annonces en une fois" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: (reviewing || photos.length > 0 ? dockH : 0) + dockBottom(insets.bottom) + t.spacing.md },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {!reviewing && (
            <Card tone="brand" style={styles.block}>
              <View style={styles.row}>
                <Ionicons name="flash" size={22} color={t.colors.brandStrong} />
                <AppText variant="bodyStrong" style={styles.flex}>
                  Videz vos placards en 1 minute
                </AppText>
              </View>
              <AppText variant="small" color="inkMuted" style={styles.gapTop}>
                Prenez 1 à 3 photos de plusieurs articles. L’IA les repère et prépare des brouillons
                que vous vérifiez avant de publier.
              </AppText>
            </Card>
          )}

          {/* Photo strip */}
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={`${uri}-${i}`} style={styles.photoCell}>
                <AppImage uri={uri} style={styles.photo} accessibilityLabel={`Photo ${i + 1}`} />
                {!analyzeMut.isPending && !reviewing && (
                  <IconButton
                    icon="close"
                    label="Retirer la photo"
                    variant="overlay"
                    size={16}
                    onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    style={styles.photoRemove}
                  />
                )}
              </View>
            ))}
            {photos.length < 3 && !reviewing && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Choisir des photos"
                haptic="light"
                onPress={pickPhotos}
                disabled={analyzeMut.isPending}
                style={[styles.photoCell, styles.addPhoto]}>
                <Ionicons name="images-outline" size={26} color={t.colors.brandStrong} />
                <AppText variant="caption" color="brandStrong">
                  {photos.length}/3
                </AppText>
              </PressableScale>
            )}
          </View>

          <SellLaborSteps
            steps={ANALYSIS_STEPS}
            running={analyzeMut.isPending}
            done={false}
            stepMs={1500}
          />

          {/* Draft review cards */}
          {reviewing && (
            <>
              <View style={styles.reviewHeader}>
                <AppText variant="h3" accessibilityRole="header">
                  {items.length} article{items.length > 1 ? 's' : ''} détecté{items.length > 1 ? 's' : ''}
                </AppText>
                <AppText variant="small" color="inkMuted">
                  Suggestions de l’IA : décochez ce que vous ne vendez pas, ajustez le reste.
                </AppText>
              </View>
              {items.map((it, idx) => {
                const price = parsePrice(it.price);
                return (
                  <Animated.View key={it.key} entering={enterUp(idx)} layout={layoutSpring()}>
                  <Card style={[styles.block, !it.include && styles.excluded]}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: it.include }}
                      accessibilityLabel={`Inclure ${it.title || 'cet article'}`}
                      onPress={() => {
                        haptics.selection();
                        patchItem(it.key, { include: !it.include });
                      }}
                      style={styles.includeRow}>
                      <Ionicons
                        name={it.include ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={it.include ? t.colors.brandStrong : t.colors.inkSubtle}
                      />
                      <AppText variant="labelStrong" color={it.include ? 'ink' : 'inkMuted'}>
                        {it.include ? 'Inclus' : 'Ignoré'}
                      </AppText>
                    </Pressable>

                    {it.include && (
                      <>
                        <TextField
                          label="Titre"
                          value={it.title}
                          onChangeText={(v) => patchItem(it.key, { title: v })}
                          placeholder="Titre de l’article"
                          error={!it.title.trim() ? 'Ajoutez un titre' : null}
                        />
                        <View style={styles.cardRow}>
                          <PressableScale
                            accessibilityRole="button"
                            accessibilityLabel={`Catégorie : ${categoryLabel(it.category)}. Changer`}
                            haptic="selection"
                            hitSlop={{ top: 10, bottom: 10 }}
                            onPress={() => setCatModalFor(it.key)}
                            style={styles.catChip}>
                            <CategoryTag value={it.category} />
                            <Ionicons name="chevron-down" size={16} color={t.colors.inkMuted} />
                          </PressableScale>
                        </View>
                        {it.rangeMin != null && it.rangeMax != null && (
                          <AppText variant="caption" color="inkMuted" style={styles.gapTop}>
                            Prix conseillé : {formatAmount(it.rangeMin)} – {formatAmount(it.rangeMax)}
                            {it.comparableCount
                              ? ` · ${it.comparableCount} annonce${it.comparableCount > 1 ? 's' : ''} similaire${it.comparableCount > 1 ? 's' : ''}`
                              : ''}
                          </AppText>
                        )}
                        <TextField
                          label="Prix"
                          value={it.price}
                          onChangeText={(v) => patchItem(it.key, { price: v.replace(/[^\d]/g, '') })}
                          placeholder="0"
                          keyboardType="numeric"
                          helper={price != null ? formatAmount(price) : 'Vous pourrez le fixer plus tard.'}
                          right={
                            <AppText variant="labelStrong" color="inkMuted">
                              FCFA
                            </AppText>
                          }
                          containerStyle={styles.gapTop}
                        />
                      </>
                    )}
                  </Card>
                  </Animated.View>
                );
              })}
              <Button
                label="Choisir d’autres photos"
                variant="ghost"
                icon="refresh"
                onPress={() => {
                  setItems([]);
                  setPhotos([]);
                }}
              />
            </>
          )}
        </ScrollView>

        {/* Primary action in the floating dock (thumb zone, Fitts). */}
        {(reviewing || photos.length > 0) && (
          <ActionDock
            onHeight={setDockH}
            note={reviewing && includedCount === 0 ? 'Sélectionnez au moins un article avec un titre.' : undefined}
            top={
              progress ? (
                <View style={styles.progress}>
                  <AppText variant="caption" style={{ color: dock.fgMuted }} accessibilityLiveRegion="polite">
                    Création des brouillons… {progress.done}/{progress.total}
                  </AppText>
                  <ProgressBar
                    progress={progress.total ? progress.done / progress.total : 0}
                    trackColor="rgba(255,255,255,0.18)"
                    accessibilityLabel="Création des brouillons"
                  />
                </View>
              ) : undefined
            }>
            {reviewing ? (
              <DockButton
                label={`Créer ${includedCount} brouillon${includedCount > 1 ? 's' : ''}`}
                onPress={() => createMut.mutate()}
                loading={createMut.isPending}
                disabled={includedCount === 0}
              />
            ) : (
              <DockButton
                label="Analyser les photos"
                icon="sparkles-outline"
                onPress={() => analyzeMut.mutate()}
                loading={analyzeMut.isPending}
              />
            )}
          </ActionDock>
        )}
      </KeyboardAvoidingView>

      <SellOptionSheet
        visible={!!catModalFor}
        title="Catégorie"
        options={CATEGORIES}
        categoryIcons
        selectedValue={catTarget?.category ?? ''}
        onClose={() => setCatModalFor(null)}
        onSelect={(v) => catModalFor && patchItem(catModalFor, { category: v })}
      />
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  scroll: { padding: t.spacing.md, paddingBottom: t.spacing.xxl },
  block: { marginBottom: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  flex: { flex: 1 },
  gapTop: { marginTop: t.spacing.xs },
  photoRow: { flexDirection: 'row', gap: t.spacing.xs, marginBottom: t.spacing.md },
  photoCell: { width: 104, height: 104, borderRadius: t.radius.md, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 0, right: 0, width: 40, height: 40 },
  addPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.colors.brand,
    backgroundColor: t.colors.surface,
  },
  reviewHeader: { gap: 4, marginBottom: t.spacing.md },
  excluded: { opacity: 0.6 },
  includeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, minHeight: 44, marginBottom: 4 },
  cardRow: { flexDirection: 'row', marginTop: t.spacing.xs },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  progress: { gap: t.spacing.xxs },
}));
