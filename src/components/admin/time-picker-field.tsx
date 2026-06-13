import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TIMES: string[] = [];
for (let h = 5; h <= 23; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 23) TIMES.push(`${String(h).padStart(2, '0')}:30`);
}

type Props = {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
};

export function TimePickerField({ value, onChange, placeholder = '—' }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={[styles.triggerText, { color: value ? theme.text : theme.textSecondary }]}>
          {value || placeholder}
        </ThemedText>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={10}
          tintColor={theme.textSecondary}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <ThemedView type="backgroundElement" style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="smallBold">Selecionar horário</ThemedText>
            <Pressable onPress={() => setOpen(false)} style={({ pressed }) => pressed && styles.pressed}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={22}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>
          <FlatList
            data={['', ...TIMES]}
            keyExtractor={(item) => item || '__clear__'}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isClear = item === '';
              const selected = item === value;
              return (
                <Pressable
                  onPress={() => { onChange(item); setOpen(false); }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && { backgroundColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    style={[
                      styles.optionText,
                      isClear && { color: theme.textSecondary },
                      selected && { fontWeight: '700' },
                    ]}>
                    {isClear ? 'Limpar' : item}
                  </ThemedText>
                  {selected && !isClear && (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={14}
                      tintColor={theme.text}
                    />
                  )}
                </Pressable>
              );
            }}
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
    justifyContent: 'space-between',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
  },
  triggerText: { fontSize: 14, fontWeight: '500' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    maxHeight: 360,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  list: { paddingHorizontal: Spacing.two },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  optionText: { fontSize: 16 },
  pressed: { opacity: 0.7 },
});
