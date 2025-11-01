// app/post-item.tsx - Post/Edit Item Screen
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';

interface FormData {
    title: string;
    description: string;
    price: string;
    category: string;
    condition: string;
    listingType: 'sell' | 'share' | 'exchange';
    tags: string[];
    images: string[];
}

const categories = [
    'Électronique',
    'Vêtements',
    'Maison & Jardin',
    'Véhicules',
    'Immobilier',
    'Sports & Loisirs',
    'Livres & Médias',
    'Autres',
];

const conditions = [
    'Neuf',
    'Très bon état',
    'Bon état',
    'État correct',
    'À réparer',
];

const popularTags = [
    'Urgent',
    'Bon prix',
    'Négociable',
    'Livraison',
    'Échange possible',
    'Comme neuf',
    'Rare',
    'Collection',
    'Vintage',
    'Moderne',
];

const FormHeader = ({ onSaveDraft }: { onSaveDraft: () => void }) => (
    <View style={styles.header}>
        <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
        >
            <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.saveButton} onPress={onSaveDraft}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
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

const ImageUploadSection = ({ images, onAddImage, onRemoveImage, onImagePress }: {
    images: string[];
    onAddImage: () => void;
    onRemoveImage: (index: number) => void;
    onImagePress: (index: number) => void;
}) => (
    <View style={styles.imageSection}>
        <View style={styles.imageGrid}>
            {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                    <TouchableOpacity 
                        onPress={() => onImagePress(index)}
                        activeOpacity={0.9}
                    >
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
            
            {images.length < 10 && (
                <TouchableOpacity style={styles.addImageButton} onPress={onAddImage}>
                    <Ionicons name="camera" size={24} color="#666" />
                    <Text style={styles.addImageText}>{images.length + 1}/10</Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

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

const TagsSection = ({ 
    selectedTags, 
    onAddTag, 
    onRemoveTag 
}: {
    selectedTags: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
}) => {
    const [newTag, setNewTag] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleAddTag = () => {
        if (newTag.trim() && selectedTags.length < 5 && !selectedTags.includes(newTag.trim())) {
            onAddTag(newTag.trim());
            setNewTag('');
            setShowSuggestions(false);
        }
    };

    const availableSuggestions = popularTags.filter(tag => 
        !selectedTags.includes(tag) && 
        tag.toLowerCase().includes(newTag.toLowerCase())
    );

    return (
        <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <Text style={styles.sectionSubtitle}>Maximum 5 tags ({selectedTags.length}/5)</Text>
            
            {/* Selected Tags */}
            <View style={styles.selectedTagsContainer}>
                {selectedTags.map((tag, index) => (
                    <View key={index} style={styles.selectedTag}>
                        <Text style={styles.selectedTagText}>{tag}</Text>
                        <TouchableOpacity onPress={() => onRemoveTag(tag)}>
                            <Ionicons name="close" size={16} color="#666" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Add New Tag */}
            {selectedTags.length < 5 && (
                <View style={styles.addTagContainer}>
                    <TextInput
                        style={styles.tagInput}
                        value={newTag}
                        onChangeText={(text) => {
                            setNewTag(text);
                            setShowSuggestions(text.length > 0);
                        }}
                        placeholder="Ajouter un tag..."
                        placeholderTextColor="#999"
                        onSubmitEditing={handleAddTag}
                    />
                    <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                        <Ionicons name="add" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Tag Suggestions */}
            {showSuggestions && availableSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    {availableSuggestions.slice(0, 3).map((tag, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.suggestionTag}
                            onPress={() => {
                                onAddTag(tag);
                                setNewTag('');
                                setShowSuggestions(false);
                            }}
                        >
                            <Text style={styles.suggestionTagText}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

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

const CategoryModal = ({ 
    visible, 
    onClose, 
    onSelect, 
    selectedCategory 
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (category: string) => void;
    selectedCategory: string;
}) => {
    if (!visible) return null;

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Sélectionner une catégorie</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalList}>
                    {categories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.modalItem,
                                selectedCategory === category && styles.modalItemSelected
                            ]}
                            onPress={() => {
                                onSelect(category);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.modalItemText,
                                selectedCategory === category && styles.modalItemTextSelected
                            ]}>
                                {category}
                            </Text>
                            {selectedCategory === category && (
                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
};

const ConditionModal = ({ 
    visible, 
    onClose, 
    onSelect, 
    selectedCondition 
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (condition: string) => void;
    selectedCondition: string;
}) => {
    if (!visible) return null;

    return (
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>État de l'article</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalList}>
                    {conditions.map((condition) => (
                        <TouchableOpacity
                            key={condition}
                            style={[
                                styles.modalItem,
                                selectedCondition === condition && styles.modalItemSelected
                            ]}
                            onPress={() => {
                                onSelect(condition);
                                onClose();
                            }}
                        >
                            <Text style={[
                                styles.modalItemText,
                                selectedCondition === condition && styles.modalItemTextSelected
                            ]}>
                                {condition}
                            </Text>
                            {selectedCondition === condition && (
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
    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        listingType: 'sell',
        tags: [],
        images: [],
    });

    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showConditionModal, setShowConditionModal] = useState(false);
    const [showFullscreenCarousel, setShowFullscreenCarousel] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateFormData = (field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = 'Le titre est requis';
        if (!formData.description.trim()) newErrors.description = 'La description est requise';
        if (!formData.price.trim()) newErrors.price = 'Le prix est requis';
        if (!formData.category) newErrors.category = 'La catégorie est requise';
        if (!formData.condition) newErrors.condition = 'L\'état est requis';
        if (formData.images.length === 0) newErrors.images = 'Au moins une photo est requise';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAddImage = async () => {
        try {
            // Request camera/media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showToast.error('Permission requise', 'Nous avons besoin de votre permission pour accéder à vos photos.');
                return;
            }

            // Show action sheet for camera or gallery
            Alert.alert(
                'Ajouter une photo',
                'Choisissez une option',
                [
                    {
                        text: 'Annuler',
                        style: 'cancel',
                    },
                    {
                        text: 'Prendre une photo',
                        onPress: async () => {
                            const result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsEditing: true,
                                aspect: [4, 3],
                                quality: 0.8,
                            });

                            if (!result.canceled && result.assets[0]) {
                                updateFormData('images', [...formData.images, result.assets[0].uri]);
                            }
                        },
                    },
                    {
                        text: 'Choisir depuis la galerie',
                        onPress: async () => {
                            const result = await ImagePicker.launchImageLibraryAsync({
                                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                allowsMultipleSelection: false,
                                allowsEditing: true,
                                aspect: [4, 3],
                                quality: 0.8,
                            });

                            if (!result.canceled && result.assets[0]) {
                                if (formData.images.length >= 10) {
                                    showToast.error('Limite atteinte', 'Vous pouvez ajouter un maximum de 10 photos.');
                                    return;
                                }
                                updateFormData('images', [...formData.images, result.assets[0].uri]);
                                showToast.success('Photo ajoutée', 'La photo a été ajoutée avec succès.');
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            showToast.error('Erreur', 'Impossible d\'accéder aux photos. Veuillez réessayer.');
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = formData.images.filter((_, i) => i !== index);
        updateFormData('images', newImages);
    };

    const handleAddTag = (tag: string) => {
        if (!formData.tags.includes(tag) && formData.tags.length < 5) {
            updateFormData('tags', [...formData.tags, tag]);
        }
    };

    const handleRemoveTag = (tag: string) => {
        const newTags = formData.tags.filter(t => t !== tag);
        updateFormData('tags', newTags);
    };

    const handleImagePress = (index: number) => {
        setCurrentImageIndex(index);
        setShowFullscreenCarousel(true);
    };

    const handleCloseFullscreen = () => {
        setShowFullscreenCarousel(false);
    };

    const handleSaveDraft = () => {
        // TODO: Save draft to API
        showToast.success('Brouillon sauvegardé', 'Votre article a été sauvegardé comme brouillon.');
    };

    const handlePublish = () => {
        if (validateForm()) {
            // TODO: Publish to API
            showToast.success('Article publié', 'Votre article a été publié avec succès!');
            router.back();
        } else {
            showToast.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <FormHeader onSaveDraft={handleSaveDraft} />
            
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
                            value={formData.title}
                            onChangeText={(text) => updateFormData('title', text)}
                            placeholder="Titre"
                            placeholderTextColor="#999"
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Description Field */}
                    <View style={styles.formField}>
                        <TextInput
                            style={styles.descriptionInput}
                            value={formData.description}
                            onChangeText={(text) => updateFormData('description', text)}
                            placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore... et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercita..."
                            multiline
                            placeholderTextColor="#999"
                        />
                        {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                    </View>

                    {/* Listing Type Selector */}
                    <ListingTypeSelector
                        selectedType={formData.listingType}
                        onTypeChange={(type) => updateFormData('listingType', type)}
                    />

                    {/* Image Upload Section */}
                    <ImageUploadSection
                        images={formData.images}
                        onAddImage={handleAddImage}
                        onRemoveImage={handleRemoveImage}
                        onImagePress={handleImagePress}
                    />
                    {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}

                    {/* Category Field */}
                    <PickerField
                        label="Catégorie"
                        value={formData.category}
                        onPress={() => setShowCategoryModal(true)}
                        placeholder="Sélectionner une catégorie"
                        required
                    />
                    {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

                    {/* Condition Field */}
                    <PickerField
                        label="État"
                        value={formData.condition}
                        onPress={() => setShowConditionModal(true)}
                        placeholder="Sélectionner l'état"
                        required
                    />
                    {errors.condition && <Text style={styles.errorText}>{errors.condition}</Text>}

                    {/* Tags Section */}
                    <TagsSection
                        selectedTags={formData.tags}
                        onAddTag={handleAddTag}
                        onRemoveTag={handleRemoveTag}
                    />
                </ScrollView>

                {/* Bottom Bar */}
                <View style={styles.bottomBar}>
                    <TextInput
                        style={styles.priceInput}
                        value={formData.price}
                        onChangeText={(text) => updateFormData('price', text)}
                        placeholder="350000 FCFA"
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                    />
                    {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
                    
                    <TouchableOpacity 
                        style={styles.publishButton}
                        onPress={handlePublish}
                    >
                        <Text style={styles.publishButtonText}>Publier</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <CategoryModal
                visible={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                onSelect={(category) => updateFormData('category', category)}
                selectedCategory={formData.category}
            />

            <ConditionModal
                visible={showConditionModal}
                onClose={() => setShowConditionModal(false)}
                onSelect={(condition) => updateFormData('condition', condition)}
                selectedCondition={formData.condition}
            />

            <FullscreenCarousel
                visible={showFullscreenCarousel}
                images={formData.images}
                currentIndex={currentImageIndex}
                onClose={handleCloseFullscreen}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
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
