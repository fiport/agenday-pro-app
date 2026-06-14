import AsyncStorage from '@react-native-async-storage/async-storage';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthModal } from '@/components/auth-modal';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const STORAGE_KEY = '@agenday:onboarding_done';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Slide definitions ────────────────────────────────────────────────────────

type Slide = {
  id: string;
  color: string;
  accent: string;
  icon: { ios: string; android: string; web: string };
  tag: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: 'discover',
    color: '#1A7AE0',
    accent: '#4FA3FF',
    icon: { ios: 'magnifyingglass.circle.fill', android: 'search', web: 'search' },
    tag: 'DESCUBRA',
    title: 'Os melhores serviços da sua cidade',
    subtitle: 'Salões, clínicas, oficinas e muito mais — todos reunidos em um só lugar para você encontrar com facilidade.',
  },
  {
    id: 'favorites',
    color: '#C0392B',
    accent: '#FF6B6B',
    icon: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
    tag: 'FAVORITOS',
    title: 'Salve o que você mais gosta',
    subtitle: 'Marque suas empresas preferidas e acesse instantaneamente sempre que precisar.',
  },
  {
    id: 'whatsapp',
    color: '#1A9E4A',
    accent: '#4CD87B',
    icon: { ios: 'message.fill', android: 'chat', web: 'chat' },
    tag: 'AGENDAMENTO',
    title: 'Agende direto pelo WhatsApp',
    subtitle: 'Com um toque você entra em contato com a empresa e agenda sem burocracia, sem espera.',
  },
  {
    id: 'register',
    color: '#4A35C8',
    accent: '#9B8BFF',
    icon: { ios: 'person.crop.circle.fill.badge.checkmark', android: 'verified_user', web: 'verified_user' },
    tag: 'COMECE AGORA',
    title: 'Tudo pronto para começar',
    subtitle: 'Crie sua conta gratuita e tenha histórico de agendamentos, favoritos e muito mais.',
  },
];

// ─── Dot ─────────────────────────────────────────────────────────────────────

function Dots({ current, count, color }: { current: number; count: number; color: string }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current
              ? [dotStyles.dotActive, { backgroundColor: '#fff', width: 24 }]
              : { backgroundColor: 'rgba(255,255,255,0.35)' },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3, width: 6 },
  dotActive: { height: 6, borderRadius: 3 },
});

// ─── Single slide ─────────────────────────────────────────────────────────────

function SlideView({ slide, isLast, onNext, onSkip, onRegister, onSkipLast }: {
  slide: Slide;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
  onRegister: () => void;
  onSkipLast: () => void;
}) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, delay: 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, delay: 80, useNativeDriver: true }),
    ]).start();
  }, [slide.id]);

  return (
    <View style={[slideStyles.slide, { width: SCREEN_W, backgroundColor: slide.color }]}>
      {/* Skip */}
      {!isLast && (
        <Pressable
          onPress={onSkip}
          style={[slideStyles.skipBtn, { top: insets.top + Spacing.two }]}
          hitSlop={12}>
          <ThemedText style={slideStyles.skipText}>Pular</ThemedText>
        </Pressable>
      )}

      {/* Icon area */}
      <Animated.View
        style={[
          slideStyles.iconArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
        <View style={[slideStyles.iconRing, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <View style={[slideStyles.iconInner, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <SymbolView name={slide.icon} size={64} tintColor="#fff" />
          </View>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View
        style={[
          slideStyles.textArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
        <View style={[slideStyles.tag, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <ThemedText style={slideStyles.tagText}>{slide.tag}</ThemedText>
        </View>
        <ThemedText style={slideStyles.title}>{slide.title}</ThemedText>
        <ThemedText style={slideStyles.subtitle}>{slide.subtitle}</ThemedText>
      </Animated.View>

      {/* CTA area */}
      <View style={[slideStyles.ctaArea, { paddingBottom: insets.bottom + Spacing.four }]}>
        {isLast ? (
          <>
            <Pressable
              onPress={onRegister}
              style={({ pressed }) => [slideStyles.btnPrimary, pressed && { opacity: 0.85 }]}>
              <ThemedText style={slideStyles.btnPrimaryText}>Criar minha conta</ThemedText>
            </Pressable>
            <Pressable
              onPress={onSkipLast}
              style={({ pressed }) => [slideStyles.btnGhost, pressed && { opacity: 0.7 }]}>
              <ThemedText style={slideStyles.btnGhostText}>Explorar sem conta</ThemedText>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [slideStyles.btnPrimary, pressed && { opacity: 0.85 }]}>
            <ThemedText style={slideStyles.btnPrimaryText}>Próximo</ThemedText>
            <SymbolView
              name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
              size={16}
              tintColor={slide.color}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const slideStyles = StyleSheet.create({
  slide: {
    flex: 1,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + Spacing.six : Spacing.six,
  },
  skipBtn: {
    position: 'absolute',
    right: Spacing.four,
    zIndex: 10,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  skipText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '500' },
  iconArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconRing: {
    width: 200, height: 200, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
  },
  iconInner: {
    width: 152, height: 152, borderRadius: 76,
    justifyContent: 'center', alignItems: 'center',
  },
  textArea: {
    paddingHorizontal: Spacing.five,
    paddingBottom: 56,
    alignItems: 'center',
    gap: Spacing.two,
  },
  tag: {
    borderRadius: 20, paddingHorizontal: Spacing.three, paddingVertical: 4, marginBottom: Spacing.one,
  },
  tagText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: {
    color: '#fff', fontSize: 28, fontWeight: '800',
    textAlign: 'center', lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)', fontSize: 16,
    textAlign: 'center', lineHeight: 24,
  },
  ctaArea: {
    width: '100%',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#fff',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three + 2,
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#000' },
  btnGhost: {
    alignItems: 'center', paddingVertical: Spacing.two,
  },
  btnGhostText: { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '500' },
});

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAuth, setShowAuth] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
      setChecked(true);
    });
  }, []);

  async function markDone() {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function goNext() {
    const next = currentIndex + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  }

  function handleRegister() {
    setShowAuth(true);
  }

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  if (!checked || !visible) return null;

  return (
    <>
      <View style={styles.overlay}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(s) => s.id}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          viewabilityConfig={viewabilityConfig.current}
          onViewableItemsChanged={onViewableItemsChanged.current}
          renderItem={({ item, index }) => (
            <SlideView
              slide={item}
              isLast={index === SLIDES.length - 1}
              onNext={goNext}
              onSkip={markDone}
              onRegister={handleRegister}
              onSkipLast={markDone}
            />
          )}
        />

        {/* Dots overlay — positioned above the CTA buttons (~148px from bottom) */}
        <View style={styles.dots}>
          <Dots current={currentIndex} count={SLIDES.length} color={SLIDES[currentIndex].color} />
        </View>
      </View>

      <AuthModal
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={markDone}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  dots: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
  },
});
