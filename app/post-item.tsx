// app/post-item.tsx — Sell flow (create + edit), doc §4.1 "Sell (post item)".
//
// 3-step stepper (docs/11 §4.3, Hick + goal-gradient): Photos → Vérifier →
// Aperçu & publier. Step 1 is camera-first and one photo is enough to go on
// (foot-in-the-door); step 2 merges the AI suggestions (Tesler + IKEA effect:
// the user confirms with chips) and the price, which sits on the comparables
// range (anchoring); step 3 previews the buyer's card. The draft is autosaved
// locally (Zeigarnik) and publishing ends on a drawn check + share
// (peak–end). Edit mode reuses the same steps without autosave.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import Animated, { FadeInLeft, FadeInRight, Keyframe } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AppImage,
    AppText,
    Avatar,
    Badge,
    Button,
    Card,
    CategoryRow,
    Chip,
    ErrorState,
    IconButton,
    ListRow,
    ListGroup,
    ScreenHeader,
    ProgressRing,
    PressableScale,
    Price,
    SegmentedControl,
    Shimmer,
    Skeleton,
    TextField,
    showToast,
} from '@/components/ui';
import SellLaborSteps from '@/components/molecules/SellLaborSteps';
import SellOptionSheet from '@/components/molecules/SellOptionSheet';
import SellCelebration from '@/components/organisms/SellCelebration';
import ActionDock, { dockBottom, DockButton } from '@/components/organisms/ActionDock';
import SellProgress from '@/components/molecules/SellProgress';
import SellPhotoTile from '@/components/molecules/SellPhotoTile';
import SellPriceRange from '@/components/molecules/SellPriceRange';
import { moveItem, pricePresets } from '@/components/molecules/sellGrid';
import { enterFade, RM } from '@/components/motion/anim';
import { duration } from '@/theme/motion';
import { ApiError, apiErrorMessage } from '@/lib/api';
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
import { useCityQuartiers } from '@/lib/api/geo';
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
import { coverThumb, largeUrl } from '@/lib/images';
import { useAuth } from '@/contexts/AuthContext';
import { createStyles, Theme, useStyles, useTheme } from '@/theme';
import type { BdAiDraft, BdPost, BdPostImage, BdPriceSuggestion } from '@/constants/types';
import { track } from '@/lib/analytics';

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

const STEPS = ['Photos', 'Vérifier', 'Aperçu'];
const GRID_COLS = 4;

/** Step change: slide/fade in from the side we're heading to (≤ 250 ms). */
const stepEnter = (dir: number) =>
    (dir >= 0 ? FadeInRight : FadeInLeft).duration(duration.medium).reduceMotion(RM);

/** Aperçu: the buyer's card flips in (rotateY + fade, 350 ms). */
const FLIP_IN = new Keyframe({
    0: { opacity: 0, transform: [{ perspective: 900 }, { rotateY: '-70deg' }, { scale: 0.96 }] },
    100: { opacity: 1, transform: [{ perspective: 900 }, { rotateY: '0deg' }, { scale: 1 }] },
})
    .duration(duration.long)
    .reduceMotion(RM);
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
        // Branch on the error code / status only; the detail is shown as is.
        if (e.code === 'photo_limit') return apiErrorMessage(e, 'Nombre maximal de photos atteint.');
        if (e.code === 'upload_too_large' || e.status === 413) return apiErrorMessage(e, 'Photo trop lourde.');
        if (e.code === 'unsupported_image' || e.status === 415) return apiErrorMessage(e, 'Format d’image non pris en charge.');
        if (e.code === 'rate_limited' || e.status === 429) return 'Trop d’envois, réessayez plus tard.';
        if (e.status === 503) return 'Envoi de photos indisponible pour le moment.';
        if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
        return apiErrorMessage(e, 'Échec de l’envoi. Réessayez.');
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
        if (e.code === 'photo_limit') return apiErrorMessage(e, 'Nombre maximal de photos atteint.');
        if (e.code === 'upload_too_large' || e.status === 413) return apiErrorMessage(e, 'Image trop lourde.');
        if (e.code === 'rate_limited' || e.status === 429) return apiErrorMessage(e, 'Trop de tentatives, réessayez plus tard.');
        if (e.status >= 500) return 'Erreur serveur. Réessayez.';
    }
    return apiErrorMessage(e, 'Une erreur est survenue. Réessayez.');
}

/** ApiError → French message for the AI-assist actions. */
function aiErrMessage(e: unknown): string {
    if (e instanceof ApiError) {
        if (e.status === 429) return 'Limite atteinte, réessayez plus tard.';
        if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
        if (e.status === 502 || e.status === 503) return "L’assistant IA est indisponible.";
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

    // Analytics (opt-in): the sell flow was opened for a new listing.
    useEffect(() => {
        if (!isEdit) track('start_listing', { source: 'post_item' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [step, setStepState] = useState(0);
    const stepDir = useRef(1);
    const scrollRef = useRef<ScrollView>(null);
    const setStep = useCallback((next: number | ((s: number) => number)) => {
        setStepState((cur) => {
            const n = typeof next === 'function' ? next(cur) : next;
            stepDir.current = n >= cur ? 1 : -1;
            return n;
        });
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []);
    const { width: winW, height: winH } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [dockH, setDockH] = useState(72);
    const [gridW, setGridW] = useState(0);
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
    const quartiersData = useCityQuartiers(user?.city);
    const quartierOptions = quartiersData.quartiers.map((q) => ({
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
                    setStep(Math.max(0, Math.min(STEPS.length - 1, d.step ?? 0))); // already migrated to 3 steps
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
            if (!form.condition) e.condition = "L’état est requis";
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
        // Failure is shown inline in step 2 (fallback card), not just a toast.
        onError: () => haptics.warning(),
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

    // Anchoring: fetch the comparables range on the "Vérifier" step once the
    // AI (or the user) has a title and a category, before the seller types a
    // price. Re-fetch when the category/condition/age change, not per keystroke.
    useEffect(() => {
        if (step !== 1 || !priceEditable || !canPriceSuggest || aiDraftMut.isPending) return;
        const key = `${form.title.trim()}|${form.category}|${form.condition}|${form.ageBucket}`;
        if (priceSugKey.current === key) return;
        priceSugKey.current = key;
        priceSugMut.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, priceEditable, aiDraftMut.isPending, form.category, form.condition, form.ageBucket]);

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
                track('photo_added', { source: fromCamera ? 'camera' : 'library', count: photoCount + 1, state: isEdit ? 'edit' : 'new' });
                if (errors.images) setErrors((prev) => ({ ...prev, images: '' }));
            }
        } catch {
            showToast.error('Erreur', 'Impossible d’accéder aux photos.');
        }
    };

    const handleAddImage = (fromCamera: boolean) => {
        if (photoCount >= MAX_PHOTOS) {
            showToast.error('Limite atteinte', `Maximum ${MAX_PHOTOS} photos.`);
            return;
        }
        pickImage(fromCamera);
    };

    // Drag-to-reorder / accessibility moves (create mode); index 0 = cover.
    const movePhoto = useCallback((from: number, to: number) => {
        haptics.selection();
        setForm((prev) => ({ ...prev, images: moveItem(prev.images, from, to) }));
    }, []);

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
        const all = { ...stepErrors(0), ...stepErrors(1) };
        const needed =
            state === 'published'
                ? all
                : Object.fromEntries(
                      Object.entries(all).filter(([k]) => k === 'title' || k === 'description'),
                  );
        if (Object.keys(needed).length) {
            setErrors(needed);
            const firstBad = [0, 1].find((s) =>
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

    // WhatsApp is the main channel in Gabon: deep link when it's installed,
    // the system share sheet otherwise.
    const [hasWhatsApp, setHasWhatsApp] = useState(false);
    useEffect(() => {
        if (!published) return;
        Linking.canOpenURL('whatsapp://send')
            .then(setHasWhatsApp)
            .catch(() => setHasWhatsApp(false));
    }, [published]);

    const publishedPrice = (p: BdPost) =>
        p.is_free ? 'Gratuit' : p.price != null ? formatAmount(p.price) : p.exchange_items ? 'Échange' : '';

    const handleShare = async () => {
        if (!published) return;
        const priceText = publishedPrice(published);
        const url = Linking.createURL('/item-details', { queryParams: { id: String(published.id) } });
        const message = `${published.title}${priceText ? ` — ${priceText}` : ''} sur BonDeal\n${url}`;
        try {
            if (hasWhatsApp) {
                await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`);
                sharePost(published.id).catch(() => {});
                track('share_item', { post_id: published.id, category: published.categories?.[0] ?? null });
                return;
            }
            const res = await Share.share({ message });
            if (res.action === Share.sharedAction) {
                sharePost(published.id).catch(() => {});
                track('share_item', { post_id: published.id, category: published.categories?.[0] ?? null });
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

    const gap = t.spacing.xs;
    const cellW = gridW ? Math.floor((gridW - gap * (GRID_COLS - 1)) / GRID_COLS) : 0;
    const cellStyle = cellW ? { width: cellW, height: cellW } : styles.photoCellFallback;
    const canAdd = photoCount < MAX_PHOTOS;

    // Step 1 is a dark, camera-first screen (docs/12). Fixed dark ground in
    // both schemes; text and icons are white.
    const cam = {
        bg: t.isDark ? t.colors.canvas : '#0A1220',
        fg: t.isDark ? t.colors.ink : '#FFFFFF',
        muted: 'rgba(255,255,255,0.72)',
        tile: 'rgba(255,255,255,0.06)',
        line: 'rgba(255,255,255,0.22)',
        error: '#FCA5A5',
    };
    // Smaller once there is a cover, so the tray and the shutter stay in view.
    const vfH = Math.round(Math.min(winW - t.spacing.md * 2, winH * (photoCount > 0 ? 0.3 : 0.4)));
    const firstExisting = existingImages[0];
    const coverUri = firstExisting
        ? (firstExisting.status ?? 'ready') === 'ready'
            ? largeUrl(firstExisting)
            : null
        : form.images[0] ?? null;

    /** Viewfinder corner brackets. */
    const corners = (['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <View
            key={c}
            pointerEvents="none"
            style={[
                styles.corner,
                {
                    borderColor: cam.fg,
                    top: c[0] === 't' ? 12 : undefined,
                    bottom: c[0] === 'b' ? 12 : undefined,
                    left: c[1] === 'l' ? 12 : undefined,
                    right: c[1] === 'r' ? 12 : undefined,
                    borderTopWidth: c[0] === 't' ? 3 : 0,
                    borderBottomWidth: c[0] === 'b' ? 3 : 0,
                    borderLeftWidth: c[1] === 'l' ? 3 : 0,
                    borderRightWidth: c[1] === 'r' ? 3 : 0,
                },
            ]}
        />
    ));

    const renderPhotos = () => (
        <>
            <View style={styles.sectionTitle}>
                <AppText variant="h2" accessibilityRole="header" style={{ color: cam.fg }}>
                    {isEdit ? 'Vos photos' : 'Commencez par une photo'}
                </AppText>
                <AppText variant="small" style={{ color: cam.muted }}>
                    {isEdit
                        ? 'Ajoutez ou retirez des photos. Les nouvelles sont enregistrées aussitôt.'
                        : photoCount > 1
                          ? 'Maintenez une photo appuyée puis glissez-la pour changer l’ordre. La première est la couverture.'
                          : 'Une seule suffit pour démarrer : l’IA s’occupe du reste. La première photo sera la couverture.'}
                </AppText>
            </View>

            {/* Viewfinder: the cover once there is one, else the camera call */}
            <PressableScale
                accessibilityRole={coverUri ? 'image' : 'button'}
                accessibilityLabel={coverUri ? 'Photo de couverture' : 'Prendre une photo'}
                haptic="light"
                disabled={!!coverUri || !canAdd}
                onPress={() => handleAddImage(true)}
                style={[styles.viewfinder, { height: vfH, backgroundColor: cam.tile, borderColor: cam.line }]}>
                {coverUri ? (
                    <>
                        <AppImage uri={coverUri} style={StyleSheet.absoluteFill} recyclingKey={coverUri} />
                        <Badge label="Couverture" tone="overlay" icon="star" style={styles.vfBadge} />
                    </>
                ) : (
                    <View style={styles.vfEmpty}>
                        <Ionicons name="camera-outline" size={44} color={cam.fg} />
                        <AppText variant="bodyStrong" style={{ color: cam.fg }}>
                            Prendre une photo
                        </AppText>
                        <AppText variant="caption" style={{ color: cam.muted }}>
                            Recommandé : lumière du jour
                        </AppText>
                    </View>
                )}
                {corners}
            </PressableScale>

            {photoCount > 0 && (
                <View style={styles.photoGrid} onLayout={(e) => setGridW(Math.round(e.nativeEvent.layout.width))}>
                    {existingImages.map((img, i) => {
                        const status = img.status ?? 'ready';
                        const src = img.variants?.thumb || img.url;
                        return (
                            <Animated.View
                                key={`ex-${img.id}`}
                                entering={enterFade()}
                                style={[styles.photoCell, cellStyle]}>
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
                                {i === 0 && status === 'ready' && <Badge label="Couverture" tone="overlay" icon="star" style={styles.coverBadge} />}
                                <IconButton
                                    icon="close"
                                    label="Supprimer la photo"
                                    variant="overlay"
                                    size={18}
                                    onPress={() => handleRemoveExisting(img)}
                                    style={styles.photoRemove}
                                />
                            </Animated.View>
                        );
                    })}
                    {form.images.map((uri, i) => {
                        const isCover = existingImages.length === 0 && i === 0 && !isEdit;
                        const up = uploads[uri];
                        const uploading = !up || up.status === 'uploading';
                        const failed = up?.status === 'error';
                        const pct = Math.round((up?.progress ?? 0) * 100);
                        return (
                            <SellPhotoTile
                                key={`new-${uri}`}
                                index={i}
                                count={form.images.length}
                                cols={GRID_COLS}
                                stepX={cellW + gap}
                                stepY={cellW + gap}
                                draggable={!isEdit && existingImages.length === 0}
                                onMove={movePhoto}
                                style={[styles.photoCell, cellStyle]}
                                accessibilityLabel={isCover ? `Photo ${i + 1}, couverture` : `Photo ${i + 1}`}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={isCover ? `Photo ${i + 1}, couverture` : `Photo ${i + 1}, définir comme couverture`}
                                    disabled={isEdit}
                                    onPress={() => makeCover(i)}
                                    onLongPress={() => {}}
                                    delayLongPress={280}
                                    style={styles.photo}>
                                    <AppImage uri={uri} style={styles.photo} recyclingKey={uri} />
                                </Pressable>
                                {uploading && (
                                    <View
                                        pointerEvents="none"
                                        style={[StyleSheet.absoluteFill, styles.uploadOverlay]}
                                        accessibilityLiveRegion="polite"
                                        accessibilityLabel={`Envoi de la photo ${i + 1} : ${pct} %`}>
                                        <ProgressRing progress={up?.progress ?? 0} size={52} stroke={4}>
                                            <AppText variant="captionStrong" style={{ color: t.colors.onOverlay }}>
                                                {pct} %
                                            </AppText>
                                        </ProgressRing>
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
                                    <Animated.View entering={enterFade()} style={styles.uploadDone} accessibilityLabel="Photo envoyée">
                                        <Ionicons name="checkmark" size={12} color={t.colors.onDanger /* white on light success, ink on dark */} />
                                    </Animated.View>
                                )}
                                {isCover && <Badge label="Couverture" tone="overlay" icon="star" style={styles.coverBadge} />}
                                <IconButton
                                    icon="close"
                                    label="Retirer la photo"
                                    variant="overlay"
                                    size={18}
                                    onPress={() => handleRemoveImage(i)}
                                    style={styles.photoRemove}
                                />
                            </SellPhotoTile>
                        );
                    })}
                </View>
            )}
            {!!errors.images && (
                <AppText variant="caption" style={[styles.errorText, { color: cam.error }]}>
                    {errors.images}
                </AppText>
            )}
            {uploadingCount > 0 && (
                <AppText variant="caption" style={[styles.hint, { color: cam.muted }]}>
                    Envoi en cours : vous pouvez continuer à remplir l’annonce.
                </AppText>
            )}
            {photoCount > 0 && photoCount < 3 && !isEdit && uploadingCount === 0 && (
                <AppText variant="caption" style={[styles.hint, { color: cam.muted }]}>
                    Astuce : 3 photos (face, dos, détail) rassurent les acheteurs.
                </AppText>
            )}

            {/* Camera controls: gallery · shutter · counter */}
            <View style={styles.shutterRow}>
                <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Choisir dans la galerie"
                    accessibilityState={{ disabled: !canAdd }}
                    haptic="light"
                    disabled={!canAdd}
                    onPress={() => handleAddImage(false)}
                    style={[styles.camSide, { backgroundColor: cam.tile, borderColor: cam.line, opacity: canAdd ? 1 : 0.45 }]}>
                    <Ionicons name="images-outline" size={22} color={cam.fg} />
                    <AppText variant="captionStrong" style={{ color: cam.fg }}>
                        Galerie
                    </AppText>
                </PressableScale>
                <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Prendre une photo"
                    accessibilityState={{ disabled: !canAdd }}
                    haptic="light"
                    scaleTo={0.92}
                    disabled={!canAdd}
                    onPress={() => handleAddImage(true)}
                    style={[styles.shutter, { borderColor: cam.fg, opacity: canAdd ? 1 : 0.45 }]}>
                    <View style={[styles.shutterCore, { backgroundColor: cam.fg }]}>
                        <Ionicons name="camera" size={26} color={cam.bg} />
                    </View>
                </PressableScale>
                <View style={styles.camSide} accessibilityLabel={`${photoCount} photo${photoCount > 1 ? 's' : ''} sur ${MAX_PHOTOS}`}>
                    <AppText variant="h3" style={[styles.tabular, { color: cam.fg }]}>
                        {photoCount}/{MAX_PHOTOS}
                    </AppText>
                    <AppText variant="caption" style={{ color: cam.muted }}>
                        photos
                    </AppText>
                </View>
            </View>
        </>
    );

    const renderDetails = () => (
        <>
            <SectionTitle
                title={form.images.length > 0 && !isEdit ? 'Vérifiez les suggestions' : 'Décrivez l’article'}
                subtitle={
                    form.images.length > 0 && !isEdit
                        ? 'Remplies à partir de vos photos : touchez pour corriger.'
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
                    {aiResult && !aiDraftMut.isPending && !aiDraftMut.isError && (
                        <View style={styles.aiNote}>
                            <Ionicons name="sparkles" size={16} color={t.colors.brandStrong} />
                            <AppText variant="caption" color="inkMuted" style={styles.flex}>
                                Suggestions IA : vérifiez avant de publier.
                            </AppText>
                        </View>
                    )}
                    {aiDraftMut.isError && (
                        <Animated.View entering={enterFade()}>
                            <Card tone="warning" style={styles.aiFallback} accessibilityRole="alert">
                                <View style={styles.row}>
                                    <Ionicons name="create-outline" size={20} color={t.colors.warning} />
                                    <AppText variant="labelStrong" style={styles.flex}>
                                        Pas de suggestion cette fois
                                    </AppText>
                                </View>
                                <AppText variant="small" color="inkMuted">
                                    {aiErrMessage(aiDraftMut.error)} Remplissez le titre et la description
                                    vous-même : quelques mots suffisent.
                                </AppText>
                            </Card>
                        </Animated.View>
                    )}
                    {!aiDraftMut.isPending && (
                        <Button
                            label={
                                aiDraftMut.isError
                                    ? 'Réessayer avec l’IA'
                                    : aiResult
                                      ? 'Relancer les suggestions IA'
                                      : 'Remplir avec l’IA'
                            }
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

            <View style={styles.formSection}>
                <AppText variant="h3" accessibilityRole="header" style={styles.chunkTitle}>
                    L’essentiel
                </AppText>
                {aiDraftMut.isPending ? (
                    <View accessibilityLabel="L’IA rédige le titre et la description">
                        <AppText variant="labelStrong" style={styles.fieldLabel}>
                            Titre
                        </AppText>
                        <Shimmer height={48} />
                        <AppText variant="labelStrong" style={[styles.fieldLabel, styles.fieldGapLg]}>
                            Description
                        </AppText>
                        <Shimmer height={18} width="92%" />
                        <Shimmer height={18} width="80%" style={styles.fieldGap} />
                        <Shimmer height={18} width="55%" style={styles.fieldGap} />
                    </View>
                ) : (
                <Animated.View entering={aiResult ? enterFade(duration.medium) : undefined}>
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
                </Animated.View>
                )}
            </View>

            <View style={styles.formSection}>
                <AppText variant="h3" accessibilityRole="header" style={styles.chunkTitle}>
                    Caractéristiques
                </AppText>
                <View style={styles.field}>
                    <AppText variant="labelStrong" style={styles.fieldLabel}>
                        Catégorie{form.category ? ` · ${categoryLabel(form.category)}` : ''}
                    </AppText>
                    {aiDraftMut.isPending ? (
                        <Shimmer height={40} radius={t.radius.sm} />
                    ) : (
                        <CategoryRow
                            items={CATEGORIES.map((c) => ({ value: c.value }))}
                            selected={form.category || null}
                            onSelect={(v) => v && updateForm('category', v)}
                            style={styles.catRow}
                            accessibilityLabel="Catégorie de l’article"
                        />
                    )}
                    {!!errors.category && (
                        <AppText variant="caption" color="danger" style={styles.errorText}>
                            {errors.category}
                        </AppText>
                    )}
                </View>
                <View style={styles.field}>
                    <AppText variant="labelStrong" style={styles.fieldLabel}>
                        État
                    </AppText>
                    <View style={styles.chipWrap} accessibilityLabel="État de l’article">
                        {CONDITIONS.map((c) => (
                            <Chip
                                key={c.value}
                                kind="choice"
                                label={c.label}
                                selected={form.condition === c.value}
                                onPress={() => updateForm('condition', c.value)}
                            />
                        ))}
                    </View>
                    {!!errors.condition && (
                        <AppText variant="caption" color="danger" style={styles.errorText}>
                            {errors.condition}
                        </AppText>
                    )}
                </View>
                <PickerField
                    label="Ancienneté (optionnel)"
                    value={form.ageBucket ? AGE_LABELS[form.ageBucket] ?? '' : ''}
                    placeholder="Depuis quand l’avez-vous ?"
                    onPress={() => setSheet('age')}
                />
            </View>
        </>
    );

    const sug = priceSug;
    const hasRange = !!sug && sug.source !== 'no_data' && sug.range_min != null && sug.range_max != null;

    const presets = hasRange ? pricePresets(sug!.range_min, sug!.suggested, sug!.range_max) : [];
    const sugRounded = sug?.suggested ? pricePresets(null, sug.suggested, null)[0] ?? null : null;

    const renderPrice = () => (
        <>
            <AppText variant="h3" accessibilityRole="header" style={[styles.chunkTitle, styles.priceTitle]}>
                Prix
            </AppText>

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
                            <Shimmer height={22} width="60%" style={styles.fieldGap} />
                            <Shimmer height={8} radius={4} style={styles.fieldGapLg} />
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
                            <SellPriceRange
                                min={sug!.range_min!}
                                max={sug!.range_max!}
                                suggested={sug!.suggested}
                                current={parsePrice(form.price)}
                            />
                            {sug!.suggested != null && (
                                <View style={styles.sugRow}>
                                    <View style={[styles.sugDot, { borderColor: t.colors.brandStrong }]} />
                                    <AppText variant="caption" color="inkMuted">
                                        Prix conseillé : {formatAmount(sug!.suggested)}
                                    </AppText>
                                </View>
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
                        style={styles.priceInput}
                        label={form.listingType === 'exchange' ? 'Prix (optionnel)' : 'Prix'}
                        value={form.price}
                        onChangeText={(v) => updateForm('price', v.replace(/[^\d]/g, ''))}
                        placeholder="0"
                        keyboardType="numeric"
                        error={errors.price}
                        helper={parsePrice(form.price) != null ? formatAmount(parsePrice(form.price)) : undefined}
                        right={<AppText variant="labelStrong" color="inkMuted">FCFA</AppText>}
                        containerStyle={styles.blockTight}
                    />
                    {presets.length > 0 && (
                        <View style={styles.presets} accessibilityLabel="Prix suggérés">
                            {presets.map((n) => (
                                <Chip
                                    key={n}
                                    label={`${n === sugRounded ? 'Conseillé · ' : ''}${formatAmount(n)}`}
                                    selected={parsePrice(form.price) === n}
                                    onPress={() => updateForm('price', String(n))}
                                />
                            ))}
                        </View>
                    )}

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

            <View style={styles.formSection}>
                <AppText variant="h3" accessibilityRole="header" style={styles.chunkTitle}>
                    Remise en main propre
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
            </View>
        </>
    );

    const miniW = Math.min(300, Math.round(winW * 0.78));

    const renderPreview = () => (
        <>
            <SectionTitle
                title="Dernière vérification"
                subtitle="Voici comment les acheteurs verront votre annonce."
            />
            {/* The listing as buyers will see it: the item page in miniature */}
            <Animated.View entering={FLIP_IN} style={styles.previewWrap}>
                <View
                    accessible
                    accessibilityLabel={`Aperçu de l’annonce : ${previewPost.title}`}
                    style={[styles.mini, { width: miniW, backgroundColor: t.colors.surface, borderColor: t.colors.line }]}>
                    <View style={[styles.miniPhoto, { height: Math.round(miniW * 0.8), backgroundColor: t.colors.surfaceAlt }]}>
                        {coverUri ? (
                            <AppImage uri={coverUri} style={StyleSheet.absoluteFill} recyclingKey={`mini-${coverUri}`} />
                        ) : (
                            <Ionicons name="image-outline" size={40} color={t.colors.inkSubtle} />
                        )}
                    </View>
                    <View style={[styles.miniSheet, { backgroundColor: t.colors.surface }]}>
                        <View style={[styles.miniHandle, { backgroundColor: t.colors.line }]} />
                        <View style={styles.row}>
                            <View style={styles.flex}>
                                <Price
                                    amount={previewPost.price}
                                    isFree={previewPost.is_free}
                                    isExchange={!!previewPost.exchange_items}
                                />
                            </View>
                            {previewPost.allow_negotiation && <Badge label="Négociable" tone="brand" />}
                        </View>
                        <AppText variant="labelStrong" numberOfLines={2}>
                            {previewPost.title}
                        </AppText>
                        <View style={styles.miniFacts}>
                            {[
                                { label: 'État', value: conditionLabel(form.condition) ?? '—' },
                                { label: 'Retrait', value: form.pickupQuartier || user?.city || '—' },
                                { label: 'Publié', value: 'À l’instant' },
                            ].map((f) => (
                                <View key={f.label} style={[styles.miniFact, { backgroundColor: t.colors.canvas }]}>
                                    <AppText variant="caption" color="inkSubtle" numberOfLines={1}>
                                        {f.label}
                                    </AppText>
                                    <AppText variant="captionStrong" numberOfLines={1}>
                                        {f.value}
                                    </AppText>
                                </View>
                            ))}
                        </View>
                        <View style={[styles.miniSeller, { borderTopColor: t.colors.line }]}>
                            <Avatar uri={user?.avatar_url ?? null} name={user?.username ?? 'Vous'} size={28} />
                            <AppText variant="captionStrong" numberOfLines={1} style={styles.flex}>
                                {user?.username ?? 'Vous'}
                            </AppText>
                        </View>
                    </View>
                </View>
            </Animated.View>
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
                    onPress={() => setStep(1)}
                />
                <ListRow
                    icon="location-outline"
                    title="Quartier"
                    value={form.pickupQuartier || '—'}
                    onPress={() => setStep(1)}
                    last
                />
            </ListGroup>
        </>
    );

    const isLast = step === STEPS.length - 1;
    const dark = step === 0;
    const onDarkIcon = dark && !t.isDark ? 'surface' : 'ink';
    const nextDisabled = !!nextDisabledReason || aiDraftMut.isPending;
    const nextNote = aiDraftMut.isPending ? 'L’IA prépare votre annonce…' : nextDisabledReason;

    return (
        <View style={[styles.container, { paddingTop: insets.top }, dark && { backgroundColor: cam.bg }]}>
            <StatusBar style={dark || t.isDark ? 'light' : 'dark'} />
            <View style={styles.topRow}>
                <IconButton icon="arrow-back" label="Retour" color={onDarkIcon} onPress={goBack} />
                <AppText variant="bodyStrong" numberOfLines={1} style={[styles.flex, { color: dark ? cam.fg : t.colors.ink }]} accessibilityRole="header">
                    {isEdit ? 'Modifier l’annonce' : 'Vendre un article'}
                </AppText>
                {step > 0 && <IconButton icon="close" label="Fermer" onPress={() => router.back()} />}
            </View>
            <SellProgress steps={STEPS} current={step} onDark={dark} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    ref={scrollRef}
                    style={styles.flex}
                    contentContainerStyle={[styles.scroll, { paddingBottom: dockH + dockBottom(insets.bottom) + t.spacing.md }]}
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
                    <Animated.View key={step} entering={stepEnter(stepDir.current)}>
                        {step === 0 && renderPhotos()}
                        {step === 1 && (
                            <>
                                {renderDetails()}
                                {renderPrice()}
                            </>
                        )}
                        {step === 2 && renderPreview()}
                    </Animated.View>
                </ScrollView>

                {/* Floating action dock (thumb zone, Fitts) */}
                <ActionDock
                    onHeight={setDockH}
                    note={!isLast && nextDisabled ? nextNote : undefined}
                    style={dark ? { borderColor: cam.line } : undefined}>
                    {/* Last step: "Brouillon" replaces "Retour" (the header still goes back). */}
                    {isLast ? (
                        <DockButton
                            label="Brouillon"
                            icon="save-outline"
                            variant="glass"
                            grow={false}
                            onPress={() => submit('draft')}
                            disabled={saving}
                            accessibilityHint="Enregistre l’annonce en brouillon sans la publier"
                        />
                    ) : step > 0 ? (
                        <DockButton label="Retour" variant="glass" grow={false} onPress={goBack} />
                    ) : null}
                    {isLast ? (
                        <DockButton
                            label={isEdit ? 'Mettre à jour' : 'Publier l’annonce'}
                            icon={isEdit ? 'checkmark' : 'rocket-outline'}
                            onPress={() => submit('published')}
                            loading={saving}
                        />
                    ) : (
                        <DockButton
                            label={step === 1 ? 'Voir l’aperçu' : 'Suivant'}
                            iconRight="arrow-forward"
                            onPress={goNext}
                            disabled={nextDisabled}
                            accessibilityHint={nextDisabled ? nextNote : undefined}
                        />
                    )}
                </ActionDock>
            </KeyboardAvoidingView>

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
                emptyText={
                    !user?.city
                        ? 'Ville non définie.'
                        : quartiersData.isLoading
                          ? 'Chargement des quartiers…'
                          : 'Aucun quartier pour votre ville.'
                }
                searchPlaceholder="Rechercher un quartier"
                onClose={() => setSheet(null)}
                onSelect={(v) => updateForm('pickupQuartier', v)}
            />
            <SellCelebration
                visible={!!published}
                title={published?.title ?? ''}
                priceText={published ? publishedPrice(published) : undefined}
                place={published?.pickup_quartier ?? form.pickupQuartier ?? null}
                thumbUri={coverThumb(published?.images) ?? form.images[0] ?? null}
                shareLabel={hasWhatsApp ? 'Partager sur WhatsApp' : 'Partager l’annonce'}
                shareIcon={hasWhatsApp ? 'logo-whatsapp' : 'share-social-outline'}
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
        </View>
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
    chunkTitle: { marginBottom: t.spacing.sm },
    field: { marginBottom: t.spacing.sm },
    fieldLabel: { marginBottom: t.spacing.xs },
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
    photoCell: { borderRadius: t.radius.md, overflow: 'hidden', backgroundColor: t.colors.surfaceAlt },
    photoCellFallback: { width: '31.5%', aspectRatio: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, minHeight: 56 },
    viewfinder: {
        borderRadius: t.radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: t.spacing.sm,
    },
    vfEmpty: { alignItems: 'center', gap: t.spacing.xs, padding: t.spacing.md },
    vfBadge: { position: 'absolute', left: t.spacing.sm, bottom: t.spacing.sm },
    corner: { position: 'absolute', width: 24, height: 24, borderRadius: t.radius.xs },
    shutterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: t.spacing.lg,
        paddingHorizontal: t.spacing.xs,
    },
    camSide: {
        width: 72,
        height: 64,
        borderRadius: t.radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    // The shutter is an icon control, round like a camera's (as avatars/dots).
    shutter: {
        width: 76,
        height: 76,
        borderRadius: t.radius.full,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shutterCore: { width: 60, height: 60, borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
    tabular: { fontVariant: ['tabular-nums'] },
    formSection: {
        marginBottom: t.spacing.lg,
        paddingBottom: t.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.colors.line,
    },
    mini: { borderRadius: t.radius.lg, borderWidth: 1, overflow: 'hidden', ...(t.elevation.card as object) },
    miniPhoto: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    miniSheet: {
        marginTop: -12,
        borderTopLeftRadius: t.radius.lg,
        borderTopRightRadius: t.radius.lg,
        padding: t.spacing.sm,
        paddingTop: t.spacing.xs,
        gap: 4,
    },
    miniHandle: { alignSelf: 'center', width: 28, height: 3, borderRadius: 2, marginBottom: 4 },
    miniFacts: { flexDirection: 'row', gap: 4, marginTop: 4 },
    miniFact: { flex: 1, minWidth: 0, borderRadius: t.radius.sm, paddingHorizontal: 6, paddingVertical: 4 },
    miniSeller: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    catRow: { paddingHorizontal: 0 },
    fieldGapLg: { marginTop: t.spacing.md },
    blockTight: { marginBottom: t.spacing.xs },
    priceInput: { ...t.type.priceLarge, minHeight: 60 },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs, marginBottom: t.spacing.md },
    sugRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, marginTop: 4 },
    sugDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 3 },
    photo: { width: '100%', height: '100%' },
    coverBadge: { position: 'absolute', left: t.spacing.xs, bottom: t.spacing.xs },
    photoRemove: { position: 'absolute', top: 0, right: 0, width: 44, height: 44 },
    photoState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: t.spacing.xs,
        backgroundColor: t.colors.surfaceAlt,
    },
    uploadOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: t.spacing.xs,
        backgroundColor: t.colors.overlay,
    },
    uploadDone: {
        position: 'absolute',
        left: t.spacing.xs,
        top: t.spacing.xs,
        width: 20,
        height: 20,
        borderRadius: t.radius.xs,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.success,
    },
    aiNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: t.spacing.xs },
    aiButton: { marginTop: t.spacing.sm, alignSelf: 'flex-start' },
    aiFallback: { gap: t.spacing.xs, marginTop: t.spacing.sm },
    previewWrap: { alignItems: 'center', marginBottom: t.spacing.lg },
    photoSheet: { gap: t.spacing.sm, paddingBottom: t.spacing.sm },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
    priceTitle: { marginTop: t.spacing.xs, marginBottom: t.spacing.sm },
}));
