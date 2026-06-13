import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isDark = scheme === 'dark';
  const tabAppearance = {
    backgroundColor: colors.background,
    blurEffect: isDark ? 'systemMaterialDark' as const : 'systemMaterialLight' as const,
    disableTransparentOnScrollEdge: true,
    iconColor: colors.textSecondary,
    indicatorColor: colors.backgroundElement,
    labelStyle: { color: colors.textSecondary },
    rippleColor: colors.backgroundElement,
    selectedIconColor: colors.text,
    selectedLabelStyle: { color: colors.text },
    shadowColor: colors.backgroundElement,
  };

  return (
    <NativeTabs
      key={scheme}
      {...tabAppearance}
      iconColor={{ default: colors.textSecondary, selected: colors.text }}
      tintColor={colors.text}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.text },
      }}>
      <NativeTabs.Trigger name="index" {...tabAppearance}>
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favoritos" hidden={!user} {...tabAppearance}>
        <NativeTabs.Trigger.Label>Favoritos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'heart', selected: 'heart.fill' }}
          md="favorite_border"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="agendamentos" hidden={!user} {...tabAppearance}>
        <NativeTabs.Trigger.Label>Agendamentos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'calendar', selected: 'calendar' }}
          md="event"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cadastros" hidden={!isAdmin} {...tabAppearance}>
        <NativeTabs.Trigger.Label>Cadastros</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.and.pencil', selected: 'square.and.pencil' }}
          md="edit_note"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" {...tabAppearance}>
        <NativeTabs.Trigger.Label>Configurações</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
