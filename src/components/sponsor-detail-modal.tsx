import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Sponsor } from '@/types';

type Props = {
  sponsor: Sponsor | null;
  visible: boolean;
  onClose: () => void;
};

export function SponsorDetailModal({ sponsor, visible, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!sponsor) return null;

  const address = [sponsor.street, sponsor.addressNumber, sponsor.neighborhood, sponsor.city, sponsor.state]
    .filter(Boolean)
    .join(', ') || sponsor.address;

  function openWhatsApp() {
    if (!sponsor?.whatsapp) return;
    Linking.openURL(`https://wa.me/${sponsor.whatsapp}`).catch(() => {});
  }

  function openInstagram() {
    if (!sponsor?.instagram) return;
    Linking.openURL(`https://instagram.com/${sponsor.instagram}`).catch(() => {});
  }

  function openFacebook() {
    if (!sponsor?.facebook) return;
    Linking.openURL(`https://facebook.com/${sponsor.facebook}`).catch(() => {});
  }

  const hasSocial = sponsor.whatsapp || sponsor.instagram || sponsor.facebook;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: sponsor.color }]}>
          {sponsor.imageUrl && (
            <Image source={{ uri: sponsor.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          )}
          <View style={sponsor.imageUrl ? styles.bannerOverlay : styles.bannerContent}>
            <ThemedText style={styles.bannerLabel}>PATROCINADOR</ThemedText>
            <ThemedText style={styles.bannerName}>{sponsor.name}</ThemedText>
            {sponsor.tagline && (
              <ThemedText style={styles.bannerTagline}>{sponsor.tagline}</ThemedText>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <View style={styles.closeBtnInner}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} tintColor="#fff" />
            </View>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}>

          {/* Address */}
          {address ? (
            <ThemedView type="backgroundElement" style={styles.infoCard}>
              <View style={styles.infoRow}>
                <SymbolView
                  name={{ ios: 'mappin.circle.fill', android: 'place', web: 'place' }}
                  size={18} tintColor={sponsor.color}
                />
                <ThemedText style={styles.infoText}>{address}</ThemedText>
              </View>
            </ThemedView>
          ) : null}

          {/* Social buttons */}
          {hasSocial && (
            <View style={styles.actionsRow}>
              {sponsor.whatsapp && (
                <Pressable onPress={openWhatsApp} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                  <View style={[styles.actionBtnInner, { backgroundColor: '#25D366' }]}>
                    <SymbolView
                      name={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
                      size={20} tintColor="#fff"
                    />
                    <ThemedText style={styles.actionBtnText}>WhatsApp</ThemedText>
                  </View>
                </Pressable>
              )}
              {sponsor.instagram && (
                <Pressable onPress={openInstagram} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                  <View style={[styles.actionBtnInner, { backgroundColor: '#E1306C' }]}>
                    <SymbolView
                      name={{ ios: 'camera.fill', android: 'camera_alt', web: 'camera_alt' }}
                      size={20} tintColor="#fff"
                    />
                    <ThemedText style={styles.actionBtnText}>Instagram</ThemedText>
                  </View>
                </Pressable>
              )}
              {sponsor.facebook && (
                <Pressable onPress={openFacebook} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                  <View style={[styles.actionBtnInner, { backgroundColor: '#1877F2' }]}>
                    <SymbolView
                      name={{ ios: 'hand.thumbsup.fill', android: 'thumb_up', web: 'thumb_up' }}
                      size={20} tintColor="#fff"
                    />
                    <ThemedText style={styles.actionBtnText}>Facebook</ThemedText>
                  </View>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const BANNER_HEIGHT = 220;

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    height: BANNER_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.four,
  },
  bannerLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.one,
  },
  bannerName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  bannerTagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: Spacing.one,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.four,
  },
  closeBtnInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  infoCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    gap: Spacing.two,
  },
  actionBtn: {},
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: { opacity: 0.75 },
});
