import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const { changePassword } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setCurrent(''); setNext(''); setConfirm('');
    onClose();
  }

  async function handleSave() {
    if (!current) {
      Alert.alert('Atenção', 'Informe sua senha atual.');
      return;
    }
    if (next.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }
    setSaving(true);
    try {
      const ok = await changePassword(current, next);
      if (!ok) {
        Alert.alert('Senha incorreta', 'A senha atual informada está errada.');
        return;
      }
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      handleClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Alterar senha</ThemedText>
          <Pressable onPress={handleClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <View style={styles.body}>
          <ThemedView type="backgroundElement" style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Senha atual"
              placeholderTextColor={theme.textSecondary}
              value={current}
              onChangeText={setCurrent}
              secureTextEntry
              returnKeyType="next"
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Nova senha (mínimo 6 caracteres)"
              placeholderTextColor={theme.textSecondary}
              value={next}
              onChangeText={setNext}
              secureTextEntry
              returnKeyType="next"
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Confirmar nova senha"
              placeholderTextColor={theme.textSecondary}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </ThemedView>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}>
            <View style={[styles.saveBtnInner, { backgroundColor: theme.text }]}>
              <ThemedText style={[styles.saveBtnText, { color: theme.background }]}>
                {saving ? 'Salvando...' : 'Alterar senha'}
              </ThemedText>
            </View>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  inputWrapper: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: { fontSize: 16, paddingVertical: Spacing.one, letterSpacing: 0 },
  saveBtn: { marginTop: Spacing.two },
  saveBtnInner: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
