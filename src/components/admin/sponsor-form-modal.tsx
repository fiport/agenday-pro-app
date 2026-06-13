import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ColorPicker } from '@/components/admin/color-picker';
import { ImagePickerField } from '@/components/admin/image-picker-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { useTheme } from '@/hooks/use-theme';
import { uploadImage } from '@/lib/upload';
import { Sponsor } from '@/types';

type Props = {
  visible: boolean;
  editing: Sponsor | null;
  onClose: () => void;
};

function parseDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function toIso(ddmmyyyy: string): string | undefined {
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 2000) return undefined;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDateInput(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatPhoneDisplay(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function phoneToStorage(display: string) {
  return '55' + display.replace(/\D/g, '');
}

function phoneFromStorage(stored?: string) {
  if (!stored) return '';
  const digits = stored.replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return formatPhoneDisplay(local);
}

export function SponsorFormModal({ visible, editing, onClose }: Props) {
  const theme = useTheme();
  const { addSponsor, updateSponsor } = useData();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [color, setColor] = useState('#3C9FFE');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setTagline(editing.tagline ?? '');
      setColor(editing.color);
      setInstagram(editing.instagram ?? '');
      setFacebook(editing.facebook ?? '');
      setWhatsapp(phoneFromStorage(editing.whatsapp));
      setExpiresAt(parseDate(editing.expiresAt));
      setImageUri(editing.imageUrl ?? null);
    } else {
      setName(''); setTagline(''); setColor('#3C9FFE');
      setInstagram(''); setFacebook(''); setWhatsapp(''); setExpiresAt('');
      setImageUri(null);
    }
  }, [editing, visible]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do patrocinador.');
      return;
    }
    const isoExpiry = expiresAt ? toIso(expiresAt) : undefined;
    if (expiresAt && !isoExpiry) {
      Alert.alert('Atenção', 'Data de validade inválida. Use DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | null | undefined = editing?.imageUrl;
      if (imageUri && !imageUri.startsWith('http')) {
        const path = `sponsors/${Date.now()}.jpg`;
        imageUrl = await uploadImage(imageUri, path);
      } else if (!imageUri) {
        imageUrl = editing?.imageUrl ? null : undefined; // null → deleteField() in strip()
      }

      const data: Omit<Sponsor, 'id'> = {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        color,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        whatsapp: whatsapp.trim() ? phoneToStorage(whatsapp) : undefined,
        expiresAt: isoExpiry,
        imageUrl: imageUrl as string | undefined,
      };
      if (editing) {
        await updateSponsor(editing.id, data);
      } else {
        await addSponsor(data);
      }
      onClose();
    } catch (e) {
      console.error('[SponsorForm]', e);
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Erro ao salvar', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">
            {editing ? 'Editar Patrocinador' : 'Novo Patrocinador'}
          </ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <FormField label="Nome *">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Nome do patrocinador"
                placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />
            </ThemedView>
          </FormField>

          <FormField label="Tagline">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Slogan ou descrição curta"
                placeholderTextColor={theme.textSecondary} value={tagline} onChangeText={setTagline} />
            </ThemedView>
          </FormField>

          <FormField label="Imagem do Banner">
            <ImagePickerField
              uri={imageUri}
              onChange={setImageUri}
              onClear={() => setImageUri(null)}
              aspectRatio={16 / 6}
              placeholder="Toque para selecionar a imagem do banner"
            />
          </FormField>

          <FormField label="Cor de Fundo (quando sem imagem)">
            <ColorPicker value={color} onChange={setColor} />
          </FormField>

          <FormField label="Instagram">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="usuario (sem @)"
                placeholderTextColor={theme.textSecondary} value={instagram} onChangeText={setInstagram}
                autoCapitalize="none" />
            </ThemedView>
          </FormField>

          <FormField label="Facebook">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="usuario ou página"
                placeholderTextColor={theme.textSecondary} value={facebook} onChangeText={setFacebook}
                autoCapitalize="none" />
            </ThemedView>
          </FormField>

          <FormField label="WhatsApp">
            <ThemedView type="backgroundElement" style={[styles.inputWrapper, styles.phoneRow]}>
              <ThemedText style={[styles.input, { color: theme.textSecondary }]}>+55</ThemedText>
              <TextInput
                style={[styles.input, styles.phoneInput, { color: theme.text }]}
                placeholder="(00) 00000-0000"
                placeholderTextColor={theme.textSecondary}
                value={whatsapp}
                onChangeText={(t) => setWhatsapp(formatPhoneDisplay(t))}
                keyboardType="phone-pad"
              />
            </ThemedView>
          </FormField>

          <FormField label="Validade (DD/MM/AAAA)">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="31/12/2025"
                placeholderTextColor={theme.textSecondary} value={expiresAt}
                onChangeText={(t) => setExpiresAt(formatDateInput(t))} keyboardType="number-pad" />
            </ThemedView>
          </FormField>

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
