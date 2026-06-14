import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useUserData } from '@/context/user-data-context';
import { useTheme } from '@/hooks/use-theme';
import { Appointment } from '@/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function AppointmentCard({ appt }: { appt: Appointment }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: '#25D36622' }]}>
        <SymbolView
          name={{ ios: 'calendar', android: 'event', web: 'event' }}
          size={18}
          tintColor="#25D366"
        />
      </View>
      <View style={styles.cardBody}>
        <ThemedText type="smallBold">{appt.businessName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{appt.serviceName}</ThemedText>
        <ThemedText style={[styles.dateText, { color: theme.textSecondary }]}>
          {formatDate(appt.createdAt)} · {formatTime(appt.createdAt)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function AgendamentosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { appointments } = useUserData();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidth}>
          <ThemedText type="subtitle">Agendamentos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Histórico de serviços solicitados via WhatsApp
          </ThemedText>

          {appointments.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <SymbolView
                name={{ ios: 'calendar.badge.clock', android: 'event_busy', web: 'event_busy' }}
                size={36}
                tintColor="#999"
              />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nenhum agendamento ainda.{'\n'}Agende um serviço via WhatsApp para ver o histórico aqui.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.list}>
              {appointments.map((appt) => (
                <AppointmentCard key={appt.id} appt={appt} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  list: { gap: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: Spacing.one },
  dateText: { fontSize: 12, marginTop: Spacing.one },
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyText: { textAlign: 'center', lineHeight: 20 },
});
