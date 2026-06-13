import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthModal } from '@/components/auth-modal';
import { BusinessDetailModal } from '@/components/business-detail-modal';
import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import { useTheme } from '@/hooks/use-theme';
import { Business } from '@/types';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { businesses, sponsors, categories, loading, refresh } = useData();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const carouselRef = useRef<ScrollView>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselWidth = Math.min(width, MaxContentWidth) - Spacing.four * 2;

  const activeSponsors = sponsors.filter(
    (s) => !s.expiresAt || new Date(s.expiresAt) >= new Date()
  );

  useEffect(() => {
    if (activeSponsors.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % activeSponsors.length;
        carouselRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [carouselWidth, activeSponsors.length]);

  const activeBusinesses = businesses.filter(
    (b) => !b.planExpiresAt || new Date(b.planExpiresAt) >= new Date()
  );

  const filteredBusinesses = activeBusinesses.filter((b) => {
    const matchesSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      categories
        .find((c) => c.id === b.categoryId)
        ?.name.toLowerCase()
        .includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || b.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <ThemedText type="subtitle">Vitrine</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {user ? `Olá, ${user.name.split(' ')[0]}!` : 'Encontre os melhores serviços'}
              </ThemedText>
            </View>
            {!user && (
              <Pressable
                onPress={() => setShowAuth(true)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.loginButton}>
                  <ThemedText type="small">Entrar</ThemedText>
                </ThemedView>
              </Pressable>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={theme.text} style={styles.loader} />
          ) : (
            <>
              {/* Sponsors Carousel */}
              {activeSponsors.length > 0 && (
                <View style={styles.carouselSection}>
                  <ScrollView
                    ref={carouselRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    style={styles.carouselScroll}>
                    {activeSponsors.map((sponsor) => (
                      <View
                        key={sponsor.id}
                        style={[styles.sponsorCard, { width: carouselWidth, backgroundColor: sponsor.color }]}>
                        {sponsor.imageUrl && (
                          <Image
                            source={{ uri: sponsor.imageUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        )}
                        <View style={sponsor.imageUrl ? styles.sponsorOverlay : undefined}>
                          <ThemedText style={styles.sponsorLabel}>PATROCINADOR</ThemedText>
                          <ThemedText style={styles.sponsorName}>{sponsor.name}</ThemedText>
                          {sponsor.tagline && (
                            <ThemedText style={styles.sponsorTagline}>{sponsor.tagline}</ThemedText>
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  {activeSponsors.length > 1 && (
                    <View style={styles.dotsRow}>
                      {activeSponsors.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            {
                              backgroundColor: i === activeSlide ? theme.text : theme.backgroundElement,
                              width: i === activeSlide ? 16 : 6,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Search */}
              <ThemedView type="backgroundElement" style={styles.searchWrapper}>
                <SymbolView
                  name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                  size={16}
                  tintColor={theme.textSecondary}
                />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Buscar empresa ou serviço..."
                  placeholderTextColor={theme.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} style={({ pressed }) => pressed && styles.pressed}>
                    <SymbolView
                      name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                      size={16}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                )}
              </ThemedView>

              {/* Category Filter */}
              {categories.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoriesRow}>
                  <Pressable
                    onPress={() => setSelectedCategory(null)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View
                      style={[
                        styles.categoryChip,
                        !selectedCategory && { backgroundColor: theme.text },
                        selectedCategory && { backgroundColor: theme.backgroundElement },
                      ]}>
                      <ThemedText
                        type="small"
                        style={!selectedCategory ? { color: theme.background } : { color: theme.text }}>
                        Todos
                      </ThemedText>
                    </View>
                  </Pressable>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategory(isSelected ? null : cat.id)}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <View
                          style={[
                            styles.categoryChip,
                            isSelected
                              ? { backgroundColor: cat.color }
                              : { backgroundColor: cat.color + '22' },
                          ]}>
                          <ThemedText
                            type="small"
                            style={{ color: isSelected ? '#ffffff' : cat.color, fontWeight: '600' }}>
                            {cat.name}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              {/* Businesses List */}
              <View style={styles.listSection}>
                <ThemedText type="smallBold" style={styles.listTitle}>
                  {filteredBusinesses.length} empresa{filteredBusinesses.length !== 1 ? 's' : ''}
                  {selectedCategory
                    ? ` em ${categories.find((c) => c.id === selectedCategory)?.name}`
                    : ''}
                </ThemedText>

                {filteredBusinesses.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyState}>
                    <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                      {activeBusinesses.length === 0
                        ? 'Nenhuma empresa cadastrada ainda.'
                        : 'Nenhuma empresa encontrada.'}
                    </ThemedText>
                  </ThemedView>
                ) : (
                  filteredBusinesses.map((business) => {
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
                        <ThemedView type="backgroundElement" style={styles.businessCard}>
                          <View style={[styles.businessAvatar, { backgroundColor: avatarColor }]}>
                            {business.logoUrl ? (
                              <Image
                                source={{ uri: business.logoUrl }}
                                style={styles.businessAvatarImg}
                                contentFit="cover"
                              />
                            ) : (
                              <ThemedText style={styles.businessAvatarText}>{initials}</ThemedText>
                            )}
                          </View>
                          <View style={styles.businessInfo}>
                            <ThemedText type="smallBold">{business.name}</ThemedText>
                            {category && (
                              <View style={[styles.categoryPill, { backgroundColor: category.color + '22' }]}>
                                <ThemedText
                                  type="small"
                                  style={{ color: category.color, fontSize: 11, fontWeight: '600' }}>
                                  {category.name}
                                </ThemedText>
                              </View>
                            )}
                            {business.description && (
                              <ThemedText
                                type="small"
                                themeColor="textSecondary"
                                numberOfLines={1}
                                style={styles.businessDesc}>
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
                  })
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <StatusBarBlur height={insets.top} />

      <BusinessDetailModal
        business={selectedBusiness}
        visible={selectedBusiness !== null}
        onClose={() => setSelectedBusiness(null)}
      />

      <AuthModal
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loginButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  loader: {
    marginTop: Spacing.six,
  },
  carouselSection: {
    gap: Spacing.two,
  },
  carouselScroll: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  sponsorCard: {
    height: 140,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  sponsorLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  sponsorName: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  sponsorTagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  sponsorOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Spacing.three,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: Spacing.one,
  },
  categoriesRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  listSection: {
    gap: Spacing.two,
  },
  listTitle: {
    marginBottom: Spacing.one,
  },
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  businessAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  businessAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  businessAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  businessInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  businessDesc: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
