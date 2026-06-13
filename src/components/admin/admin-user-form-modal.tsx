import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { db } from '@/lib/firebase';
import { useTheme } from '@/hooks/use-theme';

export type AdminUserEntry = {
  phone: string;
  name: string;
};

type Props = {
  visible: boolean;
  editing: AdminUserEntry | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminUserFormModal({ visible, editing, onClose, onSaved }: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      // format stored digits for display
      handlePhoneChange(editing.phone);
      setPassword('');
      setConfirmPassword('');
    } else {
      setName(''); setPhone(''); setPassword(''); setConfirmPassword('');
    }
  }, [editing, visible]);

  function handlePhoneChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) { setPhone(digits); return; }
    if (digits.length <= 7) { setPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`); return; }
    setPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Atenção', 'Informe um número de telefone válido.');
      return;
    }
    if (!editing && password.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password && password !== confirmPassword) {
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const existing = await getDoc(doc(db, 'users', cleanPhone));
      const currentPassword = editing
        ? (existing.exists() ? (existing.data() as { password?: string }).password : '') ?? ''
        : password;

      await setDoc(doc(db, 'users', cleanPhone), {
        name: name.trim(),
        phone: cleanPhone,
        role: 'admin',
        password: password || currentPassword,
      });
      onSaved();
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">
            {editing ? 'Editar Administrador' : 'Novo Administrador'}
          </ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Field label="Nome *">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Nome completo"
                placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName}
                autoCapitalize="words" />
            </ThemedView>
          </Field>

          <Field label="Telefone *">
            <ThemedView type="backgroundElement" style={[styles.inputWrapper, styles.phoneRow]}>
              <ThemedText style={[styles.input, { color: theme.textSecondary }]}>+55</ThemedText>
              <TextInput
                style={[styles.input, styles.phoneInput, { color: editing ? theme.textSecondary : theme.text }]}
                placeholder="(00) 00000-0000"
                placeholderTextColor={theme.textSecondary}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                editable={!editing}
              />
            </ThemedView>
          </Field>

          <Field label={editing ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Mínimo 6 caracteres"
                placeholderTextColor={theme.textSecondary} value={password} onChangeText={setPassword}
                secureTextEntry returnKeyType="next" />
            </ThemedView>
          </Field>

          <Field label="Confirmar Senha">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Repita a senha"
                placeholderTextColor={theme.textSecondary} value={confirmPassword} onChangeText={setConfirmPassword}
                secureTextEntry returnKeyType="done" onSubmitEditing={handleSave} />
            </ThemedView>
          </Field>

          <Pressable onPress={handleSave} disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}>
            <View style={[styles.saveBtnInner, { backgroundColor: theme.text }]}>
              <ThemedText style={[styles.saveBtnText, { color: theme.background }]}>
                {saving ? 'Salvando...' : 'Salvar'}
              </ThemedText>
            </View>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" style={styles.fieldLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two,
  },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  field: { gap: Spacing.two },
  fieldLabel: { fontWeight: '600', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  inputWrapper: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: { fontSize: 16, paddingVertical: Spacing.one },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  phoneInput: { flex: 1 },
  saveBtn: { marginTop: Spacing.two },
  saveBtnInner: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
