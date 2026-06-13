import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';

import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types';

const SESSION_KEY = '@agenday:user';

type AuthContextType = {
  user: User | null;
  ready: boolean;
  login: (phone: string, password: string) => Promise<User | null>;
  register: (name: string, phone: string, password: string) => Promise<User>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  updateProfile: (name: string, avatarUrl?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  resetPassword: (phone: string, newPassword: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function resolveRole(phone: string): UserRole {
  const adminPhone = process.env.EXPO_PUBLIC_ADMIN_PHONE;
  return adminPhone && phone === adminPhone ? 'admin' : 'user';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw) as User);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  async function persist(u: User | null) {
    if (u) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
    setUser(u);
  }

  async function login(phone: string, password: string): Promise<User | null> {
    const isPrimaryAdmin = resolveRole(phone) === 'admin';

    if (isPrimaryAdmin) {
      const adminPassword = process.env.EXPO_PUBLIC_ADMIN_PASSWORD;
      if (adminPassword && password !== adminPassword) return null;
      const adminName = process.env.EXPO_PUBLIC_ADMIN_NAME ?? 'Administrador';
      const adminUser: User = { id: phone, name: adminName, phone, role: 'admin' };
      await persist(adminUser);
      return adminUser;
    }

    try {
      const snap = await getDoc(doc(db, 'users', phone));
      if (!snap.exists()) return null;
      const data = snap.data() as Omit<User, 'id'> & { password?: string };
      if (data.password && data.password !== password) return null;
      const role: UserRole = data.role === 'admin' ? 'admin' : 'user';
      const found: User = { id: phone, name: data.name, phone, role };
      await persist(found);
      return found;
    } catch {
      return null;
    }
  }

  async function register(name: string, phone: string, password: string): Promise<User> {
    const role = resolveRole(phone);
    const newUser: User = { id: phone, name: name.trim(), phone, role };
    try {
      await setDoc(doc(db, 'users', phone), { name: name.trim(), phone, role, password });
    } catch {
      // Firestore unavailable; keep user in-session only
    }
    await persist(newUser);
    return newUser;
  }

  async function logout() {
    await persist(null);
  }

  async function updateProfile(name: string, avatarUrl?: string) {
    if (!user) return;
    const updated: User = { ...user, name: name.trim(), avatarUrl };
    const isPrimaryAdmin = resolveRole(user.phone) === 'admin' && !user.id.startsWith('firestore');
    try {
      const fields: Record<string, unknown> = { name: name.trim() };
      if (avatarUrl !== undefined) fields.avatarUrl = avatarUrl;
      await setDoc(doc(db, 'users', user.phone), fields, { merge: true });
    } catch {
      // primary admin may not have a Firestore doc — ok
    }
    await persist(updated);
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (!user) return false;
    if (user.phone === process.env.EXPO_PUBLIC_ADMIN_PHONE) return false;
    try {
      const snap = await getDoc(doc(db, 'users', user.phone));
      if (!snap.exists()) return false;
      const data = snap.data() as { password?: string };
      if (data.password !== currentPassword) return false;
      await setDoc(doc(db, 'users', user.phone), { password: newPassword }, { merge: true });
      return true;
    } catch {
      return false;
    }
  }

  async function resetPassword(phone: string, newPassword: string): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'users', phone));
      if (!snap.exists()) return false;
      await setDoc(doc(db, 'users', phone), { password: newPassword }, { merge: true });
      return true;
    } catch {
      return false;
    }
  }

  async function deleteAccount() {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.phone));
    } catch {
      // primary admin has no Firestore doc — ignore
    }
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    } catch {
      // auth/requires-recent-login or no Firebase Auth user — ignore
    }
    await persist(null);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, deleteAccount, updateProfile, changePassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
