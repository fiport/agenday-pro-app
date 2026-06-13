import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { uploadImage } from '@/lib/upload';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function EditProfileModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.name);
      setAvatarUri(user.avatarUrl ?? null);
    }
  }, [visible, user]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      Alert.alert('Atenção', 'Informe seu nome completo.');
      return;
    }
    setSaving(true);
    try {
      let finalAvatarUrl = user?.avatarUrl;

      if (avatarUri && !avatarUri.startsWith('http')) {
        finalAvatarUrl = await uploadImage(avatarUri, `avatars/${user?.phone}.jpg`);
      } else if (!avatarUri) {
        finalAvatarUrl = undefined;
      }

      await updateProfile(name.trim(), finalAvatarUrl);
      onClose();
    } catch (e) {
      console.error('[EditProfile]', e);
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const formattedPhone = (user?.phone ?? '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Editar perfil</ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeBtn}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor={theme.text} />
            </ThemedView>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable onPress={pickAvatar} style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
              ) : (
                <ThemedView type="backgroundElement" style={[styles.avatar, styles.avatarFallback]}>
                  <ThemedText style={styles.initials}>{initials}</ThemedText>
                </ThemedView>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: theme.text }]}>
                <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }} size={12} tintColor={theme.background} />
              </View>
            </Pressable>
            {avatarUri && (
              <Pressable onPress={() => setAvatarUri(null)} style={({ pressed }) => pressed && styles.pressed}>
                <ThemedText type="small" themeColor="textSecondary">Remover foto</ThemedText>
              </Pressable>
            )}
          </View>

          {/* Name */}
          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>NOME</ThemedText>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Seu nome completo"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </ThemedView>
          </View>

          {/* Phone — read only */}
          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>TELEFONE</ThemedText>
            <ThemedView type="backgroundElement" style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, { color: theme.textSecondary }]}
                value={formattedPhone}
                editable={false}
                selectTextOnFocus={false}
              />
            </ThemedView>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}>
            <View style={[styles.saveBtnInner, { backgroundColor: theme.text }]}>
              <ThemedText style={[styles.saveBtnText, { color: theme.background }]}>
                {saving ? 'Salvando...' : 'Salvar'}
              </ThemedText>
            </View>
          </Pressable>
        </View>
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
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 24,
    fontWeight: '700',
    includeFontPadding: false,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  field: { gap: Spacing.two },
  label: { fontWeight: '600', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.6 },
  inputWrapper: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  input: { fontSize: 16, paddingVertical: Spacing.one, letterSpacing: 0 },
  saveBtn: { marginTop: Spacing.two },
  saveBtnInner: { borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
