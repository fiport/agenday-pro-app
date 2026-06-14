import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekDay(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sun
}

function parseDDMMYYYY(s: string): { d: number; m: number; y: number } | null {
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 2000) return null;
  return { d, m: m - 1, y };
}

function formatDDMMYYYY(d: number, m: number, y: number) {
  return `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`;
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

type CalendarProps = {
  year: number;
  month: number;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

function CalendarGrid({ year, month, selectedDay, onSelectDay, onPrevMonth, onNextMonth }: CalendarProps) {
  const theme = useTheme();
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const leading = firstWeekDay(year, month);
  const total = daysInMonth(year, month);

  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={gridStyles.root}>
      {/* Header */}
      <View style={gridStyles.header}>
        <Pressable onPress={onPrevMonth} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18} tintColor={theme.text}
          />
        </Pressable>
        <ThemedText style={gridStyles.monthTitle}>
          {MONTHS[month]} {year}
        </ThemedText>
        <Pressable onPress={onNextMonth} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={18} tintColor={theme.text}
          />
        </Pressable>
      </View>

      {/* Week day labels */}
      <View style={gridStyles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <ThemedText key={i} style={[gridStyles.weekDay, { color: theme.textSecondary }]}>
            {d}
          </ThemedText>
        ))}
      </View>

      {/* Days */}
      {weeks.map((week, wi) => (
        <View key={wi} style={gridStyles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={gridStyles.dayCell} />;

            const isSelected = day === selectedDay;
            const isToday = day === todayD && month === todayM && year === todayY;

            return (
              <Pressable
                key={di}
                onPress={() => onSelectDay(day)}
                style={({ pressed }) => [gridStyles.dayCell, pressed && { opacity: 0.6 }]}>
                <View style={[
                  gridStyles.dayInner,
                  isSelected && { backgroundColor: '#208AEF' },
                  !isSelected && isToday && { borderWidth: 1.5, borderColor: '#208AEF' },
                ]}>
                  <ThemedText style={[
                    gridStyles.dayText,
                    isSelected && { color: '#fff', fontWeight: '700' },
                    !isSelected && isToday && { color: '#208AEF', fontWeight: '600' },
                    !isSelected && !isToday && { color: theme.text },
                  ]}>
                    {day}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const gridStyles = StyleSheet.create({
  root: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.three, paddingHorizontal: Spacing.one,
  },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: Spacing.two },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayInner: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14 },
});

// ─── Public component ─────────────────────────────────────────────────────────

type Props = {
  value: string; // DD/MM/AAAA or ''
  onChange: (date: string) => void;
  placeholder?: string;
};

export function DatePickerField({ value, onChange, placeholder = 'Selecionar data' }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const today = new Date();
  const parsed = parseDDMMYYYY(value);

  const [viewYear, setViewYear] = useState(parsed?.y ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? today.getMonth());

  // Sync calendar view when value changes externally
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    }
  }, [value]);

  function handleOpen() {
    // Reset view to selected date or today on open
    if (parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setOpen(true);
  }

  function handlePrev() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function handleNext() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleSelect(day: number) {
    onChange(formatDDMMYYYY(day, viewMonth, viewYear));
    setOpen(false);
  }

  function handleClear() {
    onChange('');
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
          size={14}
          tintColor={value ? theme.text : theme.textSecondary}
        />
        <ThemedText style={[styles.triggerText, { color: value ? theme.text : theme.textSecondary }]}>
          {value || placeholder}
        </ThemedText>
        {value ? (
          <Pressable onPress={handleClear} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={14}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        ) : (
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
            size={10}
            tintColor={theme.textSecondary}
          />
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <ThemedView type="backgroundElement" style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold">Selecionar data</ThemedText>
            <Pressable onPress={() => setOpen(false)} style={({ pressed }) => pressed && styles.pressed}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={22}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <CalendarGrid
            year={viewYear}
            month={viewMonth}
            selectedDay={parsed && parsed.m === viewMonth && parsed.y === viewYear ? parsed.d : null}
            onSelectDay={handleSelect}
            onPrevMonth={handlePrev}
            onNextMonth={handleNext}
          />
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    borderWidth: 1,
  },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '500' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center', marginTop: Spacing.two,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.6 },
});
