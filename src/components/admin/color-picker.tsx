import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

export const COLOR_PALETTE = [
  '#FF6B9D', '#E1306C', '#FF3B30', '#FF6B00', '#FF9500',
  '#FFCC00', '#34C759', '#4CD964', '#25D366', '#5AC8FA',
  '#3C9FFE', '#1877F2', '#AF52DE', '#8E8E93', '#000000',
];

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {COLOR_PALETTE.map((color) => (
        <Pressable key={color} onPress={() => onChange(color)} style={styles.swatch}>
          <View style={[styles.circle, { backgroundColor: color }]}>
            {value === color && <View style={styles.selected} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  swatch: {
    padding: 2,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
