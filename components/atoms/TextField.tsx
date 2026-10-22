import React, { forwardRef, useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import AppText from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string | null;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Show "12/80" counter when maxLength is set. */
  showCount?: boolean;
}

/** Label above, helper/error below (inline validation, Norman). */
const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, helper, error, left, right, containerStyle, style, showCount, maxLength, value, onFocus, onBlur, multiline, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? t.colors.danger : focused ? t.colors.brand : t.colors.line;
  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && (
        <AppText variant="labelStrong" color="ink" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            borderRadius: t.radius.sm,
            backgroundColor: t.colors.surface,
            minHeight: multiline ? 104 : 48,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}>
        {left}
        <TextInput
          ref={ref}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          placeholderTextColor={t.colors.inkSubtle}
          selectionColor={t.colors.brandStrong}
          accessibilityLabel={label}
          accessibilityHint={error || helper}
          maxFontSizeMultiplier={1.3}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            t.type.body,
            styles.input,
            { color: t.colors.ink, textAlignVertical: multiline ? 'top' : 'center' },
            style,
          ]}
          {...rest}
        />
        {right}
      </View>
      <View style={styles.below}>
        {error ? (
          <AppText variant="caption" color="danger" style={styles.flex} accessibilityLiveRegion="polite">
            {error}
          </AppText>
        ) : helper ? (
          <AppText variant="caption" color="inkMuted" style={styles.flex}>
            {helper}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        {showCount && maxLength ? (
          <AppText variant="caption" color="inkSubtle">
            {(value ?? '').length}/{maxLength}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  label: { marginBottom: 8 },
  field: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, paddingVertical: 12 },
  below: { flexDirection: 'row', marginTop: 4, minHeight: 16, gap: 8 },
  flex: { flex: 1 },
});
