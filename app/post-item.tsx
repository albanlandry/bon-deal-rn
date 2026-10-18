// app/post-item.tsx — Sell flow (create + edit), doc §4.1 "Sell (post item)".
//
// 4-step stepper (Hick + goal-gradient): Photos → Suggestions IA → Prix →
// Aperçu & publier. One photo is enough to start (foot-in-the-door); the AI
// pre-fills the details as editable suggestions (Tesler + IKEA effect); the
// price step shows a comparables range before the input (anchoring); the
// draft is autosaved locally (Zeigarnik) and publishing is celebrated
// (peak–end). Edit mode reuses the same steps without autosave.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AppImage,
    AppText,
    Badge,
    Button,
    Card,
    ErrorState,
    IconButton,
    ListingCard,
    ListRow,
    ListGroup,
    ScreenHeader,
    SegmentedControl,
    Sheet,
    Skeleton,
    Stepper,
    TextField,
    showToast,
} from '@/components/ui';
import SellLaborSteps from '@/components/molecules/SellLaborSteps';
import SellOptionSheet from '@/components/molecules/SellOptionSheet';
import SellCelebration from '@/components/organisms/SellCelebration';
import { ApiError } from '@/lib/api';
import {
    attachPostImages,
    createPost,
    updatePost,
    deletePostImage,
    postByIdQuery,
    sharePost,
} from '@/lib/api/posts';
import { appConfigQuery } from '@/lib/api/account';
import { uploadPhoto, UploadError } from '@/lib/api/uploads';
import { quartiersQuery } from '@/lib/api/quartiers';
import { uploadImages, aiDraft, priceSuggestion } from '@/lib/api/ai';
import {
    CATEGORIES,
    CONDITIONS,
    AGE_BUCKETS,
    categoryLabel,
    conditionLabel,
    AGE_LABELS,
} from '@/constants/catalog';
import { formatAmount } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { clearSellDraft, loadSellDraft, saveSellDraft } from '@/lib/sellDraft';
import { useAuth } from '@/contexts/AuthContext';
import { createStyles, Theme, useStyles, useTheme } from '@/theme';
import type { BdAiDraft, BdPost, BdPostImage, BdPriceSuggestion } from '@/constants/types';

type ListingType = 'sell' | 'share' | 'exchange';

// Renamed from FormData to avoid shadowing the global FormData used for uploads.
interface ListingForm {
    title: string;
    description: string;
    price: string;
    category: string;        // enum value (electronics, ...)
    condition: string;       // enum value (excellent, ...)
    ageBucket: string;       // enum value or ''
    listingType: ListingType;
    negotiable: boolean;     // default ON (default effect)
    exchangeItems: string;   // csv, "Contre quoi ?"
    pickupQuartier: string;
    pickupNote: string;
    images: string[];        // new local URIs (uploaded directly to storage as soon as picked)
}

const EMPTY_FORM: ListingForm = {
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    ageBucket: '',
    listingType: 'sell',
    negotiable: true,
    exchangeItems: '',
    pickupQuartier: '',
    pickupNote: '',
    images: [],
};

const STEPS = ['Photos', 'Détails', 'Prix', 'Aperçu'];
// Fallback until GET /app-config answers (the server's platform setting).
const DEFAULT_MAX_PHOTOS = 5;

/** Per-photo direct-upload state, keyed by local URI. */
interface UploadState {
    status: 'uploading' | 'done' | 'error';
    progress: number;
    key?: string;
    error?: string;
}

function uploadErrMessage(e: unknown): string {
    if (e instanceof UploadError) return e.message;
    if (e instanceof ApiError) {
        if (e.status === 400 && /at most/i.test(e.message)) return 'Nombre maximal de photos atteint.';
        if (e.status === 413) return 'Photo trop lourde.';
        if (e.status === 429) return 'Trop d’envois, réessayez plus tard.';
        if (e.status === 503) return 'Envoi de photos indisponible pour le moment.';
        if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
        return e.message;
    }
    return 'Échec de l’envoi. Vérifiez votre connexion.';
}

const AI_STEPS = [
    'Analyse des photos…',
    'Identification de la catégorie…',
    'Rédaction de l’annonce…',
];

/** ApiError → French toast message. */
function errMessage(e: unknown): string {
    if (e instanceof ApiError) {
        if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
        if (e.status === 413) return 'Image trop lourde.';
        if (e.status >= 500) return 'Erreur serveur. Réessayez.';
        return e.message;
    }
    return 'Une erreur est survenue. Réessayez.';
}

/** ApiError → French message for the AI-assist actions. */
function aiErrMessage(e: unknown): string {
    if (e instanceof ApiError) {
        if (e.status === 429) return 'Limite atteinte, réessayez plus tard.';
        if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
        if (e.status === 502 || e.status === 503) return "L'assistant IA est indisponible.";
        return e.message;
    }
    return 'Assistant IA indisponible. Réessayez.';
}

/** Strip non-digits from a price string → integer, or null if empty/zero. */
function parsePrice(raw: string): number | null {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    return n > 0 ? n : null;
}

function hasContent(f: ListingForm): boolean {
    return f.images.length > 0 || !!f.title.trim() || !!f.description.trim();
}

// ---------------------------------------------------------------------------

function PickerField({
    label,
    value,
    placeholder,
    onPress,
    error,
}: {
    label: string;
    value: string;
    placeholder: string;
    onPress: () => void;
    error?: string;
}) {
    const t = useTheme();
    const styles = useStyles(makeStyles);
    return (
        <View style={styles.field}>
            <AppText variant="labelStrong" style={styles.fieldLabel}>
                {label}
            </AppText>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${label} : ${value || placeholder}`}
                accessibilityHint={error}
                onPress={onPress}
                style={[
                    styles.picker,
                    { borderColor: error ? t.colors.danger : t.colors.line },
                ]}>
                <AppText variant="body" color={value ? 'ink' : 'inkSubtle'} style={styles.flex} numberOfLines={1}>
                    {value || placeholder}
                </AppText>
                <Ionicons name="chevron-down" size={18} color={t.colors.inkMuted} />
            </Pressable>
            {!!error && (
                <AppText variant="caption" color="danger" style={styles.errorText}>
                    {error}
                </AppText>
            )}
        </View>
    );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    const styles = useStyles(makeStyles);
    return (
        <View style={styles.sectionTitle}>
            <AppText variant="h2" accessibilityRole="header">
                {title}
            </AppText>
            {!!subtitle && (
                <AppText variant="small" color="inkMuted">
                    {subtitle}
                </AppText>
            )}
        </View>
    );
}

// ---------------------------------------------------------------------------

export default function PostItemScreen() {
    const params = useLocalSearchParams<{ id?: string; mode?: string }>();
    const editId = params.id ? Number(params.id) : NaN;
    const isEdit = params.mode === 'edit' && Number.isFinite(editId) && editId > 0;

    const t = useTheme();
    const styles = useStyles(makeStyles);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const MAX_PHOTOS = useQuery(appConfigQuery()).data?.max_images ?? DEFAULT_MAX_PHOTOS;

    const [step, setStep] = useState(0);
    const [form, setForm] = useState<ListingForm>(EMPTY_FORM);
    const [existingImages, setExistingImages] = useState<BdPostImage[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [sheet, setSheet] = useState<null | 'category' | 'condition' | 'age' | 'quartier' | 'photo'>(null);
    const [restored, setRestored] = useState(false);       // draft banner visible
    const [draftReady, setDraftReady] = useState(isEdit);  // autosave may start
    const [aiResult, setAiResult] = useState<BdAiDraft | null>(null);
    const [aiTried, setAiTried] = useState(false);
    const [priceSug, setPriceSug] = useState<BdPriceSuggestion | null>(null);
    const priceSugKey = useRef<string>('');
    const [published, setPublished] = useState<BdPost | null>(null);
    const [duplicateOf, setDuplicateOf] = useState<number | null>(null);
    const [uploads, setUploads] = useState<Record<string, UploadState>>({});
    const uploadsRef = useRef<Record<string, UploadState>>({});
    uploadsRef.current = uploads;
    const assetMeta = useRef<Record<string, { mimeType?: string | null; size?: number | null }>>({});
    const startedUploads = useRef<Set<string>>(new Set());
    const [pendingSubmit, setPendingSubmit] = useState<null | 'draft' | 'published'>(null);

    // Edit mode: load the post to prefill, and pull the city's quartiers.
    // Polls while a freshly attached photo is still being processed by the worker.
    const editQuery = useQuery({
        ...postByIdQuery(isEdit ? editId : 0),
        refetchInterval: (q) =>
            q.state.data?.images?.some((im) => im.status === 'processing') ? 2000 : false,
    });
    const quartiersData = useQuery(quartiersQuery(user?.city));
    const quartierOptions = (quartiersData.data?.quartiers ?? []).map((q) => ({
        value: q.name,
        label: q.name,
    }));

    useEffect(() => {
        const post = editQuery.data;
        if (!isEdit || !post) return;
        setForm({
            title: post.title ?? '',
            description: post.description ?? '',
            price: post.price != null ? String(post.price) : '',
            category: post.categories?.[0] ?? '',
            condition: post.condition ?? '',
            ageBucket: post.age_bucket ?? '',
            listingType: post.is_free ? 'share' : post.exchange_items ? 'exchange' : 'sell',
            negotiable: post.allow_negotiation,
            exchangeItems: post.exchange_items ?? '',
            pickupQuartier: post.pickup_quartier ?? '',
            pickupNote: post.pickup_location_note ?? '',
            images: [],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editQuery.data?.id, isEdit]);

    // Keep the server photos in sync (new attachments, processing → ready).
    useEffect(() => {
        if (isEdit && editQuery.data) setExistingImages(editQuery.data.images ?? []);
    }, [editQuery.data, isEdit]);

    // Create mode: restore the autosaved draft (Zeigarnik).
    useEffect(() => {
        if (isEdit) return;
        let alive = true;
        loadSellDraft().then((d) => {
            if (!alive) return;
            if (d && d.form) {
                const restoredForm = { ...EMPTY_FORM, ...(d.form as Partial<ListingForm>), images: d.images ?? [] };
                if (hasContent(restoredForm)) {
                    setForm(restoredForm);
                    setStep(Math.max(0, Math.min(STEPS.length - 1, d.step ?? 0)));
                    setRestored(true);
                    if (restoredForm.title) setAiTried(true);
                    showToast.info('Brouillon restauré', 'Reprenez là où vous vous étiez arrêté.');
                }
            }
            setDraftReady(true);
        });
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Default the pickup quartier to the user's own (default effect).
    useEffect(() => {
        if (isEdit || !draftReady) return;
        if (!form.pickupQuartier && user?.quartier) {
            setForm((prev) => (prev.pickupQuartier ? prev : { ...prev, pickupQuartier: user.quartier! }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftReady, user?.quartier, isEdit]);

    // Debounced autosave (create mode only).
    useEffect(() => {
        if (isEdit || !draftReady || published) return;
        if (!hasContent(form)) return;
        const id = setTimeout(() => {
            const { images, ...rest } = form;
            saveSellDraft({ step, images, title: form.title, form: rest as Record<string, unknown> }, queryClient);
        }, 600);
        return () => clearTimeout(id);
    }, [form, step, isEdit, draftReady, published, queryClient]);

    const updateForm = <K extends keyof ListingForm>(field: K, value: ListingForm[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field as string]) setErrors((prev) => ({ ...prev, [field as string]: '' }));
    };

    const startOver = () => {
        Alert.alert('Recommencer ?', 'Le brouillon enregistré sur ce téléphone sera effacé.', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Effacer',
                style: 'destructive',
                onPress: () => {
                    clearSellDraft(queryClient);
                    setForm({ ...EMPTY_FORM, pickupQuartier: user?.quartier ?? '' });
                    setStep(0);
                    setAiResult(null);
                    setAiTried(false);
                    setPriceSug(null);
                    setRestored(false);
                    setErrors({});
                },
            },
        ]);
    };

    // --- payload builders (unchanged API contract) --------------------------

    const allowNegotiation = form.listingType === 'sell' && form.negotiable;

    const buildFormData = (state: 'draft' | 'published'): FormData => {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('state', state);
        fd.append('allow_negotiation', allowNegotiation ? 'true' : 'false');
        if (form.listingType === 'share') {
            fd.append('is_free', 'true');
        } else {
            fd.append('is_free', 'false');
            const price = parsePrice(form.price);
            if (price != null) fd.append('price', String(price));
        }
        if (form.listingType === 'exchange' && form.exchangeItems.trim()) {
            fd.append('exchange_items', form.exchangeItems.trim());
        }
        if (form.category) fd.append('categories', form.category); // single-select → 1-length csv
        if (form.condition) fd.append('condition', form.condition);
        if (form.ageBucket) fd.append('age_bucket', form.ageBucket);
        if (form.pickupQuartier) fd.append('pickup_quartier', form.pickupQuartier);
        if (form.pickupNote.trim()) fd.append('pickup_location_note', form.pickupNote.trim());
        // Photos were already uploaded straight to storage; attach their keys.
        const keys = form.images.map((uri) => uploadsRef.current[uri]?.key).filter(Boolean);
        if (keys.length) fd.append('image_keys', keys.join(','));
        return fd;
    };

    const buildPatch = (state: 'draft' | 'published'): Record<string, unknown> => {
        const patch: Record<string, unknown> = {
            title: form.title.trim(),
            description: form.description.trim(),
            state,
            allow_negotiation: allowNegotiation,
            categories: form.category ? [form.category] : [],
            condition: form.condition || null,
            age_bucket: form.ageBucket || null,
            pickup_quartier: form.pickupQuartier || null,
            pickup_location_note: form.pickupNote.trim() || null,
        };
        if (form.listingType === 'share') {
            patch.is_free = true;
            patch.price = null;
            patch.exchange_items = null;
        } else {
            patch.is_free = false;
            patch.price = parsePrice(form.price);
            patch.exchange_items =
                form.listingType === 'exchange' ? form.exchangeItems.trim() || null : null;
        }
        return patch;
    };

    // --- per-step validation (inline, Norman) ------------------------------

    const photoCount = existingImages.length + form.images.length;

    const stepErrors = (s: number): Record<string, string> => {
        const e: Record<string, string> = {};
        if (s === 0 && photoCount === 0) e.images = 'Ajoutez au moins une photo';
        if (s === 1) {
            if (!form.title.trim()) e.title = 'Le titre est requis';
            if (!form.description.trim()) e.description = 'La description est requise';
            if (!form.category) e.category = 'La catégorie est requise';
            if (!form.condition) e.condition = "L'état est requis";
        }
        if (s === 2) {
            if (form.listingType === 'sell' && parsePrice(form.price) == null)
                e.price = 'Le prix est requis';
            if (form.listingType === 'exchange' && !form.exchangeItems.trim())
                e.exchangeItems = 'Précisez contre quoi échanger';
        }
        return e;
    };

    const currentErrors = stepErrors(step);
    const nextDisabledReason = Object.values(currentErrors)[0];

    const goNext = () => {
        const e = stepErrors(step);
        if (Object.keys(e).length) {
            setErrors(e);
            return;
        }
        haptics.light();
        setErrors({});
        setStep((s) => Math.min(STEPS.length - 1, s + 1));
    };

    const goBack = () => {
        if (step === 0) {
            router.back();
            return;
        }
        setErrors({});
        setStep((s) => Math.max(0, s - 1));
    };

    // --- mutations ---------------------------------------------------------

    const createMut = useMutation({
        mutationFn: (state: 'draft' | 'published') => createPost(buildFormData(state)),
        onSuccess: ({ post, possibleDuplicateOf }, state) => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            clearSellDraft(queryClient);
            if (state === 'published') {
                haptics.success();
                setDuplicateOf(possibleDuplicateOf);
                setPublished(post);
            } else {
                showToast.success(
                    'Brouillon enregistré',
                    possibleDuplicateOf
                        ? 'Attention : vous avez déjà publié une annonce similaire.'
                        : 'Retrouvez-le dans « Mes annonces ».',
                );
                router.back();
            }
        },
        onError: (e) => showToast.error('Échec', errMessage(e)),
    });

    const updateMut = useMutation({
        mutationFn: (state: 'draft' | 'published') => updatePost(editId, buildPatch(state)),
        onSuccess: (_post, state) => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['post', editId] });
            haptics.success();
            showToast.success(state === 'published' ? 'Annonce mise à jour' : 'Brouillon enregistré');
            router.back();
        },
        onError: (e) => showToast.error('Échec', errMessage(e)),
    });

    const deleteImageMut = useMutation({
        mutationFn: (imageId: number) => deletePostImage(editId, imageId),
        onSuccess: (_r, imageId) => {
            setExistingImages((prev) => prev.filter((im) => im.id !== imageId));
            queryClient.invalidateQueries({ queryKey: ['post', editId] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
        onError: (e) => showToast.error('Échec', errMessage(e)),
    });

    // --- direct photo uploads ---------------------------------------------------

    const patchUpload = (uri: string, patch: Partial<UploadState>) =>
        setUploads((prev) => ({
            ...prev,
            [uri]: { ...(prev[uri] ?? { status: 'uploading', progress: 0 }), ...patch },
        }));

    /** Edit mode: attach an uploaded key to the post, then show the server copy. */
    const attachToPost = async (uri: string, key: string) => {
        await attachPostImages(editId, [key]);
        await editQuery.refetch();
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        setForm((prev) => ({ ...prev, images: prev.images.filter((u) => u !== uri) }));
    };

    const startUpload = async (uri: string) => {
        startedUploads.current.add(uri);
        const existing = uploadsRef.current[uri];
        // Retry after a failed attach (edit): the file is already in storage.
        if (isEdit && existing?.key) {
            patchUpload(uri, { status: 'uploading', progress: 1, error: undefined });
            try {
                await attachToPost(uri, existing.key);
            } catch (e) {
                patchUpload(uri, { status: 'error', error: uploadErrMessage(e) });
            }
            return;
        }
        patchUpload(uri, { status: 'uploading', progress: 0, error: undefined, key: undefined });
        try {
            const meta = assetMeta.current[uri] ?? {};
            let last = 0;
            const key = await uploadPhoto(uri, {
                mimeType: meta.mimeType,
                size: meta.size,
                onProgress: (f) => {
                    // ~5 % steps are enough for the ring and spare re-renders.
                    if (f === 1 || f - last >= 0.05) {
                        last = f;
                        patchUpload(uri, { progress: f });
                    }
                },
            });
            if (isEdit) {
                patchUpload(uri, { key, progress: 1 });
                await attachToPost(uri, key);
            }
            patchUpload(uri, { status: 'done', progress: 1, key });
        } catch (e) {
            patchUpload(uri, { status: 'error', error: uploadErrMessage(e) });
        }
    };

    // Upload every local photo once: freshly picked or restored from a draft.
    useEffect(() => {
        if (!draftReady) return;
        form.images.forEach((uri) => {
            if (!startedUploads.current.has(uri)) startUpload(uri);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.images, draftReady]);

    const uploadStates = form.images.map((uri) => uploads[uri]);
    const uploadingCount = uploadStates.filter((u) => !u || u.status === 'uploading').length;
    const failedCount = uploadStates.filter((u) => u?.status === 'error').length;

    const saving = createMut.isPending || updateMut.isPending || !!pendingSubmit;

    // --- AI assist (W6.2) ---------------------------------------------------

    const aiDraftMut = useMutation({
        mutationFn: async () => {
            const urls = await uploadImages(form.images);
            return aiDraft(urls, form.title || undefined);
        },
        onSuccess: (draft) => {
            setAiResult(draft);
            setForm((prev) => ({
                ...prev,
                title: prev.title || draft.title,
                description: prev.description || draft.description,
                category: prev.category || draft.categories[0] || prev.category,
            }));
            setErrors({});
            haptics.light();
        },
        onError: (e) => showToast.error('Suggestions IA', aiErrMessage(e)),
    });

    // Tesler: run the AI automatically the first time the user reaches step 2
    // with fresh photos and an empty title — they only confirm.
    useEffect(() => {
        if (step !== 1 || isEdit || aiTried || aiDraftMut.isPending) return;
        if (form.images.length > 0 && !form.title.trim()) {
            setAiTried(true);
            aiDraftMut.mutate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const priceSugMut = useMutation({
        mutationFn: () =>
            priceSuggestion({
                categories: form.category ? [form.category] : ['other'],
                title: form.title.trim(),
                condition: form.condition || null,
                age_bucket: form.ageBucket || null,
            }),
        onSuccess: (sug) => setPriceSug(sug),
        onError: (e) => showToast.error('Prix conseillé', aiErrMessage(e)),
    });

    const canPriceSuggest = !!form.title.trim() && !!form.category;
    const priceEditable = form.listingType !== 'share';

    // Anchoring: fetch the comparables range when the price step opens, before
    // the seller types a number. Re-fetch only if the item details changed.
    useEffect(() => {
        if (step !== 2 || !priceEditable || !canPriceSuggest) return;
        const key = `${form.title.trim()}|${form.category}|${form.condition}|${form.ageBucket}`;
        if (priceSugKey.current === key) return;
        priceSugKey.current = key;
        priceSugMut.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, priceEditable]);

    // --- photos ------------------------------------------------------------

    const pickImage = async (fromCamera: boolean) => {
        setSheet(null);
        try {
            if (fromCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    showToast.error('Permission requise', 'Autorisez l’accès à l’appareil photo.');
                    return;
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    showToast.error('Permission requise', 'Autorisez l’accès à vos photos.');
                    return;
                }
            }
            const result = fromCamera
                ? await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.8,
                  })
                : await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsMultipleSelection: false,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 0.8,
                  });
            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                haptics.light();
                assetMeta.current[asset.uri] = { mimeType: asset.mimeType, size: asset.fileSize };
                setForm((prev) => ({ ...prev, images: [...prev.images, asset.uri] }));
                if (errors.images) setErrors((prev) => ({ ...prev, images: '' }));
            }
        } catch {
            showToast.error('Erreur', 'Impossible d’accéder aux photos.');
        }
    };

    const handleAddImage = () => {
        if (photoCount >= MAX_PHOTOS) {
            showToast.error('Limite atteinte', `Maximum ${MAX_PHOTOS} photos.`);
            return;
        }
        setSheet('photo');
    };

    const handleRemoveImage = (index: number) => {
        const removed = form.images[index];
        updateForm('images', form.images.filter((_, i) => i !== index));
        showToast.undo('Photo retirée', () =>
            setForm((prev) => {
                const imgs = [...prev.images];
                imgs.splice(index, 0, removed);
                return { ...prev, images: imgs };
            }),
        );
    };

    const makeCover = (index: number) => {
        if (index === 0) return;
        haptics.selection();
        const imgs = [...form.images];
        const [img] = imgs.splice(index, 1);
        updateForm('images', [img, ...imgs]);
    };

    const handleRemoveExisting = (img: BdPostImage) => {
        Alert.alert('Supprimer la photo', 'Cette photo sera définitivement retirée de l’annonce.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteImageMut.mutate(img.id) },
        ]);
    };

    // --- submit ------------------------------------------------------------

    const submit = (state: 'draft' | 'published') => {
        const all = { ...stepErrors(0), ...stepErrors(1), ...stepErrors(2) };
        const needed =
            state === 'published'
                ? all
                : Object.fromEntries(
                      Object.entries(all).filter(([k]) => k === 'title' || k === 'description'),
                  );
        if (Object.keys(needed).length) {
            setErrors(needed);
            const firstBad = [0, 1, 2].find((s) =>
                Object.keys(stepErrors(s)).some((k) => k in needed),
            );
            if (firstBad != null) setStep(firstBad);
            showToast.error('Annonce incomplète', Object.values(needed)[0]);
            return;
        }
        if (failedCount > 0) {
            setStep(0);
            showToast.error(
                failedCount > 1 ? `${failedCount} photos non envoyées` : 'Une photo n’a pas été envoyée',
                'Touchez « Réessayer » sur la photo, ou retirez-la.',
            );
            return;
        }
        if (uploadingCount > 0) {
            // Publish as soon as the last photo is in storage.
            setPendingSubmit(state);
            showToast.info('Envoi des photos…', 'L’annonce sera enregistrée dès la fin de l’envoi.');
            return;
        }
        if (isEdit) updateMut.mutate(state);
        else createMut.mutate(state);
    };

    useEffect(() => {
        if (!pendingSubmit || uploadingCount > 0) return;
        const state = pendingSubmit;
        setPendingSubmit(null);
        if (failedCount > 0) {
            setStep(0);
            showToast.error('Envoi des photos incomplet', 'Touchez « Réessayer » sur la photo, ou retirez-la.');
            return;
        }
        if (isEdit) updateMut.mutate(state);
        else createMut.mutate(state);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingSubmit, uploadingCount, failedCount]);

    const handleShare = async () => {
        if (!published) return;
        const priceText = published.is_free ? 'Gratuit' : formatAmount(published.price);
        try {
            const res = await Share.share({
                message: `${published.title} — ${priceText} sur BonDeal`,
            });
            if (res.action === Share.sharedAction) {
                sharePost(published.id).catch(() => {});
            }
        } catch {
            // user dismissed / share unavailable
        }
    };

    // --- preview object (local only, for the "Aperçu" step) ----------------

    const previewPost = useMemo<BdPost>(
        () => ({
            id: isEdit ? editId : 0,
            title: form.title.trim() || 'Titre de votre annonce',
            description: form.description,
            price: form.listingType === 'share' ? null : parsePrice(form.price),
            is_free: form.listingType === 'share',
            exchange_items: form.listingType === 'exchange' ? form.exchangeItems.trim() || null : null,
            allow_negotiation: allowNegotiation,
            state: 'published',
            owner_id: user?.id ?? 0,
            owner_username: user?.username ?? null,
            city: user?.city ?? null,
            categories: form.category ? [form.category] : [],
            pickup_quartier: form.pickupQuartier || null,
            pickup_location_note: form.pickupNote || null,
            condition: form.condition || null,
            age_bucket: form.ageBucket || null,
            views_count: 0,
            likes_count: 0,
            liked_by_me: false,
            shares_count: 0,
            offer_count: 0,
            active_offer_count: 0,
            images: [
                ...existingImages,
                ...form.images.map((uri, i) => ({ id: -(i + 1), url: uri })),
            ],
            created_at: null,
            updated_at: null,
        }),
        [form, existingImages, user, isEdit, editId, allowNegotiation],
    );

    // --- edit-mode load guards (all hooks above) ---------------------------

    if (isEdit && editQuery.isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ScreenHeader title="Modifier l’annonce" />
                <View style={styles.loading}>
                    <Skeleton height={28} width="60%" />
                    <Skeleton height={180} />
                    <Skeleton height={48} />
                    <Skeleton height={48} />
                </View>
            </SafeAreaView>
        );
    }
    if (isEdit && (editQuery.error || !editQuery.data)) {
        return (
            <SafeAreaView style={styles.container}>
                <ScreenHeader title="Modifier l’annonce" />
                <ErrorState message="Impossible de charger cette annonce." onRetry={() => editQuery.refetch()} />
            </SafeAreaView>
        );
    }

    // --- step renderers ----------------------------------------------------

    const renderPhotos = () => (
        <>
            <SectionTitle
                title={isEdit ? 'Vos photos' : 'Commencez par une photo'}
                subtitle={
                    isEdit
                        ? 'Ajoutez ou retirez des photos. Les nouvelles sont enregistrées aussitôt.'
                        : 'Une seule suffit pour démarrer : l’IA s’occupe du reste. La première photo sera la couverture.'
                }
            />
            <View style={styles.photoGrid}>
                {existingImages.map((img, i) => {
                    const status = img.status ?? 'ready';
                    const src = img.variants?.thumb || img.url;
                    return (
                        <View key={`ex-${img.id}`} style={styles.photoCell}>
                            {status === 'ready' && !!src ? (
                                <AppImage uri={src} style={styles.photo} accessibilityLabel={`Photo ${i + 1}`} />
                            ) : (
                                <View
                                    style={[styles.photo, styles.photoState]}
                                    accessibilityLabel={
                                        status === 'failed' ? `Photo ${i + 1} : échec du traitement` : `Photo ${i + 1} : traitement en cours`
                                    }>
                                    {status === 'failed' ? (
                                        <>
                                            <Ionicons name="alert-circle-outline" size={24} color={t.colors.danger} />
                                            <AppText variant="caption" color="danger" align="center">
                                                Échec du traitement
                                            </AppText>
                                        </>
                                    ) : (
                                        <>
                                            <ActivityIndicator color={t.colors.brandStrong} />
                                            <AppText variant="caption" color="inkMuted" align="center">
                                                Traitement…
                                            </AppText>
                                        </>
                                    )}
                                </View>
                            )}
                            {i === 0 && status === 'ready' && <Badge label="Couverture" tone="overlay" style={styles.coverBadge} />}
                            <IconButton
                                icon="close"
                                label="Supprimer la photo"
                                variant="overlay"
                                size={18}
                                onPress={() => handleRemoveExisting(img)}
                                style={styles.photoRemove}
                            />
                        </View>
                    );
                })}
                {form.images.map((uri, i) => {
                    const isCover = existingImages.length === 0 && i === 0 && !isEdit;
                    const up = uploads[uri];
                    const uploading = !up || up.status === 'uploading';
                    const failed = up?.status === 'error';
                    return (
                        <View key={`new-${uri}-${i}`} style={styles.photoCell}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={isCover ? `Photo ${i + 1}, couverture` : `Photo ${i + 1}, définir comme couverture`}
                                disabled={isEdit}
                                onPress={() => makeCover(i)}>
                                <AppImage uri={uri} style={styles.photo} />
                            </Pressable>
                            {uploading && (
                                <View
                                    style={[StyleSheet.absoluteFill, styles.uploadOverlay]}
                                    accessibilityLiveRegion="polite"
                                    accessibilityLabel={`Envoi de la photo ${i + 1} : ${Math.round((up?.progress ?? 0) * 100)} %`}>
                                    <ActivityIndicator color={t.colors.onOverlay} />
                                    <AppText variant="captionStrong" style={{ color: t.colors.onOverlay }}>
                                        {Math.round((up?.progress ?? 0) * 100)} %
                                    </AppText>
                                    <View style={styles.uploadTrack}>
                                        <View style={[styles.uploadFill, { width: `${Math.round((up?.progress ?? 0) * 100)}%` }]} />
                                    </View>
                                </View>
                            )}
                            {failed && (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Photo ${i + 1} non envoyée : ${up?.error ?? ''}. Réessayer`}
                                    onPress={() => startUpload(uri)}
                                    style={[StyleSheet.absoluteFill, styles.uploadOverlay]}>
                                    <Ionicons name="refresh" size={22} color={t.colors.onOverlay} />
                                    <AppText variant="captionStrong" style={{ color: t.colors.onOverlay }} align="center">
                                        Réessayer
                                    </AppText>
                                    {!!up?.error && (
                                        <AppText variant="caption" style={{ color: t.colors.onOverlay }} align="center" numberOfLines={2}>
                                            {up.error}
                                        </AppText>
                                    )}
                                </Pressable>
                            )}
                            {up?.status === 'done' && !isEdit && (
                                <View style={styles.uploadDone} accessibilityLabel="Photo envoyée">
                                    <Ionicons name="checkmark" size={12} color={t.colors.onOverlay} />
                                </View>
                            )}
                            {isCover && <Badge label="Couverture" tone="overlay" style={styles.coverBadge} />}
                            <IconButton
                                icon="close"
                                label="Retirer la photo"
                                variant="overlay"
                                size={18}
                                onPress={() => handleRemoveImage(i)}
                                style={styles.photoRemove}
                            />
                        </View>
                    );
                })}
                {photoCount < MAX_PHOTOS && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Ajouter une photo"
                        onPress={handleAddImage}
                        style={({ pressed }) => [
                            styles.photoCell,
                            styles.addPhoto,
                            photoCount === 0 && styles.addPhotoLarge,
                            pressed && { opacity: 0.8 },
                        ]}>
                        <Ionicons name="camera-outline" size={photoCount === 0 ? 36 : 26} color={t.colors.brandStrong} />
                        <AppText variant="labelStrong" color="brandStrong">
                            {photoCount === 0 ? 'Ajouter une photo' : 'Ajouter'}
                        </AppText>
                        <AppText variant="caption" color="inkMuted">
                            {photoCount}/{MAX_PHOTOS}
                        </AppText>
                    </Pressable>
                )}
            </View>
            {!!errors.images && (
                <AppText variant="caption" color="danger" style={styles.errorText}>
                    {errors.images}
                </AppText>
            )}
            {uploadingCount > 0 && (
                <AppText variant="caption" color="inkMuted" style={styles.hint}>
                    Envoi en cours : vous pouvez continuer à remplir l’annonce.
                </AppText>
            )}
            {photoCount > 0 && photoCount < 3 && !isEdit && uploadingCount === 0 && (
                <AppText variant="caption" color="inkMuted" style={styles.hint}>
                    Astuce : 3 photos (face, dos, détail) rassurent les acheteurs.
                </AppText>
            )}
        </>
    );

    const renderDetails = () => (
        <>
            <SectionTitle
                title="Décrivez l’article"
                subtitle={
                    form.images.length > 0 && !isEdit
                        ? 'L’IA propose, vous validez : tout reste modifiable.'
                        : 'Quelques mots suffisent.'
                }
            />

            {/* AI assist — labor illusion tied to the real aiDraft call */}
            {!isEdit && form.images.length > 0 && (
                <View style={styles.block}>
                    <SellLaborSteps
                        steps={AI_STEPS}
                        running={aiDraftMut.isPending}
                        done={!!aiResult && !aiDraftMut.isPending}
                    />
                    {aiResult && !aiDraftMut.isPending && (
                        <View style={styles.aiNote}>
                            <Ionicons name="sparkles" size={16} color={t.colors.brandStrong} />
                            <AppText variant="caption" color="inkMuted" style={styles.flex}>
                                Suggestions IA (confiance {Math.round(aiResult.confidence * 100)} %) — vérifiez et
                                ajustez avant de continuer.
                            </AppText>
                        </View>
                    )}
                    {!aiDraftMut.isPending && (
                        <Button
                            label={aiResult ? 'Relancer les suggestions IA' : 'Remplir avec l’IA'}
                            icon="sparkles-outline"
                            variant="secondary"
                            size="sm"
                            onPress={() => {
                                setAiTried(true);
                                aiDraftMut.mutate();
                            }}
                            style={styles.aiButton}
                        />
                    )}
                </View>
            )}

            <Card style={styles.block}>
                <AppText variant="captionStrong" color="inkMuted" style={styles.chunkTitle}>
                    L’ESSENTIEL
                </AppText>
                <TextField
                    label="Titre"
                    value={form.title}
                    onChangeText={(v) => updateForm('title', v)}
                    placeholder="Ex : Téléphone Samsung A14, 64 Go"
                    error={errors.title}
                    maxLength={80}
                    showCount
                    editable={!aiDraftMut.isPending}
                />
                <TextField
                    label="Description"
                    value={form.description}
                    onChangeText={(v) => updateForm('description', v)}
                    placeholder="État, marque, taille, raison de la vente…"
                    multiline
                    error={errors.description}
                    editable={!aiDraftMut.isPending}
                    containerStyle={styles.fieldGap}
                />
            </Card>

            <Card style={styles.block}>
                <AppText variant="captionStrong" color="inkMuted" style={styles.chunkTitle}>
                    CARACTÉRISTIQUES
                </AppText>
                <PickerField
                    label="Catégorie"
                    value={form.category ? categoryLabel(form.category) : ''}
                    placeholder="Choisir une catégorie"
                    onPress={() => setSheet('category')}
                    error={errors.category}
                />
                <PickerField
                    label="État"
                    value={form.condition ? conditionLabel(form.condition) ?? '' : ''}
                    placeholder="Choisir l’état"
                    onPress={() => setSheet('condition')}
                    error={errors.condition}
                />
                <PickerField
                    label="Ancienneté (optionnel)"
                    value={form.ageBucket ? AGE_LABELS[form.ageBucket] ?? '' : ''}
                    placeholder="Depuis quand l’avez-vous ?"
                    onPress={() => setSheet('age')}
                />
            </Card>
        </>
    );

    const sug = priceSug;
    const hasRange = !!sug && sug.source !== 'no_data' && sug.range_min != null && sug.range_max != null;

    const renderPrice = () => (
        <>
            <SectionTitle title="Fixez votre prix" subtitle="Vendre, donner ou échanger : à vous de choisir." />

            <View style={styles.block}>
                <SegmentedControl<ListingType>
                    accessibilityLabel="Type d’annonce"
                    segments={[
                        { value: 'sell', label: 'Vendre' },
                        { value: 'share', label: 'Donner' },
                        { value: 'exchange', label: 'Échanger' },
                    ]}
                    value={form.listingType}
                    onChange={(v) => updateForm('listingType', v)}
                />
            </View>

            {form.listingType === 'share' ? (
                <Card tone="trust" style={styles.block}>
                    <View style={styles.row}>
                        <Ionicons name="gift-outline" size={24} color={t.colors.trust} />
                        <View style={styles.flex}>
                            <AppText variant="bodyStrong">Donnez une seconde vie</AppText>
                            <AppText variant="small" color="inkMuted">
                                Votre article sera affiché « Gratuit ». Un voisin en profitera.
                            </AppText>
                        </View>
                    </View>
                </Card>
            ) : (
                <>
                    {/* Anchor: comparables range BEFORE the input */}
                    {priceSugMut.isPending ? (
                        <Card tone="brand" style={styles.block}>
                            <AppText variant="labelStrong">Recherche d’articles similaires…</AppText>
                            <Skeleton height={14} width="70%" style={styles.fieldGap} />
                        </Card>
                    ) : hasRange ? (
                        <Card tone="brand" style={styles.block} accessibilityLabel="Prix conseillé">
                            <View style={styles.row}>
                                <Ionicons name="pricetags-outline" size={20} color={t.colors.brandStrong} />
                                <AppText variant="labelStrong" color="brandStrong">
                                    Prix conseillé
                                </AppText>
                            </View>
                            <AppText variant="h3" style={styles.fieldGap}>
                                {formatAmount(sug!.range_min)} – {formatAmount(sug!.range_max)}
                            </AppText>
                            <AppText variant="caption" color="inkMuted">
                                {sug!.source === 'similar_items' && sug!.comparable_count
                                    ? `D’après ${sug!.comparable_count} annonce${sug!.comparable_count > 1 ? 's' : ''} similaire${sug!.comparable_count > 1 ? 's' : ''} près de chez vous.`
                                    : 'Estimation selon l’âge et l’état de l’article.'}
                            </AppText>
                            {sug!.suggested != null && (
                                <Button
                                    label={`Utiliser ${formatAmount(sug!.suggested)}`}
                                    variant="secondary"
                                    size="sm"
                                    onPress={() => {
                                        haptics.selection();
                                        updateForm('price', String(sug!.suggested));
                                    }}
                                    style={styles.aiButton}
                                />
                            )}
                        </Card>
                    ) : sug ? (
                        <AppText variant="caption" color="inkMuted" style={styles.block}>
                            {sug.message || 'Pas encore de référence de prix pour cet article.'}
                        </AppText>
                    ) : !canPriceSuggest ? null : (
                        <Button
                            label="Voir le prix conseillé"
                            icon="pricetag-outline"
                            variant="secondary"
                            size="sm"
                            onPress={() => priceSugMut.mutate()}
                            style={styles.block}
                        />
                    )}

                    <TextField
                        label={form.listingType === 'exchange' ? 'Prix (optionnel)' : 'Prix'}
                        value={form.price}
                        onChangeText={(v) => updateForm('price', v.replace(/[^\d]/g, ''))}
                        placeholder="0"
                        keyboardType="numeric"
                        error={errors.price}
                        helper={parsePrice(form.price) != null ? formatAmount(parsePrice(form.price)) : undefined}
                        right={<AppText variant="labelStrong" color="inkMuted">FCFA</AppText>}
                        containerStyle={styles.block}
                    />

                    {form.listingType === 'exchange' && (
                        <TextField
                            label="Contre quoi ?"
                            value={form.exchangeItems}
                            onChangeText={(v) => updateForm('exchangeItems', v)}
                            placeholder="Ex : téléphone, vélo… (séparés par des virgules)"
                            error={errors.exchangeItems}
                            containerStyle={styles.block}
                        />
                    )}

                    {form.listingType === 'sell' && (
                        <ListGroup>
                            <ListRow
                                icon="swap-vertical-outline"
                                title="Prix négociable"
                                subtitle="Les acheteurs pourront vous faire une offre."
                                toggle={{ value: form.negotiable, onChange: (v) => updateForm('negotiable', v) }}
                                last
                            />
                        </ListGroup>
                    )}
                </>
            )}

            <Card style={styles.block}>
                <AppText variant="captionStrong" color="inkMuted" style={styles.chunkTitle}>
                    REMISE EN MAIN PROPRE
                </AppText>
                <PickerField
                    label="Quartier"
                    value={form.pickupQuartier}
                    placeholder={user?.city ? 'Choisir un quartier' : 'Ville non définie'}
                    onPress={() => setSheet('quartier')}
                />
                <TextField
                    label="Point de rencontre (optionnel)"
                    value={form.pickupNote}
                    onChangeText={(v) => updateForm('pickupNote', v)}
                    placeholder="Ex : devant la pharmacie, au marché…"
                    helper="Privilégiez un lieu public et fréquenté."
                />
            </Card>
        </>
    );

    const renderPreview = () => (
        <>
            <SectionTitle
                title="Dernière vérification"
                subtitle="Voici comment les acheteurs verront votre annonce."
            />
            <View style={styles.previewWrap}>
                <ListingCard post={previewPost} onPress={() => {}} width={220} />
            </View>
            <ListGroup title="Récapitulatif">
                <ListRow icon="images-outline" title="Photos" value={String(photoCount)} onPress={() => setStep(0)} />
                <ListRow
                    icon="pricetag-outline"
                    title="Catégorie"
                    value={form.category ? categoryLabel(form.category) : '—'}
                    onPress={() => setStep(1)}
                />
                <ListRow
                    icon="star-outline"
                    title="État"
                    value={conditionLabel(form.condition) ?? '—'}
                    onPress={() => setStep(1)}
                />
                <ListRow
                    icon="cash-outline"
                    title="Prix"
                    value={
                        form.listingType === 'share'
                            ? 'Gratuit'
                            : parsePrice(form.price) != null
                              ? formatAmount(parsePrice(form.price))
                              : form.listingType === 'exchange'
                                ? 'Échange'
                                : '—'
                    }
                    subtitle={form.listingType === 'sell' ? (form.negotiable ? 'Négociable' : 'Prix ferme') : undefined}
                    onPress={() => setStep(2)}
                />
                <ListRow
                    icon="location-outline"
                    title="Quartier"
                    value={form.pickupQuartier || '—'}
                    onPress={() => setStep(2)}
                    last
                />
            </ListGroup>
            <Button
                label="Enregistrer en brouillon"
                variant="ghost"
                icon="save-outline"
                onPress={() => submit('draft')}
                disabled={saving}
            />
        </>
    );

    const isLast = step === STEPS.length - 1;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <ScreenHeader
                title={isEdit ? 'Modifier l’annonce' : 'Vendre un article'}
                onBack={goBack}
                right={
                    step > 0 ? (
                        <IconButton icon="close" label="Fermer" onPress={() => router.back()} />
                    ) : undefined
                }
            />
            <Stepper steps={STEPS} current={step} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {restored && !isEdit && (
                        <Card tone="muted" style={styles.block}>
                            <View style={styles.row}>
                                <Ionicons name="time-outline" size={20} color={t.colors.inkMuted} />
                                <AppText variant="small" style={styles.flex}>
                                    Brouillon restauré
                                </AppText>
                                <Button label="Recommencer" variant="ghost" size="sm" onPress={startOver} />
                            </View>
                        </Card>
                    )}
                    {step === 0 && renderPhotos()}
                    {step === 1 && renderDetails()}
                    {step === 2 && renderPrice()}
                    {step === 3 && renderPreview()}
                </ScrollView>

                {/* Sticky bottom action bar (thumb zone, Fitts) */}
                <View style={styles.bottomBar}>
                    {step > 0 && (
                        <Button label="Retour" variant="secondary" onPress={goBack} style={styles.backBtn} />
                    )}
                    <View style={styles.flex}>
                        {isLast ? (
                            <Button
                                label={isEdit ? 'Mettre à jour' : 'Publier l’annonce'}
                                icon={isEdit ? 'checkmark' : 'rocket-outline'}
                                onPress={() => submit('published')}
                                loading={saving}
                                fullWidth
                                size="lg"
                            />
                        ) : (
                            <Button
                                label="Suivant"
                                iconRight="arrow-forward"
                                onPress={goNext}
                                disabled={!!nextDisabledReason || aiDraftMut.isPending}
                                disabledReason={
                                    aiDraftMut.isPending ? 'L’IA prépare votre annonce…' : nextDisabledReason
                                }
                                fullWidth
                                size="lg"
                            />
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>

            <SellOptionSheet
                visible={sheet === 'category'}
                title="Catégorie"
                options={CATEGORIES}
                selectedValue={form.category}
                onClose={() => setSheet(null)}
                onSelect={(v) => updateForm('category', v)}
            />
            <SellOptionSheet
                visible={sheet === 'condition'}
                title="État de l’article"
                options={CONDITIONS}
                selectedValue={form.condition}
                onClose={() => setSheet(null)}
                onSelect={(v) => updateForm('condition', v)}
            />
            <SellOptionSheet
                visible={sheet === 'age'}
                title="Ancienneté"
                options={AGE_BUCKETS}
                selectedValue={form.ageBucket}
                onClose={() => setSheet(null)}
                onSelect={(v) => updateForm('ageBucket', v)}
            />
            <SellOptionSheet
                visible={sheet === 'quartier'}
                title="Quartier de remise"
                options={quartierOptions}
                selectedValue={form.pickupQuartier}
                emptyText={user?.city ? 'Aucun quartier pour votre ville.' : 'Ville non définie.'}
                onClose={() => setSheet(null)}
                onSelect={(v) => updateForm('pickupQuartier', v)}
            />
            <Sheet visible={sheet === 'photo'} onClose={() => setSheet(null)} title="Ajouter une photo">
                <View style={styles.photoSheet}>
                    <Button label="Prendre une photo" icon="camera-outline" onPress={() => pickImage(true)} fullWidth />
                    <Button
                        label="Choisir dans la galerie"
                        icon="images-outline"
                        variant="secondary"
                        onPress={() => pickImage(false)}
                        fullWidth
                    />
                </View>
            </Sheet>

            <SellCelebration
                visible={!!published}
                title={published?.title ?? ''}
                duplicateOfId={duplicateOf}
                onViewDuplicate={() => {
                    const id = duplicateOf;
                    setPublished(null);
                    if (id) router.replace({ pathname: '/item-details', params: { id: String(id) } });
                }}
                onShare={handleShare}
                onView={() => {
                    const id = published?.id;
                    setPublished(null);
                    if (id) router.replace({ pathname: '/item-details', params: { id: String(id) } });
                    else router.replace('/(tabs)/home');
                }}
                onHome={() => {
                    setPublished(null);
                    router.replace('/(tabs)/home');
                }}
            />
        </SafeAreaView>
    );
}

const makeStyles = createStyles((t: Theme) => ({
    container: { flex: 1, backgroundColor: t.colors.canvas },
    flex: { flex: 1 },
    loading: { padding: t.spacing.md, gap: t.spacing.md },
    scroll: { padding: t.spacing.md, paddingBottom: t.spacing.xxl },
    sectionTitle: { gap: 4, marginBottom: t.spacing.md },
    block: { marginBottom: t.spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
    chunkTitle: { letterSpacing: 0.5, marginBottom: t.spacing.sm },
    field: { marginBottom: t.spacing.sm },
    fieldLabel: { marginBottom: 6 },
    fieldGap: { marginTop: t.spacing.xs },
    picker: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: t.radius.sm,
        backgroundColor: t.colors.surface,
        gap: 8,
    },
    errorText: { marginTop: 4 },
    hint: { marginTop: t.spacing.sm },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
    photoCell: { width: '31.5%', aspectRatio: 1, borderRadius: t.radius.md, overflow: 'hidden' },
    photo: { width: '100%', height: '100%' },
    coverBadge: { position: 'absolute', left: 6, bottom: 6 },
    photoRemove: { position: 'absolute', top: 0, right: 0, width: 36, height: 36 },
    addPhoto: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: t.colors.brandStrong,
        backgroundColor: t.colors.brandTint,
    },
    addPhotoLarge: { width: '100%', aspectRatio: 4 / 3 },
    photoState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 6,
        backgroundColor: t.colors.surfaceAlt,
    },
    uploadOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: 6,
        backgroundColor: t.colors.overlay,
    },
    uploadTrack: {
        width: '70%',
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.35)',
        overflow: 'hidden',
    },
    uploadFill: { height: 4, borderRadius: 2, backgroundColor: t.colors.brand },
    uploadDone: {
        position: 'absolute',
        left: 6,
        top: 6,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.success,
    },
    aiNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: t.spacing.xs },
    aiButton: { marginTop: t.spacing.sm, alignSelf: 'flex-start' },
    previewWrap: { alignItems: 'center', marginBottom: t.spacing.lg },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.md,
        paddingTop: t.spacing.sm,
        paddingBottom: t.spacing.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: t.colors.line,
        backgroundColor: t.colors.surface,
    },
    backBtn: { minWidth: 100 },
    photoSheet: { gap: t.spacing.sm, paddingBottom: t.spacing.sm },
}));
