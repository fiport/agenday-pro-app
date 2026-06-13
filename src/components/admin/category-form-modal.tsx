import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ColorPicker } from '@/components/admin/color-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { useTheme } from '@/hooks/use-theme';
import { Category } from '@/types';

type Props = {
  visible: boolean;
  editing: Category | null;
  onClose: () => void;
};

export function CategoryFormModal({ visible, editing, onClose }: Props) {
  const theme = useTheme();
  const { addCategory, updateCategory } = useData();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#3C9FFE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setColor(editing.color);
    } else {
      setName('');
      setColor('#3C9FFE');
    }
  }, [editing, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), color });
      } else {
        await addCategory({ name: name.trim(), color });
      }
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
            {editing ? 'Editar Categoria' : 'Nova Categoria'}
          </ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <FormField label="Nome">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Ex: Beleza & Estética"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </ThemedView>
          </FormField>

          <FormField label="Cor">
            <ColorPicker value={color} onChange={setColor} />
          </FormField>

          <Pressable
            onPress={handleSave}
            disabled={saving}
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  field: { gap: Spacing.two },
  fieldLabel: { fontWeight: '600', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  inputWrapper: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: { fontSize: 16, paddingVertical: Spacing.one },
  saveBtn: { marginTop: Spacing.two },
  saveBtnInner: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
