/**
 * Home location sheet (docs/11 §4.5): opened from the quartier title. Holds
 * the 3-way feed scope that used to take a full row on Home (Toute la ville /
 * Mon quartier / Près de moi) and the way to change the saved quartier or
 * city (QuartierPickerSheet, opened by the caller).
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import PressableScale from '@/components/motion/PressableScale';
import Sheet from '@/components/motion/Sheet';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export type HomeScope = 'city' | 'quartier' | 'near';

export interface HomeScopeSheetProps {
  visible: boolean;
  onClose: () => void;
  scope: HomeScope;
  /** The caller applies it (asks for the position for "near", opens the
   *  quartier picker when no quartier is saved), as before. */
  onScopeChange: (scope: HomeScope) => void;
  city?: string | null;
  quartier?: string | null;
  nearRadiusKm: number;
  locating?: boolean;
  /** Opens the quartier / city picker. */
  onChangeLocation: () => void;
}

export default function HomeScopeSheet({
  visible,
  onClose,
  scope,
  onScopeChange,
  city,
  quartier,
  nearRadiusKm,
  locating,
  onChangeLocation,
}: HomeScopeSheetProps) {
  const t = useTheme();
  const options: { value: HomeScope; icon: React.ComponentProps<typeof Ionicons>['name']; title: string; hint: string }[] = [
    {
      value: 'city',
      icon: 'business-outline',
      title: 'Toute la ville',
      hint: city ? `Toutes les annonces de ${city}` : 'Toutes les annonces de votre ville',
    },
    {
      value: 'quartier',
      icon: 'home-outline',
      title: quartier || 'Mon quartier',
      hint: quartier ? 'Seulement les annonces de votre quartier' : 'Choisissez d’abord votre quartier',
    },
    {
      value: 'near',
      icon: 'navigate-outline',
      title: locating ? 'Localisation…' : 'Près de moi',
      hint: `À moins de ${nearRadiusKm} km, les plus proches d’abord`,
    },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Zone des annonces"
      footer={
        <Button
          label={city ? 'Changer de quartier ou de ville' : 'Choisir ma ville'}
          icon="location-outline"
          variant="secondary"
          fullWidth
          onPress={onChangeLocation}
        />
      }>
      <View accessibilityRole="radiogroup" accessibilityLabel="Zone des annonces">
        {options.map((o) => {
          const selected = o.value === scope;
          return (
            <PressableScale
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${o.title}. ${o.hint}`}
              scaleTo={0.98}
              onPress={() => {
                haptics.selection();
                onScopeChange(o.value);
              }}
              style={[styles.row, { borderBottomColor: t.colors.line }]}>
              <View style={[styles.icon, { backgroundColor: selected ? t.colors.brandTint : t.colors.surfaceAlt }]}>
                <Ionicons name={o.icon} size={20} color={selected ? t.colors.brandStrong : t.colors.inkMuted} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {o.title}
                </AppText>
                <AppText variant="caption" color="inkMuted" numberOfLines={2}>
                  {o.hint}
                </AppText>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? t.colors.brandStrong : t.colors.inkSubtle}
              />
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
