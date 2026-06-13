import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BusinessDetailModal } from '@/components/business-detail-modal';
import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { useUserData } from '@/context/user-data-context';
import { useTheme } from '@/hooks/use-theme';
import { Business } from '@/types';

export default function FavoritosScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { businesses, categories, refresh: refreshData } = useData();
  const { favoriteIds, refresh: refreshUserData } = useUserData();
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const favorites = businesses.filter((b) => favoriteIds.includes(b.id));

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refreshData(), refreshUserData()]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.text}
            colors={[theme.text]}
            progressBackgroundColor={theme.backgroundElement}
            progressViewOffset={insets.top}
          />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.maxWidth}>
          <ThemedText type="subtitle">Favoritos</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Empresas que você salvou
          </ThemedText>

          {favorites.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <SymbolView
                name={{ ios: 'heart.slash', android: 'heart_broken', web: 'heart_broken' }}
                size={36}
                tintColor="#999"
              />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Nenhuma empresa favoritada ainda.{'\n'}Toque no coração dentro de uma empresa para salvar.
              </ThemedText>
            </ThemedView>
          ) : (
            <View style={styles.list}>
              {favorites.map((business) => {
                const category = categories.find((c) => c.id === business.categoryId);
                const avatarColor = category?.color ?? '#3C9FFE';
                const initials = business.name
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();

                return (
                  <Pressable
                    key={business.id}
                    onPress={() => setSelectedBusiness(business)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <ThemedView type="backgroundElement" style={styles.card}>
                      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        {business.logoUrl ? (
                          <Image
                            source={{ uri: business.logoUrl }}
                            style={styles.avatarImg}
                            contentFit="cover"
                          />
                        ) : (
                          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
                        )}
                      </View>
                      <View style={styles.info}>
                        <ThemedText type="smallBold">{business.name}</ThemedText>
                        {category && (
                          <View style={[styles.pill, { backgroundColor: category.color + '22' }]}>
                            <ThemedText style={[styles.pillText, { color: category.color }]}>
                              {category.name}
                            </ThemedText>
                          </View>
                        )}
                        {business.description && (
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                            {business.description}
                          </ThemedText>
                        )}
                      </View>
                      <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={14}
                        tintColor={theme.textSecondary}
                      />
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <BusinessDetailModal
        business={selectedBusiness}
        visible={selectedBusiness !== null}
        onClose={() => setSelectedBusiness(null)}
      />
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
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  info: { flex: 1, gap: Spacing.one },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  pillText: { fontSize: 11, fontWeight: '600' },
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyText: { textAlign: 'center', lineHeight: 20 },
  pressed: { opacity: 0.7 },
});
