import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  uri: string | null;
  onChange: (uri: string) => void;
  onClear: () => void;
  aspectRatio?: number;
  placeholder?: string;
};

export function ImagePickerField({
  uri,
  onChange,
  onClear,
  aspectRatio = 16 / 9,
  placeholder = 'Toque para selecionar uma imagem',
}: Props) {
  const theme = useTheme();

  async function handlePick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [Math.round(aspectRatio * 100), 100],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      onChange(result.assets[0].uri);
    }
  }

  if (uri) {
    return (
      <View style={styles.previewContainer}>
        <Pressable onPress={handlePick} style={({ pressed }) => pressed && styles.pressed}>
          <Image
            source={{ uri }}
            style={[styles.preview, { aspectRatio }]}
            contentFit="cover"
          />
        </Pressable>
        <Pressable
          onPress={onClear}
          style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}>
          <View style={[styles.clearBtnInner, { backgroundColor: '#FF3B30' }]}>
            <SymbolView
              name={{ ios: 'trash', android: 'delete', web: 'delete' }}
              size={14}
              tintColor="#ffffff"
            />
            <ThemedText style={styles.clearBtnText}>Remover</ThemedText>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={handlePick} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.placeholder, { aspectRatio }]}>
        <SymbolView
          name={{ ios: 'photo.badge.plus', android: 'add_photo_alternate', web: 'add_photo_alternate' }}
          size={32}
          tintColor={theme.textSecondary}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.placeholderText}>
          {placeholder}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  previewContainer: {
    gap: Spacing.two,
  },
  preview: {
    width: '100%',
    borderRadius: Spacing.two,
  },
  clearBtn: {},
  clearBtnInner: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  clearBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholder: {
    width: '100%',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  placeholderText: {
    textAlign: 'center',
  },
  pressed: { opacity: 0.7 },
});
