// app/post-item.tsx - Post/Edit Item Screen
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';
import { ApiError } from '@/lib/api';
import {
    createPost,
    updatePost,
    deletePostImage,
    postByIdQuery,
} from '@/lib/api/posts';
import { quartiersQuery } from '@/lib/api/quartiers';
import {
    CATEGORIES,
    CONDITIONS,
    AGE_BUCKETS,
    categoryLabel,
    conditionLabel,
    AGE_LABELS,
} from '@/constants/catalog';
import { useAuth } from '@/contexts/AuthContext';
import type { BdPostImage } from '@/constants/types';

// Renamed from FormData to avoid shadowing the global FormData used for uploads.
interface ListingForm {
    title: string;
    description: string;
    price: string;
    category: string;        // enum value (electronics, ...)
    condition: string;       // enum value (excellent, ...)
    ageBucket: string;       // enum value or ''
    listingType: 'sell' | 'share' | 'exchange';
    exchangeItems: string;   // csv, "Contre quoi ?"
    pickupQuartier: string;
    pickupNote: string;
    images: string[];        // new local URIs to upload (create only)
}

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

/** Strip non-digits from a price string → integer, or null if empty/zero. */
function parsePrice(raw: string): number | null {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return null;
    const n = parseInt(digits, 10);
    return n > 0 ? n : null;
}

const FormHeader = ({ title, onSaveDraft, saving }: { title: string; onSaveDraft: () => void; saving: boolean }) => (
    <View style={styles.header}>
        <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
        >
            <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

        <TouchableOpacity style={styles.saveButton} onPress={onSaveDraft} disabled={saving}>
            <Text style={styles.saveButtonText}>Brouillon</Text>
        </TouchableOpacity>
    </View>
);

const ListingTypeSelector = ({ 
    selectedType, 
    onTypeChange 
}: {
    selectedType: 'sell' | 'share' | 'exchange';
    onTypeChange: (type: 'sell' | 'share' | 'exchange') => void;
}) => (
    <View style={styles.listingTypeContainer}>
        <TouchableOpacity
            style={[
                styles.listingTypeButton,
                selectedType === 'sell' && styles.listingTypeButtonActive
            ]}
            onPress={() => onTypeChange('sell')}
        >
            <Text style={[
                styles.listingTypeText,
                selectedType === 'sell' && styles.listingTypeTextActive
            ]}>
                Vendre
            </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
            style={[
                styles.listingTypeButton,
                selectedType === 'share' && styles.listingTypeButtonActive
            ]}
            onPress={() => onTypeChange('share')}
        >
            <Text style={[
                styles.listingTypeText,
                selectedType === 'share' && styles.listingTypeTextActive
            ]}>
                Partager
            </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
            style={[
                styles.listingTypeButton,
                selectedType === 'exchange' && styles.listingTypeButtonActive
            ]}
            onPress={() => onTypeChange('exchange')}
        >
            <Text style={[
                styles.listingTypeText,
                selectedType === 'exchange' && styles.listingTypeTextActive
            ]}>
                Échanger
            </Text>
        </TouchableOpacity>
    </View>
);

const ImageUploadSection = ({
    existingImages,
    images,
    onAddImage,
    onRemoveImage,
    onRemoveExisting,
    onImagePress,
}: {
    existingImages: BdPostImage[];
    images: string[];
    onAddImage: () => void;
    onRemoveImage: (index: number) => void;
    onRemoveExisting: (image: BdPostImage) => void;
    onImagePress: (index: number) => void;
}) => {
    const total = existingImages.length + images.length;
    return (
        <View style={styles.imageSection}>
            <View style={styles.imageGrid}>
                {/* Already-uploaded images (edit mode) — delete hits the backend */}
                {existingImages.map((img) => (
                    <View key={`ex-${img.id}`} style={styles.imageContainer}>
                        <Image source={{ uri: img.url }} style={styles.uploadedImage} />
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => onRemoveExisting(img)}
                        >
                            <Ionicons name="close" size={16} color="#FF6B6B" />
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Newly-picked local images (create mode) */}
                {images.map((image, index) => (
                    <View key={`new-${index}`} style={styles.imageContainer}>
                        <TouchableOpacity onPress={() => onImagePress(index)} activeOpacity={0.9}>
                            <Image source={{ uri: image }} style={styles.uploadedImage} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => onRemoveImage(index)}
                        >
                            <Ionicons name="close" size={16} color="#FF6B6B" />
                        </TouchableOpacity>
                    </View>
                ))}

                {total < 10 && (
                    <TouchableOpacity style={styles.addImageButton} onPress={onAddImage}>
                        <Ionicons name="camera" size={24} color="#666" />
                        <Text style={styles.addImageText}>{total + 1}/10</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const FormField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    multiline = false,
    required = false,
    keyboardType = 'default'
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    multiline?: boolean;
    required?: boolean;
    keyboardType?: 'default' | 'numeric' | 'phone-pad';
}) => (
    <View style={styles.formField}>
        <Text style={styles.fieldLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
            style={[styles.textInput, multiline && styles.multilineInput]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            multiline={multiline}
            keyboardType={keyboardType}
            placeholderTextColor="#999"
        />
    </View>
);

const PickerField = ({ 
    label, 
    value, 
    onPress, 
    placeholder,
    required = false 
}: {
    label: string;
    value: string;
    onPress: () => void;
    placeholder: string;
    required?: boolean;
}) => (
    <View style={styles.formField}>
        <Text style={styles.fieldLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity style={styles.pickerButton} onPress={onPress}>
            <Text style={[styles.pickerText, !value && styles.placeholderText]}>
                {value || placeholder}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
    </View>
);


const FullscreenCarousel = ({ 
    visible, 
    images, 
    currentIndex, 
    onClose 
}: {
    visible: boolean;
    images: string[];
    currentIndex: number;
    onClose: () => void;
}) => {
    if (!visible) return null;

    return (
        <View style={styles.fullscreenContainer}>
            <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
            >
                <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.fullscreenScrollView}
                contentOffset={{ x: currentIndex * Dimensions.get('window').width, y: 0 }}
            >
                {images.map((image, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.fullscreenImageContainer}
                        onPress={onClose}
                        activeOpacity={1}
                    >
                        <Image source={{ uri: image }} style={styles.fullscreenImage} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
            
            {/* Pagination Dots */}
            <View style={styles.fullscreenPagination}>
                {images.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.fullscreenPaginationDot,
                            index === currentIndex && styles.fullscreenPaginationDotActive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

/** Generic bottom-sheet single-select over {value,label} options. */
const OptionModal = ({
    visible,
    title,
    options,
    selectedValue,
    emptyText,
    onClose,
    onSelect,
}: {
    visible: boolean;
    title: string;
    options: { value: string; label: string }[];
    selectedValue: string;
    emptyText?: string;
    onClose: () => void;
    onSelect: (value: string) => void;
}) => {
    if (!visible) return null;

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalList}>
                    {options.length === 0 && (
                        <Text style={styles.modalEmptyText}>{emptyText || 'Aucune option.'}</Text>
                    )}
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                styles.modalItem,
                                selectedValue === opt.value && styles.modalItemSelected,
                            ]}
                            onPress={() => {
                                onSelect(opt.value);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.modalItemText,
                                selectedValue === opt.value && styles.modalItemTextSelected,
                            ]}>
                                {opt.label}
                            </Text>
                            {selectedValue === opt.value && (
                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

export default function PostItemScreen() {
    const params = useLocalSearchParams<{ id?: string; mode?: string }>();
    const editId = params.id ? Number(params.id) : NaN;
    const isEdit = params.mode === 'edit' && Number.isFinite(editId) && editId > 0;

    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [form, setForm] = useState<ListingForm>({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        ageBucket: '',
        listingType: 'sell',
        exchangeItems: '',
        pickupQuartier: '',
        pickupNote: '',
        images: [],
    });
    const [existingImages, setExistingImages] = useState<BdPostImage[]>([]);

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showConditionModal, setShowConditionModal] = useState(false);
    const [showAgeModal, setShowAgeModal] = useState(false);
    const [showQuartierModal, setShowQuartierModal] = useState(false);
    const [showFullscreenCarousel, setShowFullscreenCarousel] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Edit mode: load the post to prefill, and pull the city's quartiers.
    const editQuery = useQuery(postByIdQuery(isEdit ? editId : 0));
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
            exchangeItems: post.exchange_items ?? '',
            pickupQuartier: post.pickup_quartier ?? '',
            pickupNote: post.pickup_location_note ?? '',
            images: [],
        });
        setExistingImages(post.images ?? []);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editQuery.data?.id, isEdit]);

    const updateForm = (field: keyof ListingForm, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    };

    const buildFormData = (state: 'draft' | 'published'): FormData => {
        const fd = new FormData();
        fd.append('title', form.title.trim());
        fd.append('description', form.description.trim());
        fd.append('state', state);
        fd.append('allow_negotiation', form.listingType === 'sell' ? 'true' : 'false');
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
        form.images.forEach((uri, i) =>
            fd.append('images', { uri, name: `photo_${i}.jpg`, type: 'image/jpeg' } as any),
        );
        return fd;
    };

    const buildPatch = (state: 'draft' | 'published'): Record<string, unknown> => {
        const patch: Record<string, unknown> = {
            title: form.title.trim(),
            description: form.description.trim(),
            state,
            allow_negotiation: form.listingType === 'sell',
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

    const validate = (forPublish: boolean): boolean => {
        const e: Record<string, string> = {};
        if (!form.title.trim()) e.title = 'Le titre est requis';
        if (!form.description.trim()) e.description = 'La description est requise';
        if (forPublish) {
            if (!form.category) e.category = 'La catégorie est requise';
            if (!form.condition) e.condition = "L'état est requis";
            if (form.listingType === 'sell' && parsePrice(form.price) == null)
                e.price = 'Le prix est requis';
            if (form.listingType === 'exchange' && !form.exchangeItems.trim())
                e.exchangeItems = 'Précisez contre quoi échanger';
            if (existingImages.length + form.images.length === 0)
                e.images = 'Au moins une photo est requise';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const createMut = useMutation({
        mutationFn: (state: 'draft' | 'published') => createPost(buildFormData(state)),
        onSuccess: (_post, state) => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            showToast.success(state === 'published' ? 'Annonce publiée' : 'Brouillon enregistré');
            router.back();
        },
        onError: (e) => showToast.error('Échec', errMessage(e)),
    });

    const updateMut = useMutation({
        mutationFn: (state: 'draft' | 'published') => updatePost(editId, buildPatch(state)),
        onSuccess: (_post, state) => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['post', editId] });
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

    const saving = createMut.isPending || updateMut.isPending;

    const pickImage = async (fromCamera: boolean) => {
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
            updateForm('images', [...form.images, result.assets[0].uri]);
        }
    };

    const handleAddImage = async () => {
        // Adding photos while editing is deferred (backend accepts new files only on create).
        if (isEdit) {
            showToast.info?.('Bientôt disponible', 'Ajout de photos en modification bientôt disponible.');
            return;
        }
        if (existingImages.length + form.images.length >= 10) {
            showToast.error('Limite atteinte', 'Maximum 10 photos.');
            return;
        }
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showToast.error('Permission requise', 'Autorisez l’accès à vos photos.');
                return;
            }
            Alert.alert('Ajouter une photo', 'Choisissez une option', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Prendre une photo', onPress: () => pickImage(true) },
                { text: 'Choisir depuis la galerie', onPress: () => pickImage(false) },
            ]);
        } catch {
            showToast.error('Erreur', 'Impossible d’accéder aux photos.');
        }
    };

    const handleRemoveImage = (index: number) => {
        updateForm('images', form.images.filter((_, i) => i !== index));
    };

    const handleRemoveExisting = (img: BdPostImage) => {
        Alert.alert('Supprimer la photo', 'Retirer cette photo de l’annonce ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteImageMut.mutate(img.id) },
        ]);
    };

    const handleImagePress = (index: number) => {
        setCurrentImageIndex(index);
        setShowFullscreenCarousel(true);
    };

    const submit = (state: 'draft' | 'published') => {
        if (!validate(state === 'published')) {
            showToast.error('Formulaire incomplet', 'Veuillez corriger les champs indiqués.');
            return;
        }
        if (isEdit) updateMut.mutate(state);
        else createMut.mutate(state);
    };

    // Edit-mode load guards (all hooks above are already declared).
    if (isEdit && editQuery.isLoading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator color={theme.colors.primary} />
            </SafeAreaView>
        );
    }
    if (isEdit && (editQuery.error || !editQuery.data)) {
        return (
            <SafeAreaView style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
                <Text style={styles.stateText}>Impossible de charger cette annonce.</Text>
                <TouchableOpacity style={styles.stateButton} onPress={() => editQuery.refetch()}>
                    <Text style={styles.stateButtonText}>Réessayer</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const priceEditable = form.listingType !== 'share';

    return (
        <SafeAreaView style={styles.container}>
            <FormHeader
                title={isEdit ? 'Modifier l’annonce' : 'Nouvelle annonce'}
                onSaveDraft={() => submit('draft')}
                saving={saving}
            />

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Title Field */}
                    <View style={styles.formField}>
                        <TextInput
                            style={styles.titleInput}
                            value={form.title}
                            onChangeText={(text) => updateForm('title', text)}
                            placeholder="Titre"
                            placeholderTextColor="#999"
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Description Field */}
                    <View style={styles.formField}>
                        <TextInput
                            style={styles.descriptionInput}
                            value={form.description}
                            onChangeText={(text) => updateForm('description', text)}
                            placeholder="Décrivez votre article : état, marque, taille, raison de la vente…"
                            multiline
                            placeholderTextColor="#999"
                        />
                        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                    </View>

                    {/* Listing Type Selector */}
                    <ListingTypeSelector
                        selectedType={form.listingType}
                        onTypeChange={(type) => updateForm('listingType', type)}
                    />

                    {/* "Contre quoi ?" for exchange listings */}
                    {form.listingType === 'exchange' && (
                        <View style={styles.formField}>
                            <Text style={styles.fieldLabel}>Contre quoi ?</Text>
                            <TextInput
                                style={styles.textInput}
                                value={form.exchangeItems}
                                onChangeText={(text) => updateForm('exchangeItems', text)}
                                placeholder="Ex : téléphone, vélo… (séparés par des virgules)"
                                placeholderTextColor="#999"
                            />
                            {errors.exchangeItems && (
                                <Text style={styles.errorText}>{errors.exchangeItems}</Text>
                            )}
                        </View>
                    )}

                    {/* Image Upload Section */}
                    <ImageUploadSection
                        existingImages={existingImages}
                        images={form.images}
                        onAddImage={handleAddImage}
                        onRemoveImage={handleRemoveImage}
                        onRemoveExisting={handleRemoveExisting}
                        onImagePress={handleImagePress}
                    />
                    {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}

                    {/* TODO(W6): "Suggestions IA" button slot (enabled when ≥1 photo) — ai_draft */}

                    {/* Category Field */}
                    <PickerField
                        label="Catégorie"
                        value={form.category ? categoryLabel(form.category) : ''}
                        onPress={() => setShowCategoryModal(true)}
                        placeholder="Sélectionner une catégorie"
                        required
                    />
                    {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

                    {/* Condition Field */}
                    <PickerField
                        label="État"
                        value={form.condition ? conditionLabel(form.condition) ?? '' : ''}
                        onPress={() => setShowConditionModal(true)}
                        placeholder="Sélectionner l'état"
                        required
                    />
                    {errors.condition && <Text style={styles.errorText}>{errors.condition}</Text>}

                    {/* Age bucket (optional) */}
                    <PickerField
                        label="Ancienneté"
                        value={form.ageBucket ? AGE_LABELS[form.ageBucket] ?? '' : ''}
                        onPress={() => setShowAgeModal(true)}
                        placeholder="Ancienneté de l'article (optionnel)"
                    />

                    {/* Quartier de remise (optional) */}
                    <PickerField
                        label="Quartier de remise"
                        value={form.pickupQuartier}
                        onPress={() => setShowQuartierModal(true)}
                        placeholder={user?.city ? 'Choisir un quartier' : 'Ville non définie'}
                    />

                    {/* Pickup note (optional) */}
                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Point de rencontre</Text>
                        <TextInput
                            style={styles.textInput}
                            value={form.pickupNote}
                            onChangeText={(text) => updateForm('pickupNote', text)}
                            placeholder="Ex : devant la pharmacie, marché… (optionnel)"
                            placeholderTextColor="#999"
                        />
                    </View>
                </ScrollView>

                {/* Bottom Bar */}
                <View style={styles.bottomBar}>
                    {priceEditable ? (
                        <TextInput
                            style={styles.priceInput}
                            value={form.price}
                            onChangeText={(text) => updateForm('price', text)}
                            placeholder={
                                form.listingType === 'exchange' ? 'Prix (optionnel)' : 'Prix en FCFA'
                            }
                            keyboardType="numeric"
                            placeholderTextColor="#999"
                        />
                    ) : (
                        <View style={styles.gratuitBadge}>
                            <Ionicons name="gift-outline" size={18} color={theme.colors.success} />
                            <Text style={styles.gratuitText}>Gratuit</Text>
                        </View>
                    )}
                    {/* TODO(W6): "Prix conseillé" chip slot — price_suggestion */}

                    <TouchableOpacity
                        style={[styles.publishButton, saving && styles.publishButtonDisabled]}
                        onPress={() => submit('published')}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.publishButtonText}>
                                {isEdit ? 'Mettre à jour' : 'Publier'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
                {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </KeyboardAvoidingView>

            <OptionModal
                visible={showCategoryModal}
                title="Sélectionner une catégorie"
                options={CATEGORIES}
                selectedValue={form.category}
                onClose={() => setShowCategoryModal(false)}
                onSelect={(value) => updateForm('category', value)}
            />

            <OptionModal
                visible={showConditionModal}
                title="État de l'article"
                options={CONDITIONS}
                selectedValue={form.condition}
                onClose={() => setShowConditionModal(false)}
                onSelect={(value) => updateForm('condition', value)}
            />

            <OptionModal
                visible={showAgeModal}
                title="Ancienneté"
                options={AGE_BUCKETS}
                selectedValue={form.ageBucket}
                onClose={() => setShowAgeModal(false)}
                onSelect={(value) => updateForm('ageBucket', value)}
            />

            <OptionModal
                visible={showQuartierModal}
                title="Quartier de remise"
                options={quartierOptions}
                selectedValue={form.pickupQuartier}
                emptyText={user?.city ? 'Aucun quartier pour votre ville.' : 'Ville non définie.'}
                onClose={() => setShowQuartierModal(false)}
                onSelect={(value) => updateForm('pickupQuartier', value)}
            />

            <FullscreenCarousel
                visible={showFullscreenCarousel}
                images={form.images}
                currentIndex={currentImageIndex}
                onClose={() => setShowFullscreenCarousel(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.white,
    },
    stateText: {
        fontSize: 15,
        color: '#333',
        marginTop: theme.spacing.md,
        textAlign: 'center',
    },
    stateButton: {
        marginTop: theme.spacing.lg,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: 24,
    },
    stateButtonText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginHorizontal: theme.spacing.sm,
    },
    modalEmptyText: {
        fontSize: 14,
        color: theme.colors.gray,
        padding: theme.spacing.lg,
        textAlign: 'center',
    },
    gratuitBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    gratuitText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.success,
        marginLeft: 6,
    },
    publishButtonDisabled: {
        opacity: 0.6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerButton: {
        padding: theme.spacing.sm,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    section: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: theme.spacing.md,
    },
    imageSection: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: theme.spacing.sm,
    },
    imageContainer: {
        position: 'relative',
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    uploadedImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageButton: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    addImageText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    formField: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: theme.spacing.sm,
    },
    required: {
        color: '#FF6B6B',
    },
    textInput: {
        fontSize: 16,
        color: '#000',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    pickerText: {
        fontSize: 16,
        color: '#000',
    },
    placeholderText: {
        color: '#999',
    },
    errorText: {
        fontSize: 14,
        color: '#FF6B6B',
        marginHorizontal: theme.spacing.md,
        marginTop: -theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    draftButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        marginRight: theme.spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        alignItems: 'center',
    },
    draftButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    publishButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        marginLeft: theme.spacing.sm,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
    },
    publishButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.white,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    modalList: {
        maxHeight: 300,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalItemSelected: {
        backgroundColor: '#f0f8ff',
    },
    modalItemText: {
        fontSize: 16,
        color: '#000',
    },
    modalItemTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    // New styles for reference design
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        marginHorizontal: theme.spacing.md,
    },
    timeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    statusIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    saveButton: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    listingTypeContainer: {
        flexDirection: 'row',
        marginHorizontal: theme.spacing.md,
        marginVertical: theme.spacing.md,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 4,
    },
    listingTypeButton: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        alignItems: 'center',
        borderRadius: 6,
    },
    listingTypeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    listingTypeText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    listingTypeTextActive: {
        color: '#fff',
    },
    titleInput: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    descriptionInput: {
        fontSize: 16,
        color: '#000',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        minHeight: 120,
        textAlignVertical: 'top',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    priceInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: theme.spacing.sm,
        marginRight: theme.spacing.md,
    },
    tagsSection: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.sm,
    },
    selectedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f8ff',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderRadius: 16,
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    selectedTagText: {
        fontSize: 14,
        color: theme.colors.primary,
        marginRight: theme.spacing.sm,
    },
    addTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginRight: theme.spacing.sm,
    },
    addTagButton: {
        padding: theme.spacing.sm,
    },
    suggestionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: theme.spacing.sm,
    },
    suggestionTag: {
        backgroundColor: '#f9f9f9',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        borderRadius: 16,
        marginRight: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    suggestionTagText: {
        fontSize: 14,
        color: '#666',
    },
    // Fullscreen carousel styles
    fullscreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1001,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenScrollView: {
        flex: 1,
    },
    fullscreenImageContainer: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        resizeMode: 'contain',
    },
    fullscreenPagination: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenPaginationDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
    },
    fullscreenPaginationDotActive: {
        backgroundColor: 'white',
    },
});
