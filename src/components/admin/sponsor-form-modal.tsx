import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ColorPicker } from '@/components/admin/color-picker';
import { ImagePickerField } from '@/components/admin/image-picker-field';
import { DatePickerField } from '@/components/date-picker-field';
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
  // structured address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [cepLoading, setCepLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
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
      setCep(editing.cep ?? '');
      setStreet(editing.street ?? '');
      setAddressNumber(editing.addressNumber ?? '');
      setNeighborhood(editing.neighborhood ?? '');
      setCity(editing.city ?? '');
      setState(editing.state ?? '');
      setLat(editing.lat);
      setLng(editing.lng);
    } else {
      setName(''); setTagline(''); setColor('#3C9FFE');
      setInstagram(''); setFacebook(''); setWhatsapp(''); setExpiresAt('');
      setImageUri(null);
      setCep(''); setStreet(''); setAddressNumber(''); setNeighborhood('');
      setCity(''); setState(''); setLat(undefined); setLng(undefined);
    }
  }, [editing, visible]);

  async function handleCepChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro ?? '');
          setNeighborhood(data.bairro ?? '');
          setCity(data.localidade ?? '');
          setState(data.uf ?? '');
          setLat(undefined);
          setLng(undefined);
        } else {
          Alert.alert('CEP não encontrado', 'Verifique o CEP informado.');
        }
      } catch {
        Alert.alert('Erro', 'Não foi possível consultar o CEP.');
      } finally {
        setCepLoading(false);
      }
    }
  }

  async function handleNumberBlur() {
    if (!addressNumber.trim() || !street || !city || !state) return;
    const fullAddress = `${street}, ${addressNumber}, ${neighborhood}, ${city}, ${state}, Brasil`;
    setGeoLoading(true);
    try {
      const key = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(fullAddress)}&lang=pt&limit=1&apiKey=${key}`;
      const res = await fetch(url);
      const data = await res.json();
      const feature = data?.features?.[0];
      if (feature) {
        setLat(feature.properties.lat);
        setLng(feature.properties.lon);
      }
    } catch {
      // noop
    } finally {
      setGeoLoading(false);
    }
  }

  async function resolveGeoIfNeeded(): Promise<{ resolvedLat?: number; resolvedLng?: number }> {
    if (lat !== undefined && lng !== undefined) return { resolvedLat: lat, resolvedLng: lng };
    if (!addressNumber.trim() || !street || !city || !state) return {};
    const fullAddress = `${street}, ${addressNumber}, ${neighborhood}, ${city}, ${state}, Brasil`;
    try {
      const key = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(fullAddress)}&lang=pt&limit=1&apiKey=${key}`;
      const res = await fetch(url);
      const json = await res.json();
      const feature = json?.features?.[0];
      if (feature) {
        return { resolvedLat: feature.properties.lat, resolvedLng: feature.properties.lon };
      }
    } catch {
      // noop
    }
    return {};
  }

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
      const { resolvedLat, resolvedLng } = await resolveGeoIfNeeded();

      let imageUrl: string | null | undefined = editing?.imageUrl;
      if (imageUri && !imageUri.startsWith('http')) {
        const path = `sponsors/${Date.now()}.jpg`;
        imageUrl = await uploadImage(imageUri, path);
      } else if (!imageUri) {
        imageUrl = editing?.imageUrl ? null : undefined;
      }

      const addressParts = [street, addressNumber, neighborhood, city, state].filter(Boolean);
      const displayAddress = addressParts.length ? addressParts.join(', ') : undefined;

      const data: Omit<Sponsor, 'id'> = {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        color,
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        whatsapp: whatsapp.trim() ? phoneToStorage(whatsapp) : undefined,
        expiresAt: isoExpiry,
        imageUrl: imageUrl as string | undefined,
        cep: cep.replace(/\D/g, '') || undefined,
        street: street.trim() || undefined,
        addressNumber: addressNumber.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        address: displayAddress,
        lat: resolvedLat,
        lng: resolvedLng,
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

          <FormField label={`CEP${cepLoading ? ' — buscando...' : ''}`}>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="00000-000"
                placeholderTextColor={theme.textSecondary}
                value={cep}
                onChangeText={handleCepChange}
                keyboardType="number-pad"
                maxLength={9}
              />
            </ThemedView>
          </FormField>

          <View style={styles.addressRow}>
            <FormField label="Rua" style={{ flex: 1 }}>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput style={[styles.input, { color: theme.text }]} placeholder="Logradouro"
                  placeholderTextColor={theme.textSecondary} value={street} onChangeText={setStreet} />
              </ThemedView>
            </FormField>
            <FormField label={`Nº${geoLoading ? ' 📍' : lat ? ' ✓' : ''}`} style={{ width: 90 }}>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="123"
                  placeholderTextColor={theme.textSecondary}
                  value={addressNumber}
                  onChangeText={setAddressNumber}
                  onBlur={handleNumberBlur}
                  keyboardType="number-pad"
                />
              </ThemedView>
            </FormField>
          </View>

          <FormField label="Bairro">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Bairro"
                placeholderTextColor={theme.textSecondary} value={neighborhood} onChangeText={setNeighborhood} />
            </ThemedView>
          </FormField>

          <View style={styles.addressRow}>
            <FormField label="Cidade" style={{ flex: 1 }}>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput style={[styles.input, { color: theme.text }]} placeholder="Cidade"
                  placeholderTextColor={theme.textSecondary} value={city} onChangeText={setCity} />
              </ThemedView>
            </FormField>
            <FormField label="UF" style={{ width: 72 }}>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput style={[styles.input, { color: theme.text }]} placeholder="SP"
                  placeholderTextColor={theme.textSecondary} value={state} onChangeText={setState}
                  autoCapitalize="characters" maxLength={2} />
              </ThemedView>
            </FormField>
          </View>

          <FormField label="Validade">
            <DatePickerField value={expiresAt} onChange={setExpiresAt} placeholder="Selecionar data de validade" />
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

function FormField({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
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
  addressRow: { flexDirection: 'row', gap: Spacing.two },
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
