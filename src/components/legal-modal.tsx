import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Section = {
  title: string;
  body: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: Section[];
  updatedAt: string;
};

export function LegalModal({ visible, onClose, title, sections, updatedAt }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + BottomTabInset + Spacing.six },
          ]}
          showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.updatedAt}>
            Última atualização: {updatedAt}
          </ThemedText>

          {sections.map((section, i) => (
            <View key={i} style={styles.section}>
              <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              <ThemedText style={styles.sectionBody}>{section.body}</ThemedText>
            </View>
          ))}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, gap: Spacing.four },
  updatedAt: { marginBottom: Spacing.two },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  sectionBody: { fontSize: 14, lineHeight: 22, opacity: 0.85 },
  pressed: { opacity: 0.7 },
});
