import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SymbolView } from 'expo-symbols';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerField } from '@/components/date-picker-field';
import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { useTheme } from '@/hooks/use-theme';
import { db } from '@/lib/firebase';
import { Appointment, Business } from '@/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseBR(ddmmyyyy: string): Date | null {
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 2000) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}


function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '');
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length === 11)
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10)
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

function buildPdfHtml(business: Business, appts: Appointment[], leadCount: number, from: string, to: string) {
  const rows = appts
    .map(
      (a) => `
      <tr>
        <td>${formatDateTime(a.createdAt)}</td>
        <td>${a.clientName}</td>
        <td>${formatPhone(a.clientPhone)}</td>
        <td>${a.serviceName}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { font-size: 14px; color: #555; margin-bottom: 24px; }
    .badge { display: inline-block; background: #208AEF; color: #fff;
             border-radius: 6px; padding: 4px 12px; font-size: 18px;
             font-weight: bold; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #208AEF; color: #fff; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f7f7f7; }
    .footer { margin-top: 32px; font-size: 12px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <h1>Relatório de Atendimentos</h1>
  <p class="sub">${business.name} · Período: ${from} até ${to}</p>
  <div style="display:flex;gap:12px;margin-bottom:24px">
    <div class="badge" style="background:#208AEF">${leadCount} visualização${leadCount !== 1 ? 'ões' : ''}</div>
    <div class="badge" style="background:#25D366">${appts.length} contato${appts.length !== 1 ? 's' : ''} WhatsApp</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Data/Hora</th>
        <th>Cliente</th>
        <th>Telefone</th>
        <th>Serviço</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">Gerado pelo Agenday PRO · ${new Date().toLocaleDateString('pt-BR')}</p>
</body>
</html>`;
}

// ─── Picker modal ─────────────────────────────────────────────────────────────

function BusinessPicker({
  visible,
  businesses,
  onSelect,
  onClose,
}: {
  visible: boolean;
  businesses: Business[];
  onSelect: (b: Business) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      businesses.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase())
      ),
    [businesses, search]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={{ flex: 1 }}>
        <View style={pickerStyles.header}>
          <ThemedText type="subtitle">Selecionar empresa</ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <ThemedView type="backgroundElement" style={pickerStyles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>
        <View style={[pickerStyles.searchRow, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={16} tintColor={theme.textSecondary} />
          <TextInput
            style={[pickerStyles.searchInput, { color: theme.text }]}
            placeholder="Buscar empresa..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView contentContainerStyle={pickerStyles.list}>
          {filtered.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => { onSelect(b); onClose(); }}
              style={({ pressed }) => [pickerStyles.item, { borderBottomColor: theme.backgroundElement }, pressed && { opacity: 0.6 }]}>
              <ThemedText>{b.name}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two,
  },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    marginHorizontal: Spacing.four, borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.one },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  item: { paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RelatoriosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { businesses } = useData();

  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leadCount, setLeadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searched, setSearched] = useState(false);

  // Clear results when filters change
  useEffect(() => {
    setAppointments([]);
    setLeadCount(0);
    setSearched(false);
  }, [selectedBusiness?.id, fromDate, toDate]);

  function handleSearch() {
    if (!selectedBusiness) {
      Alert.alert('Atenção', 'Selecione uma empresa.');
      return;
    }
    const from = parseBR(fromDate);
    const to = parseBR(toDate);
    if (!from || !to) {
      Alert.alert('Atenção', 'Informe datas válidas no formato DD/MM/AAAA.');
      return;
    }
    if (from > to) {
      Alert.alert('Atenção', 'A data inicial deve ser anterior à data final.');
      return;
    }

    setLoading(true);
    setSearched(true);

    // Set to to end of day
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const apptQuery = query(
      collection(db, 'appointments'),
      where('businessId', '==', selectedBusiness.id),
      where('createdAt', '>=', from.toISOString()),
      where('createdAt', '<=', toEnd.toISOString()),
      orderBy('createdAt', 'desc')
    );

    const leadsQuery = query(
      collection(db, 'leads'),
      where('businessId', '==', selectedBusiness.id),
      where('createdAt', '>=', from.toISOString()),
      where('createdAt', '<=', toEnd.toISOString())
    );

    let apptDone = false;
    let leadsDone = false;
    function trySetLoaded() {
      if (apptDone && leadsDone) setLoading(false);
    }

    const unsubAppt = onSnapshot(
      apptQuery,
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) })));
        apptDone = true;
        trySetLoaded();
      },
      () => { apptDone = true; trySetLoaded(); }
    );

    const unsubLeads = onSnapshot(
      leadsQuery,
      (snap) => { setLeadCount(snap.size); leadsDone = true; trySetLoaded(); },
      () => { leadsDone = true; trySetLoaded(); }
    );

    return () => { unsubAppt(); unsubLeads(); };
  }

  async function handleExportPdf() {
    if (!selectedBusiness || appointments.length === 0) return;
    setExporting(true);
    try {
      const html = buildPdfHtml(selectedBusiness, appointments, leadCount, fromDate, toDate);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Exportação', `PDF salvo em:\n${uri}`);
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setExporting(false);
    }
  }

  async function handleSendWhatsapp() {
    if (!selectedBusiness || appointments.length === 0) return;
    setExporting(true);
    try {
      const html = buildPdfHtml(selectedBusiness, appointments, leadCount, fromDate, toDate);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Relatório - ${selectedBusiness.name}` });
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o relatório.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.maxWidth}>
          <ThemedText type="subtitle">Relatórios</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Contatos recebidos via WhatsApp por empresa
          </ThemedText>

          {/* Filters */}
          <ThemedView type="backgroundElement" style={styles.filterCard}>
            <ThemedText type="smallBold" style={styles.filterLabel}>EMPRESA</ThemedText>
            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [
                styles.selectBtn,
                { borderColor: theme.backgroundSelected },
                pressed && { opacity: 0.7 },
              ]}>
              <ThemedText style={{ color: selectedBusiness ? theme.text : theme.textSecondary }}>
                {selectedBusiness ? selectedBusiness.name : 'Selecionar empresa...'}
              </ThemedText>
              <SymbolView
                name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Pressable>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <ThemedText type="smallBold" style={styles.filterLabel}>DE</ThemedText>
                <DatePickerField value={fromDate} onChange={setFromDate} placeholder="Data inicial" />
              </View>
              <View style={styles.dateField}>
                <ThemedText type="smallBold" style={styles.filterLabel}>ATÉ</ThemedText>
                <DatePickerField value={toDate} onChange={setToDate} placeholder="Data final" />
              </View>
            </View>

            <Pressable
              onPress={handleSearch}
              disabled={loading}
              style={({ pressed }) => [styles.searchBtn, { backgroundColor: theme.text }, pressed && { opacity: 0.7 }]}>
              <ThemedText style={[styles.searchBtnText, { color: theme.background }]}>
                {loading ? 'Buscando...' : 'Buscar'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Results */}
          {searched && !loading && (
            <>
              {/* Summary */}
              <View style={styles.summaryRow}>
                <ThemedView type="backgroundElement" style={[styles.summaryCard, { flex: 1 }]}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#208AEF22' }]}>
                    <SymbolView
                      name={{ ios: 'eye', android: 'visibility', web: 'visibility' }}
                      size={20}
                      tintColor="#208AEF"
                    />
                  </View>
                  <View>
                    <ThemedText type="subtitle" style={styles.summaryCount}>{leadCount}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">Visualização{leadCount !== 1 ? 'ões' : ''}</ThemedText>
                  </View>
                </ThemedView>
                <ThemedView type="backgroundElement" style={[styles.summaryCard, { flex: 1 }]}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#25D36622' }]}>
                    <SymbolView
                      name={{ ios: 'phone.badge.waveform', android: 'call', web: 'call' }}
                      size={20}
                      tintColor="#25D366"
                    />
                  </View>
                  <View>
                    <ThemedText type="subtitle" style={styles.summaryCount}>{appointments.length}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">WhatsApp</ThemedText>
                  </View>
                </ThemedView>
              </View>

              {/* Export buttons */}
              {appointments.length > 0 && (
                <View style={styles.exportRow}>
                  <Pressable
                    onPress={handleExportPdf}
                    disabled={exporting}
                    style={({ pressed }) => [styles.exportBtn, { borderColor: theme.backgroundSelected }, pressed && { opacity: 0.7 }]}>
                    <SymbolView
                      name={{ ios: 'doc.richtext', android: 'picture_as_pdf', web: 'picture_as_pdf' }}
                      size={18}
                      tintColor={theme.text}
                    />
                    <ThemedText type="smallBold">{exporting ? 'Gerando...' : 'Exportar PDF'}</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleSendWhatsapp}
                    disabled={exporting}
                    style={({ pressed }) => [styles.exportBtn, styles.exportBtnGreen, pressed && { opacity: 0.7 }]}>
                    <SymbolView
                      name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
                      size={18}
                      tintColor="#fff"
                    />
                    <ThemedText style={styles.exportBtnGreenText} type="smallBold">
                      Enviar ao cliente
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {/* Detail list */}
              {appointments.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyState}>
                  <SymbolView
                    name={{ ios: 'doc.text.magnifyingglass', android: 'search_off', web: 'search_off' }}
                    size={36}
                    tintColor="#999"
                  />
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    Nenhum contato encontrado no período.
                  </ThemedText>
                </ThemedView>
              ) : (
                <View style={styles.list}>
                  {appointments.map((appt) => (
                    <ThemedView key={appt.id} type="backgroundElement" style={styles.apptCard}>
                      <View style={styles.apptRow}>
                        <ThemedText type="smallBold">{appt.clientName}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {formatDateTime(appt.createdAt)}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatPhone(appt.clientPhone)} · {appt.serviceName}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <BusinessPicker
        visible={showPicker}
        businesses={businesses}
        onSelect={setSelectedBusiness}
        onClose={() => setShowPicker(false)}
      />

      <StatusBarBlur height={insets.top} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  maxWidth: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  subtitle: { marginTop: -Spacing.two },
  filterCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  filterLabel: {
    fontWeight: '600', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6,
  },
  selectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.two,
  },
  dateRow: { flexDirection: 'row', gap: Spacing.three },
  dateField: { flex: 1, gap: Spacing.one },
  searchBtn: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  searchBtnText: { fontSize: 16, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  summaryCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  summaryIcon: {
    width: 40, height: 40, borderRadius: Spacing.two,
    justifyContent: 'center', alignItems: 'center',
  },
  summaryCount: { fontSize: 24 },
  exportRow: { flexDirection: 'row', gap: Spacing.two },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 2,
  },
  exportBtnGreen: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  exportBtnGreenText: { color: '#fff' },
  list: { gap: Spacing.two },
  apptCard: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  apptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyText: { textAlign: 'center', lineHeight: 20 },
});
