import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthModal } from '@/components/auth-modal';
import { ChangePasswordModal } from '@/components/change-password-modal';
import { EditProfileModal } from '@/components/edit-profile-modal';
import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { ThemeMode, useThemeMode } from '@/context/theme-context';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function SettingsRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  avatarUrl,
  initials,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  avatarUrl?: string;
  initials?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.rowAvatar} contentFit="cover" />
        ) : initials ? (
          <View style={[styles.rowAvatar, styles.rowAvatarFallback, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.rowAvatarInitials}>{initials}</ThemedText>
          </View>
        ) : (
        <View style={[styles.rowIcon, { backgroundColor: danger ? '#FF3B3022' : theme.backgroundSelected }]}>
          <SymbolView
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name={{ ios: icon as any, android: icon as any, web: icon as any }}
            size={18}
            tintColor={danger ? '#FF3B30' : theme.text}
          />
        </View>
        )}
        <View style={styles.rowContent}>
          <ThemedText
            type="small"
            style={danger ? { color: '#FF3B30', fontWeight: '600' } : {}}>
            {label}
          </ThemedText>
          {sublabel && (
            <ThemedText type="small" themeColor="textSecondary">
              {sublabel}
            </ThemedText>
          )}
        </View>
        {onPress && (
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={12}
            tintColor={theme.textSecondary}
          />
        )}
      </ThemedView>
    </Pressable>
  );
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'system', label: 'Automático', icon: 'circle.lefthalf.filled' },
  { mode: 'light',  label: 'Claro',      icon: 'sun.max.fill' },
  { mode: 'dark',   label: 'Escuro',     icon: 'moon.fill' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user, logout, deleteAccount } = useAuth();
  const { themeMode, setThemeMode } = useThemeMode();
  const [showAuth, setShowAuth] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Remover conta',
      'Esta ação é irreversível. Seus dados serão excluídos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Tem certeza?', 'Confirme para excluir sua conta.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir conta', style: 'destructive', onPress: deleteAccount },
            ]),
        },
      ]
    );
  }

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
          <ThemedText type="subtitle">Configurações</ThemedText>

          {/* Theme Section */}
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              APARÊNCIA
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.themeCard}>
              <View style={styles.themeRow}>
                {THEME_OPTIONS.map(({ mode, label, icon }) => {
                  const isSelected = themeMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setThemeMode(mode)}
                      style={({ pressed }) => [styles.themeOption, pressed && styles.pressed]}>
                      <View
                        style={[
                          styles.themeOptionInner,
                          isSelected && { backgroundColor: theme.backgroundSelected },
                        ]}>
                        <SymbolView
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          name={{ ios: icon as any, android: icon as any, web: icon as any }}
                          size={20}
                          tintColor={isSelected ? theme.text : theme.textSecondary}
                        />
                        <ThemedText
                          type="small"
                          style={[
                            styles.themeLabel,
                            { color: isSelected ? theme.text : theme.textSecondary },
                            isSelected && { fontWeight: '700' },
                          ]}>
                          {label}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ThemedView>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              CONTA
            </ThemedText>
            {user ? (
              <>
                <SettingsRow
                  icon="person.fill"
                  label={user.name}
                  sublabel={user.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                  onPress={() => setShowEditProfile(true)}
                  avatarUrl={user.avatarUrl}
                  initials={user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                />
                {user.phone !== process.env.EXPO_PUBLIC_ADMIN_PHONE && (
                  <SettingsRow
                    icon="lock.fill"
                    label="Alterar senha"
                    onPress={() => setShowChangePassword(true)}
                  />
                )}
                <SettingsRow
                  icon="rectangle.portrait.and.arrow.right"
                  label="Sair da conta"
                  onPress={handleLogout}
                  danger
                />
                <SettingsRow
                  icon="trash"
                  label="Remover conta"
                  onPress={handleDeleteAccount}
                  danger
                />
              </>
            ) : (
              <SettingsRow
                icon="person.badge.plus"
                label="Entrar / Cadastrar"
                sublabel="Faça login para agendar serviços"
                onPress={() => setShowAuth(true)}
              />
            )}
          </View>

          {/* App Section */}
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              APLICATIVO
            </ThemedText>
            <SettingsRow
              icon="info.circle"
              label="Versão"
              sublabel="1.0.0"
            />
          </View>
        </View>
      </ScrollView>

      <AuthModal
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
      <StatusBarBlur height={insets.top} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  maxWidth: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.one,
  },
  themeCard: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  themeOption: {
    flex: 1,
  },
  themeOptionInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderRadius: Spacing.two,
  },
  themeLabel: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  rowAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatarInitials: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
