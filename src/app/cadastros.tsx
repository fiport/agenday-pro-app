import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminUserFormModal, AdminUserEntry } from '@/components/admin/admin-user-form-modal';
import { BusinessFormModal } from '@/components/admin/business-form-modal';
import { CategoryFormModal } from '@/components/admin/category-form-modal';
import { SponsorFormModal } from '@/components/admin/sponsor-form-modal';
import { StatusBarBlur } from '@/components/status-bar-blur';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useData } from '@/context/data-context';
import { db } from '@/lib/firebase';
import { useTheme } from '@/hooks/use-theme';
import { Business, Category, Sponsor } from '@/types';

type Segment = 'sponsors' | 'businesses' | 'categories' | 'admins';

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'sponsors', label: 'Patrocinadores' },
  { key: 'businesses', label: 'Empresas' },
  { key: 'categories', label: 'Categorias' },
  { key: 'admins', label: 'Admins' },
];

function parseDisplayDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function isExpired(iso?: string) {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export default function CadastrosScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { sponsors, businesses, categories, deleteSponsor, deleteBusiness, deleteCategory } = useData();

  const [segment, setSegment] = useState<Segment>('sponsors');
  const [adminUsers, setAdminUsers] = useState<AdminUserEntry[]>([]);

  const [sponsorForm, setSponsorForm] = useState<{ visible: boolean; editing: Sponsor | null }>({ visible: false, editing: null });
  const [businessForm, setBusinessForm] = useState<{ visible: boolean; editing: Business | null }>({ visible: false, editing: null });
  const [categoryForm, setCategoryForm] = useState<{ visible: boolean; editing: Category | null }>({ visible: false, editing: null });
  const [adminForm, setAdminForm] = useState<{ visible: boolean; editing: AdminUserEntry | null }>({ visible: false, editing: null });

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsub = onSnapshot(q, (snap) => {
      setAdminUsers(snap.docs.map((d) => ({ phone: d.id, name: (d.data() as { name: string }).name })));
    }, () => {});
    return unsub;
  }, []);

  function confirmDelete(name: string, onConfirm: () => Promise<void>) {
    Alert.alert('Excluir', `Deseja excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: onConfirm },
    ]);
  }

  async function deleteAdminUser(phone: string) {
    await deleteDoc(doc(db, 'users', phone));
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
          <ThemedText type="subtitle">Cadastros</ThemedText>

          {/* Segment Picker */}
          <ThemedView type="backgroundElement" style={styles.segmentCard}>
            <View style={styles.segmentRow}>
              {SEGMENTS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => setSegment(key)}
                  style={({ pressed }) => [styles.segmentOption, pressed && styles.pressed]}>
                  <View style={[
                    styles.segmentInner,
                    segment === key && { backgroundColor: theme.background },
                  ]}>
                    <ThemedText
                      type="small"
                      style={[
                        styles.segmentLabel,
                        { color: segment === key ? theme.text : theme.textSecondary },
                        segment === key && { fontWeight: '700' },
                      ]}>
                      {label}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          </ThemedView>

          {/* List */}
          <View style={styles.listSection}>
            {segment === 'sponsors' && (
              <>
                {sponsors.length === 0 ? (
                  <EmptyState label="Nenhum patrocinador cadastrado." />
                ) : (
                  sponsors.map((item) => (
                    <ItemRow
                      key={item.id}
                      color={item.color}
                      title={item.name}
                      subtitle={item.tagline}
                      badge={parseDisplayDate(item.expiresAt)}
                      expired={isExpired(item.expiresAt)}
                      onEdit={() => setSponsorForm({ visible: true, editing: item })}
                      onDelete={() => confirmDelete(item.name, () => deleteSponsor(item.id))}
                    />
                  ))
                )}
                <AddButton label="Novo Patrocinador" onPress={() => setSponsorForm({ visible: true, editing: null })} />
              </>
            )}

            {segment === 'businesses' && (
              <>
                {businesses.length === 0 ? (
                  <EmptyState label="Nenhuma empresa cadastrada." />
                ) : (
                  businesses.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <ItemRow
                        key={item.id}
                        color={cat?.color ?? '#3C9FFE'}
                        title={item.name}
                        subtitle={cat?.name}
                        badge={parseDisplayDate(item.planExpiresAt)}
                        expired={isExpired(item.planExpiresAt)}
                        onEdit={() => setBusinessForm({ visible: true, editing: item })}
                        onDelete={() => confirmDelete(item.name, () => deleteBusiness(item.id))}
                      />
                    );
                  })
                )}
                <AddButton label="Nova Empresa" onPress={() => setBusinessForm({ visible: true, editing: null })} />
              </>
            )}

            {segment === 'categories' && (
              <>
                {categories.length === 0 ? (
                  <EmptyState label="Nenhuma categoria cadastrada." />
                ) : (
                  categories.map((item) => (
                    <ItemRow
                      key={item.id}
                      color={item.color}
                      title={item.name}
                      onEdit={() => setCategoryForm({ visible: true, editing: item })}
                      onDelete={() => confirmDelete(item.name, () => deleteCategory(item.id))}
                    />
                  ))
                )}
                <AddButton label="Nova Categoria" onPress={() => setCategoryForm({ visible: true, editing: null })} />
              </>
            )}

            {segment === 'admins' && (
              <>
                {adminUsers.length === 0 ? (
                  <EmptyState label="Nenhum administrador adicional cadastrado." />
                ) : (
                  adminUsers.map((item) => (
                    <ItemRow
                      key={item.phone}
                      color="#AF52DE"
                      title={item.name}
                      subtitle={item.phone}
                      onEdit={() => setAdminForm({ visible: true, editing: item })}
                      onDelete={() => confirmDelete(item.name, () => deleteAdminUser(item.phone))}
                    />
                  ))
                )}
                <AddButton label="Novo Administrador" onPress={() => setAdminForm({ visible: true, editing: null })} />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <SponsorFormModal
        visible={sponsorForm.visible}
        editing={sponsorForm.editing}
        onClose={() => setSponsorForm({ visible: false, editing: null })}
      />
      <BusinessFormModal
        visible={businessForm.visible}
        editing={businessForm.editing}
        onClose={() => setBusinessForm({ visible: false, editing: null })}
      />
      <CategoryFormModal
        visible={categoryForm.visible}
        editing={categoryForm.editing}
        onClose={() => setCategoryForm({ visible: false, editing: null })}
      />
      <AdminUserFormModal
        visible={adminForm.visible}
        editing={adminForm.editing}
        onClose={() => setAdminForm({ visible: false, editing: null })}
        onSaved={() => {}}
      />
      <StatusBarBlur height={insets.top} />
    </ThemedView>
  );
}

function ItemRow({
  color,
  title,
  subtitle,
  badge,
  expired,
  onEdit,
  onDelete,
}: {
  color: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  expired?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.itemRow}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <View style={styles.itemInfo}>
        <ThemedText type="small" style={styles.itemTitle}>{title}</ThemedText>
        {subtitle && <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText>}
        {badge && (
          <View style={[styles.expiryBadge, { backgroundColor: expired ? '#FF3B3022' : '#34C75922' }]}>
            <ThemedText type="small" style={{ color: expired ? '#FF3B30' : '#34C759', fontSize: 11, fontWeight: '600' }}>
              {expired ? 'Expirado ' : 'Válido até '}{badge}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.itemActions}>
        <Pressable onPress={onEdit} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.actionBtn}>
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={16} tintColor={theme.text} />
          </ThemedView>
        </Pressable>
        <Pressable onPress={onDelete} style={({ pressed }) => pressed && styles.pressed}>
          <View style={[styles.actionBtn, { backgroundColor: '#FF3B3022' }]}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} tintColor="#FF3B30" />
          </View>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.addButton, { borderColor: theme.backgroundElement }]}>
        <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
          size={20} tintColor={theme.text} />
        <ThemedText type="small" style={{ fontWeight: '600' }}>{label}</ThemedText>
      </View>
    </Pressable>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.emptyState}>
      <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexDirection: 'row', justifyContent: 'center' },
  maxWidth: { flex: 1, maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, gap: Spacing.three },
  segmentCard: { borderRadius: Spacing.two, padding: Spacing.two },
  segmentRow: { flexDirection: 'row', gap: Spacing.one },
  segmentOption: { flex: 1 },
  segmentInner: { alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Spacing.two },
  segmentLabel: { fontSize: 11 },
  listSection: { gap: Spacing.two },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Spacing.two,
    padding: Spacing.three, gap: Spacing.three,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontWeight: '600' },
  expiryBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Spacing.one, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: Spacing.one },
  actionBtn: { width: 34, height: 34, borderRadius: Spacing.one, justifyContent: 'center', alignItems: 'center' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.three,
    justifyContent: 'center',
  },
  emptyState: { borderRadius: Spacing.two, padding: Spacing.four },
  pressed: { opacity: 0.7 },
});
