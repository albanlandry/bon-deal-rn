// components/atoms/Toast.tsx — themed wrapper around react-native-toast-message
// with an "undo" variant (Doherty: optimistic action + undo instead of confirm).
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { useTheme } from '@/theme';
import AppText from './AppText';

export default Toast;

type Kind = 'success' | 'error' | 'info' | 'undo';

function ToastView({ kind, text1, text2, props, hide }: ToastConfigParams<any> & { kind: Kind; hide: () => void }) {
  const t = useTheme();
  const icon = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle', undo: 'arrow-undo' }[kind];
  const color = { success: t.colors.success, error: t.colors.danger, info: t.colors.trust, undo: t.colors.brandStrong }[kind];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        { backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md },
        t.elevation.sheet as any,
      ]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <View style={styles.text}>
        {!!text1 && <AppText variant="labelStrong">{text1}</AppText>}
        {!!text2 && (
          <AppText variant="caption" color="inkMuted">
            {text2}
          </AppText>
        )}
      </View>
      {kind === 'undo' && props?.onUndo && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Annuler l'action"
          onPress={() => {
            props.onUndo();
            hide();
          }}
          style={styles.undo}>
          <AppText variant="labelStrong" color="brandStrong">
            Annuler
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: (p) => <ToastView {...p} kind="success" hide={() => Toast.hide()} />,
  error: (p) => <ToastView {...p} kind="error" hide={() => Toast.hide()} />,
  info: (p) => <ToastView {...p} kind="info" hide={() => Toast.hide()} />,
  undo: (p) => <ToastView {...p} kind="undo" hide={() => Toast.hide()} />,
};

export const showToast = {
  success: (message: string, description?: string) => {
    Toast.show({ type: 'success', text1: message, text2: description, position: 'top', visibilityTime: 3000 });
  },
  error: (message: string, description?: string) => {
    Toast.show({ type: 'error', text1: message, text2: description, position: 'top', visibilityTime: 4000 });
  },
  info: (message: string, description?: string) => {
    Toast.show({ type: 'info', text1: message, text2: description, position: 'top', visibilityTime: 3000 });
  },
  /** Toast with an "Annuler" action; shown at the bottom, 5 s. */
  undo: (message: string, onUndo: () => void, description?: string) => {
    Toast.show({
      type: 'undo',
      text1: message,
      text2: description,
      position: 'bottom',
      bottomOffset: 96,
      visibilityTime: 5000,
      props: { onUndo },
    });
  },
};

const styles = StyleSheet.create({
  toast: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  text: { flex: 1 },
  undo: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
});
