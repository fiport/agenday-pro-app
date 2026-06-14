import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessFormModal } from '@/components/admin/business-form-modal';
import { CategoryFormModal } from '@/components/admin/category-form-modal';
import { SponsorFormModal } from '@/components/admin/sponsor-form-modal';
import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { useTheme } from '@/hooks/use-theme';
import { Business } from '@/types';

// ─── Period helpers ────────────────────────────────────────────────────────────

type PeriodKey = 'prev' | 'curr' | 'next' | 'custom';

function periodBounds(key: PeriodKey, customFrom: Date | null, customTo: Date | null): [Date, Date] | null {
  const now = new Date();
  if (key === 'prev') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return [start, end];
  }
  if (key === 'curr') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return [start, end];
  }
  if (key === 'next') {
    const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    return [start, end];
  }
  if (key === 'custom' && customFrom && customTo) return [customFrom, customTo];
  return null;
}

function parseBR(s: string): Date | null {
  const p = s.split('/');
  if (p.length !== 3) return null;
  const [d, m, y] = p.map(Number);
  if (!d || !m || !y || y < 2000) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}


function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  count,
  color,
  onAdd,
}: {
  icon: { ios: string; android: string; web: string };
  label: string;
  count: number;
  color: string;
  onAdd: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={summaryStyles.card}>
      <View style={summaryStyles.cardTop}>
        <View style={[summaryStyles.iconWrap, { backgroundColor: color + '22' }]}>
          <SymbolView name={icon} size={22} tintColor={color} />
        </View>
        <ThemedText style={summaryStyles.count}>{count}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={summaryStyles.label}>{label}</ThemedText>
      </View>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [summaryStyles.addBtn, { backgroundColor: color + '22' }, pressed && { opacity: 0.6 }]}>
        <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} tintColor={color} />
      </Pressable>
    </ThemedView>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTop: { alignItems: 'center', gap: Spacing.one },
  iconWrap: { width: 44, height: 44, borderRadius: Spacing.two, justifyContent: 'center', alignItems: 'center' },
  count: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  label: { textAlign: 'center', lineHeight: 14, fontSize: 11 },
  addBtn: { marginTop: Spacing.two, borderRadius: 20, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
});

function ExpiringCard({ business, days }: { business: Business; days: number }) {
  const theme = useTheme();
  const isExpired = days < 0;
  const isUrgent = days >= 0 && days <= 7;
  const color = isExpired ? '#FF3B30' : isUrgent ? '#FF9500' : '#34C759';
  const bgColor = color + '18';

  return (
    <ThemedView type="backgroundElement" style={expiryStyles.card}>
      <View style={[expiryStyles.dot, { backgroundColor: color }]} />
      <View style={expiryStyles.info}>
        <ThemedText type="smallBold">{business.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Plano: {formatDate(business.planExpiresAt)}
        </ThemedText>
      </View>
      <View style={[expiryStyles.badge, { backgroundColor: bgColor }]}>
        <ThemedText style={[expiryStyles.badgeText, { color }]}>
          {isExpired
            ? `${Math.abs(days)}d vencido`
            : days === 0
            ? 'Vence hoje'
            : `${days}d`}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const expiryStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Spacing.two,
    padding: Spacing.three, gap: Spacing.two,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info: { flex: 1 },
  badge: { borderRadius: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});

// ─── Period pill ──────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'prev', label: 'Mês anterior' },
  { key: 'curr', label: 'Mês atual' },
  { key: 'next', label: 'Próximo mês' },
  { key: 'custom', label: 'Personalizado' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

import { DatePickerField } from '@/components/date-picker-field';

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sponsors, businesses, categories } = useData();

  const [period, setPeriod] = useState<PeriodKey>('curr');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [sponsorModal, setSponsorModal] = useState(false);
  const [businessModal, setBusinessModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const bounds = useMemo(() => {
    const cf = period === 'custom' ? parseBR(customFrom) : null;
    const ct = period === 'custom' ? parseBR(customTo) : null;
    return periodBounds(period, cf, ct);
  }, [period, customFrom, customTo]);

  const expiringBusinesses = useMemo(() => {
    if (!bounds) return [];
    const [start, end] = bounds;
    return businesses
      .filter((b) => {
        if (!b.planExpiresAt) return false;
        const exp = new Date(b.planExpiresAt);
        return exp >= start && exp <= end;
      })
      .sort((a, b) => new Date(a.planExpiresAt!).getTime() - new Date(b.planExpiresAt!).getTime());
  }, [businesses, bounds]);

  // Also show already-expired businesses regardless of period
  const expiredOutsidePeriod = useMemo(() => {
    if (!bounds) return [];
    const [start] = bounds;
    return businesses.filter((b) => {
      if (!b.planExpiresAt) return false;
      const exp = new Date(b.planExpiresAt);
      return exp < start && exp < new Date();
    });
  }, [businesses, bounds]);

  const allExpiring = [...expiringBusinesses, ...expiredOutsidePeriod];

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
          <ThemedText type="subtitle">Dashboard</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Visão geral do aplicativo
          </ThemedText>

          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <SummaryCard
              icon={{ ios: 'star.fill', android: 'star', web: 'star' }}
              label="Patrocinadores"
              count={sponsors.length}
              color="#FF9500"
              onAdd={() => setSponsorModal(true)}
            />
            <SummaryCard
              icon={{ ios: 'building.2.fill', android: 'business', web: 'business' }}
              label="Empresas"
              count={businesses.length}
              color="#208AEF"
              onAdd={() => setBusinessModal(true)}
            />
            <SummaryCard
              icon={{ ios: 'tag.fill', android: 'label', web: 'label' }}
              label="Categorias"
              count={categories.length}
              color="#34C759"
              onAdd={() => setCategoryModal(true)}
            />
          </View>

          {/* Period filter */}
          <ThemedView type="backgroundElement" style={styles.filterCard}>
            <ThemedText type="smallBold" style={styles.filterLabel}>PLANOS EXPIRANDO</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
              {PERIOD_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setPeriod(opt.key)}
                  style={({ pressed }) => [
                    styles.pill,
                    period === opt.key && { backgroundColor: theme.text },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <ThemedText
                    style={[styles.pillText, { color: period === opt.key ? theme.background : theme.textSecondary }]}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {period === 'custom' && (
              <View style={styles.customDateRow}>
                <View style={styles.dateField}>
                  <ThemedText type="small" themeColor="textSecondary">De</ThemedText>
                  <DatePickerField value={customFrom} onChange={setCustomFrom} placeholder="Data inicial" />
                </View>
                <View style={styles.dateField}>
                  <ThemedText type="small" themeColor="textSecondary">Até</ThemedText>
                  <DatePickerField value={customTo} onChange={setCustomTo} placeholder="Data final" />
                </View>
              </View>
            )}
          </ThemedView>

          {/* Expiring list */}
          {allExpiring.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <SymbolView
                name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
                size={32}
                tintColor="#34C759"
              />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nenhum plano expirando no período.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.expiryList}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.expiryCount}>
                {allExpiring.length} empresa{allExpiring.length !== 1 ? 's' : ''} com plano no período
              </ThemedText>
              {allExpiring.map((b) => (
                <ExpiringCard key={b.id} business={b} days={daysUntil(b.planExpiresAt) ?? 0} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <SponsorFormModal visible={sponsorModal} editing={null} onClose={() => setSponsorModal(false)} />
      <BusinessFormModal visible={businessModal} editing={null} onClose={() => setBusinessModal(false)} />
      <CategoryFormModal visible={categoryModal} editing={null} onClose={() => setCategoryModal(false)} />

      <StatusBarBlur height={insets.top} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  maxWidth: {
    flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, gap: Spacing.three,
  },
  subtitle: { marginTop: -Spacing.two },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  filterCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  filterLabel: { fontWeight: '600', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  pillRow: { flexDirection: 'row', gap: Spacing.two },
  pill: {
    borderRadius: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2,
    backgroundColor: 'transparent', borderWidth: 1, borderColor: 'transparent',
  },
  pillText: { fontSize: 13, fontWeight: '500' },
  customDateRow: { flexDirection: 'row', gap: Spacing.three },
  dateField: { flex: 1, gap: Spacing.one },
  expiryList: { gap: Spacing.two },
  expiryCount: { marginBottom: -Spacing.one },
  emptyState: {
    borderRadius: Spacing.three, padding: Spacing.five, alignItems: 'center', gap: Spacing.three,
  },
  emptyText: { textAlign: 'center' },
});
