import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ImagePickerField } from '@/components/admin/image-picker-field';
import { TimePickerField } from '@/components/admin/time-picker-field';
import { DatePickerField } from '@/components/date-picker-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { useTheme } from '@/hooks/use-theme';
import { uploadImage } from '@/lib/upload';
import { Business, BusinessHours, Service } from '@/types';

type Props = {
  visible: boolean;
  editing: Business | null;
  onClose: () => void;
};

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const DEFAULT_HOURS: BusinessHours[] = DAYS.map((day, i) => ({
  day,
  morningOpen:    i < 6 ? '08:00' : '',
  morningClose:   i < 6 ? '12:00' : '',
  afternoonOpen:  i < 6 ? '13:00' : '',
  afternoonClose: i < 5 ? '18:00' : i === 5 ? '17:00' : '',
  closed: i === 6,
}));

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

export function BusinessFormModal({ visible, editing, onClose }: Props) {
  const theme = useTheme();
  const { categories, addBusiness, updateBusiness } = useData();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
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
  const [planExpiresAt, setPlanExpiresAt] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [hours, setHours] = useState<BusinessHours[]>(DEFAULT_HOURS);
  const [services, setServices] = useState<{ id: string; name: string; price: string }[]>([
    { id: '1', name: '', price: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const askedReplicate = useRef(false);
  const mondayTouched = useRef(false);

  // Detect when Monday is fully filled and prompt to replicate
  const mon = hours[0];
  useEffect(() => {
    if (!visible) return;
    if (!mondayTouched.current) return;
    if (askedReplicate.current) return;
    if (mon.closed) return;
    if (!mon.morningOpen || !mon.morningClose || !mon.afternoonOpen || !mon.afternoonClose) return;
    askedReplicate.current = true;
    Alert.alert(
      'Replicar horários',
      'Deseja aplicar os mesmos horários da Segunda-feira nos demais dias ativos?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          onPress: () =>
            setHours((prev) =>
              prev.map((h, i) =>
                i === 0 || h.closed
                  ? h
                  : { ...h, morningOpen: mon.morningOpen, morningClose: mon.morningClose, afternoonOpen: mon.afternoonOpen, afternoonClose: mon.afternoonClose }
              )
            ),
        },
      ]
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mon.morningOpen, mon.morningClose, mon.afternoonOpen, mon.afternoonClose, mon.closed]);

  useEffect(() => {
    if (!visible) return;
    askedReplicate.current = false;
    mondayTouched.current = false;
    if (editing) {
      setName(editing.name);
      setCategoryId(editing.categoryId);
      setDescription(editing.description ?? '');
      setWhatsapp(phoneFromStorage(editing.whatsapp));
      setInstagram(editing.instagram ?? '');
      setFacebook(editing.facebook ?? '');
      setCep(editing.cep ?? '');
      setStreet(editing.street ?? '');
      setAddressNumber(editing.addressNumber ?? '');
      setNeighborhood(editing.neighborhood ?? '');
      setCity(editing.city ?? '');
      setState(editing.state ?? '');
      setLat(editing.lat);
      setLng(editing.lng);
      setPlanExpiresAt(parseDate(editing.planExpiresAt));
      setLogoUri(editing.logoUrl ?? null);
      setHours(editing.hours.length ? editing.hours : DEFAULT_HOURS);
      setServices(
        editing.services.length
          ? editing.services.map((s) => ({ id: s.id, name: s.name, price: s.price ?? '' }))
          : [{ id: '1', name: '', price: '' }]
      );
    } else {
      setName(''); setCategoryId(categories[0]?.id ?? '');
      setDescription(''); setWhatsapp(''); setInstagram(''); setFacebook('');
      setCep(''); setStreet(''); setAddressNumber(''); setNeighborhood('');
      setCity(''); setState(''); setLat(undefined); setLng(undefined);
      setPlanExpiresAt('');
      setLogoUri(null);
      setHours(DEFAULT_HOURS);
      setServices([{ id: '1', name: '', price: '' }]);
    }
  }, [editing, visible, categories]);

  function updateHour(index: number, field: keyof BusinessHours, value: string | boolean) {
    if (index === 0) mondayTouched.current = true;
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  }

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
      // noop — lat/lng stays undefined
    } finally {
      setGeoLoading(false);
    }
  }

  function addService() {
    setServices((prev) => [...prev, { id: String(Date.now()), name: '', price: '' }]);
  }

  function removeService(id: string) {
    if (services.length <= 1) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  function updateService(id: string, field: 'name' | 'price', value: string) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
      Alert.alert('Atenção', 'Informe o nome da empresa.');
      return;
    }
    if (!whatsapp.trim()) {
      Alert.alert('Atenção', 'Informe o WhatsApp da empresa.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Atenção', 'Selecione uma categoria.');
      return;
    }
    const isoExpiry = planExpiresAt ? toIso(planExpiresAt) : undefined;
    if (planExpiresAt && !isoExpiry) {
      Alert.alert('Atenção', 'Data de validade inválida. Use DD/MM/AAAA.');
      return;
    }
    const validServices: Service[] = services
      .filter((s) => s.name.trim())
      .map((s, i) => ({ id: String(i + 1), name: s.name.trim(), price: s.price.trim() || undefined }));

    setSaving(true);
    try {
      const { resolvedLat, resolvedLng } = await resolveGeoIfNeeded();

      let logoUrl: string | null | undefined = editing?.logoUrl;
      if (logoUri && !logoUri.startsWith('http')) {
        const path = `businesses/${Date.now()}.jpg`;
        logoUrl = await uploadImage(logoUri, path);
      } else if (!logoUri) {
        logoUrl = editing?.logoUrl ? null : undefined; // null → deleteField() in strip()
      }

      // Compose display address from structured fields
      const addressParts = [street, addressNumber, neighborhood, city, state].filter(Boolean);
      const displayAddress = addressParts.length ? addressParts.join(', ') : undefined;

      const data: Omit<Business, 'id'> = {
        name: name.trim(),
        categoryId,
        description: description.trim() || undefined,
        whatsapp: phoneToStorage(whatsapp),
        instagram: instagram.trim() || undefined,
        facebook: facebook.trim() || undefined,
        cep: cep.replace(/\D/g, '') || undefined,
        street: street.trim() || undefined,
        addressNumber: addressNumber.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        address: displayAddress,
        lat: resolvedLat,
        lng: resolvedLng,
        planExpiresAt: isoExpiry,
        logoUrl: logoUrl as string | undefined,
        hours,
        services: validServices,
      };
      if (editing) {
        await updateBusiness(editing.id, data);
      } else {
        await addBusiness(data);
      }
      onClose();
    } catch (e) {
      console.error('[BusinessForm]', e);
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
            {editing ? 'Editar Empresa' : 'Nova Empresa'}
          </ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <FormField label="Logo da Empresa">
            <ImagePickerField
              uri={logoUri}
              onChange={setLogoUri}
              onClear={() => setLogoUri(null)}
              aspectRatio={1}
              placeholder="Toque para selecionar a logo"
            />
          </FormField>

          <FormField label="Nome *">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, { color: theme.text }]} placeholder="Nome da empresa"
                placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />
            </ThemedView>
          </FormField>

          <FormField label="Categoria *">
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <Pressable key={cat.id} onPress={() => setCategoryId(cat.id)}
                  style={({ pressed }) => pressed && styles.pressed}>
                  <View style={[
                    styles.catChip,
                    categoryId === cat.id
                      ? { backgroundColor: cat.color }
                      : { backgroundColor: cat.color + '22', borderColor: cat.color + '44', borderWidth: 1 },
                  ]}>
                    <ThemedText type="small" style={{
                      color: categoryId === cat.id ? '#fff' : cat.color, fontWeight: '600', fontSize: 12,
                    }}>
                      {cat.name}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          </FormField>

          <FormField label="Descrição">
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput style={[styles.input, styles.multiline, { color: theme.text }]}
                placeholder="Breve descrição da empresa" placeholderTextColor={theme.textSecondary}
                value={description} onChangeText={setDescription} multiline numberOfLines={3} />
            </ThemedView>
          </FormField>

          <FormField label="WhatsApp *">
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

          <FormField label="Validade do Plano">
            <DatePickerField value={planExpiresAt} onChange={setPlanExpiresAt} placeholder="Selecionar data de validade" />
          </FormField>

          {/* Business Hours */}
          <FormField label="Horários de Funcionamento">
            <ThemedView type="backgroundElement" style={styles.hoursCard}>
              {hours.map((hour, i) => (
                <View key={hour.day} style={[styles.hourRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundElement }]}>
                  <View style={styles.hourDayRow}>
                    <ThemedText type="small" style={styles.dayLabel}>{hour.day}</ThemedText>
                    <Switch
                      value={!hour.closed}
                      onValueChange={(v) => updateHour(i, 'closed', !v)}
                      trackColor={{ true: theme.text + '44' }}
                      thumbColor={!hour.closed ? theme.text : theme.textSecondary}
                      style={styles.switch}
                    />
                  </View>
                  {!hour.closed ? (
                    <View style={styles.hourSlots}>
                      <View style={styles.timeRow}>
                        <ThemedText type="small" style={styles.periodLabel}>Manhã</ThemedText>
                        <TimePickerField value={hour.morningOpen} onChange={(v) => updateHour(i, 'morningOpen', v)} placeholder="08:00" />
                        <ThemedText type="small" themeColor="textSecondary">–</ThemedText>
                        <TimePickerField value={hour.morningClose} onChange={(v) => updateHour(i, 'morningClose', v)} placeholder="12:00" />
                      </View>
                      <View style={styles.timeRow}>
                        <ThemedText type="small" style={styles.periodLabel}>Tarde</ThemedText>
                        <TimePickerField value={hour.afternoonOpen} onChange={(v) => updateHour(i, 'afternoonOpen', v)} placeholder="13:00" />
                        <ThemedText type="small" themeColor="textSecondary">–</ThemedText>
                        <TimePickerField value={hour.afternoonClose} onChange={(v) => updateHour(i, 'afternoonClose', v)} placeholder="18:00" />
                      </View>
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.closedLabel}>Fechado</ThemedText>
                  )}
                </View>
              ))}
            </ThemedView>
          </FormField>

          {/* Services */}
          <FormField label="Serviços">
            <View style={styles.servicesSection}>
              {services.map((svc) => (
                <View key={svc.id} style={styles.serviceRow}>
                  <ThemedView type="backgroundElement" style={[styles.inputWrapper, styles.serviceNameInput]}>
                    <TextInput style={[styles.input, { color: theme.text }]} placeholder="Nome do serviço"
                      placeholderTextColor={theme.textSecondary} value={svc.name}
                      onChangeText={(v) => updateService(svc.id, 'name', v)} />
                  </ThemedView>
                  <ThemedView type="backgroundElement" style={[styles.inputWrapper, styles.servicePriceInput]}>
                    <TextInput style={[styles.input, { color: theme.text }]} placeholder="Preço"
                      placeholderTextColor={theme.textSecondary} value={svc.price}
                      onChangeText={(v) => updateService(svc.id, 'price', v)} />
                  </ThemedView>
                  <Pressable onPress={() => removeService(svc.id)} style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView name={{ ios: 'minus.circle.fill', android: 'remove_circle', web: 'remove_circle' }}
                      size={22} tintColor="#FF3B30" />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={addService} style={({ pressed }) => [styles.addServiceBtn, pressed && styles.pressed]}>
                <View style={[styles.addServiceInner, { borderColor: theme.backgroundElement }]}>
                  <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={16} tintColor={theme.text} />
                  <ThemedText type="small">Adicionar serviço</ThemedText>
                </View>
              </Pressable>
            </View>
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
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  catChip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.five },
  hoursCard: { borderRadius: Spacing.two, overflow: 'hidden' },
  hourRow: {
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two,
  },
  hourDayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hourSlots: { gap: Spacing.two },
  dayLabel: { fontWeight: '600', fontSize: 13 },
  switch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  periodLabel: { width: 44, fontWeight: '500', fontSize: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  closedLabel: { textAlign: 'right' },
  servicesSection: { gap: Spacing.two },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  serviceNameInput: { flex: 2 },
  servicePriceInput: { flex: 1 },
  addServiceBtn: {},
  addServiceInner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  saveBtn: { marginTop: Spacing.two },
  saveBtnInner: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
