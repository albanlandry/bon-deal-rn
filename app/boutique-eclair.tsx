// app/boutique-eclair.tsx - Boutique Éclair ⚡ (bulk draft from scene photos)
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';
import { ApiError } from '@/lib/api';
import { uploadImages, bulkDraft } from '@/lib/api/ai';
import { createPost } from '@/lib/api/posts';
import { CATEGORIES, categoryLabel } from '@/constants/catalog';
import { formatAmount } from '@/lib/format';

interface DraftItem {
  key: string;
  include: boolean;
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string | null;
  comparableCount: number | null;
}

function aiErrMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'Limite atteinte, réessayez plus tard.';
    if (e.status === 400) return 'Aucune photo exploitable.';
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status === 502 || e.status === 503) return "L'assistant IA est indisponible.";
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
  const router = useRouter();
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [catModalFor, setCatModalFor] = useState<string | null>(null);

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
      setItems(
        drafts.map((d, i) => ({
          key: `d${i}`,
          include: true,
          title: d.title,
          description: d.description,
          price: d.price_suggestion?.suggested != null ? String(d.price_suggestion.suggested) : '',
          category: d.categories[0] ?? 'other',
          condition: d.condition,
          comparableCount: d.price_suggestion?.comparable_count ?? null,
        })),
      );
    },
    onError: (e) => showToast.error('Boutique Éclair', aiErrMessage(e)),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const approved = items.filter((i) => i.include && i.title.trim());
      let n = 0;
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
        await createPost(fd);
        n += 1;
      }
      return n;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      showToast.success('Boutique Éclair', `${n} brouillon${n > 1 ? 's' : ''} créé${n > 1 ? 's' : ''}.`);
      router.back();
    },
    onError: (e) => showToast.error('Échec', aiErrMessage(e)),
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boutique Éclair ⚡</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Prenez 1 à 3 photos de votre stock. L’IA détecte les articles et prépare des brouillons
          d’annonces que vous validez.
        </Text>

        {/* Photo strip */}
        <View style={styles.photoRow}>
          {photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.photo} />
          ))}
          {photos.length < 3 && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickPhotos}>
              <Ionicons name="camera" size={26} color="#666" />
              <Text style={styles.addPhotoText}>{photos.length}/3</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Analyze button */}
        {photos.length > 0 && !reviewing && (
          <TouchableOpacity
            style={[styles.primaryButton, analyzeMut.isPending && styles.buttonDisabled]}
            onPress={() => analyzeMut.mutate()}
            disabled={analyzeMut.isPending}
          >
            {analyzeMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Analyser les photos</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Draft review cards */}
        {reviewing && (
          <>
            <Text style={styles.sectionTitle}>Articles détectés ({items.length})</Text>
            {items.map((it) => (
              <View key={it.key} style={[styles.card, !it.include && styles.cardExcluded]}>
                <View style={styles.cardHeader}>
                  <TouchableOpacity
                    style={styles.includeToggle}
                    onPress={() => patchItem(it.key, { include: !it.include })}
                  >
                    <Ionicons
                      name={it.include ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={it.include ? theme.colors.primary : '#999'}
                    />
                    <Text style={styles.includeText}>{it.include ? 'Inclure' : 'Ignoré'}</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.titleInput}
                  value={it.title}
                  onChangeText={(t) => patchItem(it.key, { title: t })}
                  placeholder="Titre de l’article"
                  placeholderTextColor="#999"
                />

                <View style={styles.cardRow}>
                  <TouchableOpacity
                    style={styles.categoryChip}
                    onPress={() => setCatModalFor(it.key)}
                  >
                    <Text style={styles.categoryChipText}>{categoryLabel(it.category)}</Text>
                    <Ionicons name="chevron-down" size={14} color="#666" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.priceInput}
                    value={it.price}
                    onChangeText={(t) => patchItem(it.key, { price: t })}
                    placeholder="Prix FCFA"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                {it.price ? (
                  <Text style={styles.cardHint}>
                    💡 {formatAmount(parsePrice(it.price) ?? 0)}
                    {it.comparableCount != null
                      ? ` · ${it.comparableCount} similaire${it.comparableCount > 1 ? 's' : ''}`
                      : ''}
                  </Text>
                ) : null}
              </View>
            ))}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (createMut.isPending || includedCount === 0) && styles.buttonDisabled,
              ]}
              onPress={() => createMut.mutate()}
              disabled={createMut.isPending || includedCount === 0}
            >
              {createMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Créer les brouillons ({includedCount})
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Category picker modal */}
      {catModalFor && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setCatModalFor(null)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Catégorie</Text>
            <ScrollView style={styles.modalList}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={styles.modalItem}
                  onPress={() => {
                    patchItem(catModalFor, { category: c.value });
                    setCatModalFor(null);
                  }}
                >
                  <Text style={styles.modalItemText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  scroll: { padding: theme.spacing.lg, paddingBottom: 60 },
  intro: { fontSize: 14, color: theme.colors.gray, marginBottom: theme.spacing.lg, lineHeight: 20 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  photo: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#f0f0f0' },
  addPhoto: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  addPhotoText: { fontSize: 12, color: '#666', marginTop: 4 },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  primaryButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  cardExcluded: { opacity: 0.55 },
  cardHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  includeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  includeText: { fontSize: 13, color: '#666', fontWeight: '500' },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 6,
    marginBottom: theme.spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipText: { fontSize: 14, color: '#333', fontWeight: '500' },
  priceInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHint: { fontSize: 13, color: theme.colors.primary, fontWeight: '600', marginTop: 8 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: theme.spacing.lg,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: theme.spacing.md },
  modalList: { maxHeight: 320 },
  modalItem: { paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#333' },
});
