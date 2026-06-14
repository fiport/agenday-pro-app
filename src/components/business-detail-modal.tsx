import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthModal } from '@/components/auth-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { addDoc, collection } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useData } from '@/context/data-context';
import { useUserData } from '@/context/user-data-context';
import { db } from '@/lib/firebase';
import { useTheme } from '@/hooks/use-theme';
import { Business, Service } from '@/types';

type Props = {
  business: Business | null;
  visible: boolean;
  onClose: () => void;
};

export function BusinessDetailModal({ business, visible, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { categories } = useData();
  const { favoriteIds, toggleFavorite, addAppointment } = useUserData();
  const [showAuth, setShowAuth] = useState(false);
  const [pendingService, setPendingService] = useState<Service | null>(null);

  useEffect(() => {
    if (visible && business) {
      addDoc(collection(db, 'leads'), {
        businessId: business.id,
        businessName: business.name,
        clientPhone: user?.phone ?? null,
        clientName: user?.name ?? null,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, business?.id]);

  useEffect(() => {
    if (!showAuth && pendingService && user && business) {
      const service = pendingService;
      const biz = business;
      setPendingService(null);
      Alert.alert(
        'Confirmar agendamento',
        `Deseja solicitar o serviço "${service.name}" via WhatsApp?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar no WhatsApp', onPress: () => openWhatsApp(biz.whatsapp, service.name) },
        ]
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAuth]);

  if (!business) return null;

  const category = categories.find((c) => c.id === business.categoryId);
  const avatarColor = category?.color ?? '#3C9FFE';
  const categoryColor = category?.color ?? '#3C9FFE';
  const initials = business.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  function openWhatsApp(phone: string, serviceName: string) {
    if (user) {
      addAppointment({
        businessId: business!.id,
        businessName: business!.name,
        businessWhatsapp: business!.whatsapp,
        serviceName,
        clientPhone: user.phone,
        clientName: user.name,
        clientAvatarUrl: user.avatarUrl,
      });
    }
    const message = `Olá! Meu nome é ${user?.name} e gostaria de agendar o serviço: *${serviceName}*. Poderia me informar a disponibilidade?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.')
    );
  }

  function handleSchedule(service: Service) {
    if (!user) {
      setPendingService(service);
      setShowAuth(true);
      return;
    }
    Alert.alert(
      'Confirmar agendamento',
      `Deseja solicitar o serviço "${service.name}" via WhatsApp?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar no WhatsApp', onPress: () => openWhatsApp(business!.whatsapp, service.name) },
      ]
    );
  }

  function handleAuthSuccess() {
    setShowAuth(false);
  }

  function handleOpenMaps() {
    const address = encodeURIComponent(business!.address ?? '');
    const appleUrl = `maps://maps.apple.com/?q=${address}`;
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
    Linking.canOpenURL(appleUrl)
      .then((supported) => Linking.openURL(supported ? appleUrl : googleUrl))
      .catch(() => Linking.openURL(googleUrl).catch(() => {}));
  }

  function handleOpenInstagram() {
    if (business!.instagram) {
      Linking.openURL(`https://instagram.com/${business!.instagram}`).catch(() => {});
    }
  }

  function handleOpenFacebook() {
    if (business!.facebook) {
      Linking.openURL(`https://facebook.com/${business!.facebook}`).catch(() => {});
    }
  }

  function handleOpenWhatsApp() {
    const message = `Olá! Vim pelo Agenday App e gostaria de mais informações.`;
    const url = `https://wa.me/${business!.whatsapp}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.topBar}>
          {user ? (
            <Pressable
              onPress={() => toggleFavorite(business.id)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.closeButton}>
                <SymbolView
                  name={
                    favoriteIds.includes(business.id)
                      ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
                      : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
                  }
                  size={16}
                  tintColor={favoriteIds.includes(business.id) ? '#FF3B30' : theme.text}
                />
              </ThemedView>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable onPress={onClose} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.closeButton}>
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={16}
                tintColor={theme.text}
              />
            </ThemedView>
          </Pressable>
        </ThemedView>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}>

          {/* Avatar + Info */}
          <View style={styles.heroSection}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {business.logoUrl ? (
                <Image source={{ uri: business.logoUrl }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <ThemedText style={styles.avatarText}>{initials}</ThemedText>
              )}
            </View>
            <ThemedText type="subtitle" style={styles.businessName}>
              {business.name}
            </ThemedText>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '22' }]}>
              <ThemedText type="small" style={[styles.categoryText, { color: categoryColor }]}>
                {category?.name}
              </ThemedText>
            </View>
            {business.description && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                {business.description}
              </ThemedText>
            )}
          </View>

          {/* Social Links */}
          <View style={styles.socialRow}>
            <Pressable
              onPress={handleOpenWhatsApp}
              style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
              <View style={[styles.socialButtonInner, { backgroundColor: '#25D366' }]}>
                <ThemedText style={styles.socialButtonText}>WhatsApp</ThemedText>
              </View>
            </Pressable>
            {business.instagram && (
              <Pressable
                onPress={handleOpenInstagram}
                style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
                <View style={[styles.socialButtonInner, { backgroundColor: '#E1306C' }]}>
                  <ThemedText style={styles.socialButtonText}>Instagram</ThemedText>
                </View>
              </Pressable>
            )}
            {business.facebook && (
              <Pressable
                onPress={handleOpenFacebook}
                style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}>
                <View style={[styles.socialButtonInner, { backgroundColor: '#1877F2' }]}>
                  <ThemedText style={styles.socialButtonText}>Facebook</ThemedText>
                </View>
              </Pressable>
            )}
          </View>

          {/* Address */}
          {business.address && (
            <View style={styles.section}>
              <Collapsible title="Endereço">
                <View style={styles.addressContent}>
                  <ThemedText type="small">{business.address}</ThemedText>
                  <Pressable
                    onPress={handleOpenMaps}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.mapsButton, { backgroundColor: theme.text }]}>
                      <SymbolView
                        name={{ ios: 'map.fill', android: 'map', web: 'map' }}
                        size={14}
                        tintColor={theme.background}
                      />
                      <ThemedText style={[styles.mapsButtonText, { color: theme.background }]}>
                        Ver no mapa
                      </ThemedText>
                    </View>
                  </Pressable>
                </View>
              </Collapsible>
            </View>
          )}

          {/* Business Hours */}
          <View style={styles.section}>
            <Collapsible title="Horários de funcionamento">
              {business.hours.map((hour) => (
                <View key={hour.day} style={styles.hourRow}>
                  <ThemedText type="small" style={styles.hourDay}>{hour.day}</ThemedText>
                  {hour.closed ? (
                    <ThemedText type="small" themeColor="textSecondary">Fechado</ThemedText>
                  ) : (
                    <View style={styles.hourSlots}>
                      {(hour.morningOpen || hour.morningClose) && (
                        <ThemedText type="small">
                          Manhã: {hour.morningOpen} – {hour.morningClose}
                        </ThemedText>
                      )}
                      {(hour.afternoonOpen || hour.afternoonClose) && (
                        <ThemedText type="small">
                          Tarde: {hour.afternoonOpen} – {hour.afternoonClose}
                        </ThemedText>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </Collapsible>
          </View>

          {/* Services */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Serviços
            </ThemedText>
            <View style={styles.servicesList}>
              {business.services.map((service) => (
                <ThemedView key={service.id} type="backgroundElement" style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <ThemedText type="small">{service.name}</ThemedText>
                    {service.price && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {service.price}
                      </ThemedText>
                    )}
                  </View>
                  <Pressable
                    onPress={() => handleSchedule(service)}
                    style={({ pressed }) => pressed && styles.pressed}>
                    <View style={[styles.scheduleButton, { backgroundColor: theme.text }]}>
                      <ThemedText style={[styles.scheduleButtonText, { color: theme.background }]}>
                        Agendar
                      </ThemedText>
                    </View>
                  </Pressable>
                </ThemedView>
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>

      <AuthModal
        visible={showAuth}
        onClose={() => {
          setShowAuth(false);
          setPendingService(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    includeFontPadding: false,
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
  },
  businessName: {
    textAlign: 'center',
  },
  categoryBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.five,
  },
  categoryText: {
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  socialButton: {},
  socialButtonInner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  socialButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginBottom: Spacing.one,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  hourDay: {
    fontWeight: '600',
  },
  hourSlots: {
    gap: 2,
    alignItems: 'flex-end',
  },
  servicesList: {
    gap: Spacing.two,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  serviceInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  scheduleButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    marginLeft: Spacing.two,
  },
  scheduleButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addressContent: {
    gap: Spacing.three,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  mapsButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
