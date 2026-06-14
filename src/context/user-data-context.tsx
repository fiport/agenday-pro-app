import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { Appointment } from '@/types';

type AddAppointmentParams = {
  businessId: string;
  businessName: string;
  businessWhatsapp: string;
  serviceName: string;
  clientPhone: string;
  clientName: string;
  clientAvatarUrl?: string;
};

type UserDataContextValue = {
  favoriteIds: string[];
  toggleFavorite: (businessId: string) => Promise<void>;
  appointments: Appointment[];
  addAppointment: (params: AddAppointmentParams) => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      setAppointments([]);
      return;
    }

    if (isAdmin) {
      setFavoriteIds([]);
      setAppointments([]);
      return;
    }

    // Favorites from Firestore user doc
    const unsub1 = onSnapshot(doc(db, 'users', user.phone), (snap) => {
      const data = snap.data();
      setFavoriteIds(Array.isArray(data?.favoriteIds) ? (data!.favoriteIds as string[]) : []);
    });

    // Appointments from Firestore filtered by clientPhone
    const apptQuery = query(
      collection(db, 'appointments'),
      where('clientPhone', '==', user.phone),
      orderBy('createdAt', 'desc')
    );
    const unsub2 = onSnapshot(apptQuery, (snap) => {
      setAppointments(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, 'id'>) }))
      );
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.phone, isAdmin]);

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
      setFavoriteIds(favoriteIds);
    }
  }

  async function addAppointment(params: AddAppointmentParams) {
    await addDoc(collection(db, 'appointments'), {
      ...params,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <UserDataContext.Provider value={{ favoriteIds, toggleFavorite, appointments, addAppointment }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used within UserDataProvider');
  return ctx;
}
