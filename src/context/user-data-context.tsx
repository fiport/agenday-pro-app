import AsyncStorage from '@react-native-async-storage/async-storage';
import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { Appointment } from '@/types';

type UserDataContextValue = {
  favoriteIds: string[];
  toggleFavorite: (businessId: string) => Promise<void>;
  appointments: Appointment[];
  addAppointment: (businessId: string, businessName: string, serviceName: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const apptKey = user ? `@agenday:appointments:${user.phone}` : null;
  const isAdmin = user?.role === 'admin';

  async function refresh() {
    if (!user) {
      setFavoriteIds([]);
      setAppointments([]);
      return;
    }

    if (!isAdmin) {
      try {
        const snap = await getDoc(doc(db, 'users', user.phone));
        const data = snap.data();
        setFavoriteIds(Array.isArray(data?.favoriteIds) ? (data.favoriteIds as string[]) : []);
      } catch {
        // noop
      }
    }

    if (apptKey) {
      try {
        const raw = await AsyncStorage.getItem(apptKey);
        setAppointments(raw ? (JSON.parse(raw) as Appointment[]) : []);
      } catch {
        // noop
      }
    }
  }

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      setAppointments([]);
      return;
    }

    // Favorites — Firestore (skip for admin who has no Firestore doc)
    if (!isAdmin) {
      getDoc(doc(db, 'users', user.phone))
        .then((snap) => {
          const data = snap.data();
          setFavoriteIds(Array.isArray(data?.favoriteIds) ? (data!.favoriteIds as string[]) : []);
        })
        .catch(() => {});
    }

    // Appointments — AsyncStorage (local history)
    if (apptKey) {
      AsyncStorage.getItem(apptKey)
        .then((raw) => setAppointments(raw ? (JSON.parse(raw) as Appointment[]) : []))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);

  async function toggleFavorite(businessId: string) {
    if (!user || isAdmin) return;
    const isFav = favoriteIds.includes(businessId);
    const next = isFav
      ? favoriteIds.filter((id) => id !== businessId)
      : [...favoriteIds, businessId];
    setFavoriteIds(next);
    try {
      await setDoc(
        doc(db, 'users', user.phone),
        { favoriteIds: isFav ? arrayRemove(businessId) : arrayUnion(businessId) },
        { merge: true }
      );
    } catch {
      // revert on error
      setFavoriteIds(favoriteIds);
    }
  }

  async function addAppointment(businessId: string, businessName: string, serviceName: string) {
    if (!apptKey) return;
    const appt: Appointment = {
      id: Date.now().toString(),
      businessId,
      businessName,
      serviceName,
      createdAt: new Date().toISOString(),
    };
    const next = [appt, ...appointments];
    setAppointments(next);
    await AsyncStorage.setItem(apptKey, JSON.stringify(next));
  }

  return (
    <UserDataContext.Provider value={{ favoriteIds, toggleFavorite, appointments, addAppointment, refresh }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used within UserDataProvider');
  return ctx;
}
