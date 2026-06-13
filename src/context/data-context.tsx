import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import { Business, Category, Sponsor } from '@/types';

// Firestore rejects undefined values — strip them recursively before any write.
// null values on object properties are converted to deleteField() to remove them from Firestore.
function strip<T>(val: T): T {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(strip) as unknown as T;
  return Object.fromEntries(
    Object.entries(val as object)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, v === null ? deleteField() : strip(v)])
  ) as T;
}

type DataContextValue = {
  businesses: Business[];
  sponsors: Sponsor[];
  categories: Category[];
  loading: boolean;
  refresh(): Promise<void>;
  addSponsor(data: Omit<Sponsor, 'id'>): Promise<void>;
  updateSponsor(id: string, data: Partial<Omit<Sponsor, 'id'>>): Promise<void>;
  deleteSponsor(id: string): Promise<void>;
  addBusiness(data: Omit<Business, 'id'>): Promise<void>;
  updateBusiness(id: string, data: Partial<Omit<Business, 'id'>>): Promise<void>;
  deleteBusiness(id: string): Promise<void>;
  addCategory(data: Omit<Category, 'id'>): Promise<void>;
  updateCategory(id: string, data: Partial<Omit<Category, 'id'>>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let remaining = 3;
    function done() {
      remaining -= 1;
      if (remaining === 0) setLoading(false);
    }

    const unsubSponsors = onSnapshot(
      query(collection(db, 'sponsors'), orderBy('name')),
      (snap) => {
        setSponsors(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sponsor, 'id'>) })));
        done();
      },
      () => done()
    );

    const unsubCategories = onSnapshot(
      query(collection(db, 'categories'), orderBy('name')),
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })));
        done();
      },
      () => done()
    );

    const unsubBusinesses = onSnapshot(
      query(collection(db, 'businesses'), orderBy('name')),
      (snap) => {
        setBusinesses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Business, 'id'>) })));
        done();
      },
      () => done()
    );

    return () => {
      unsubSponsors();
      unsubCategories();
      unsubBusinesses();
    };
  }, []);

  // Sponsors
  async function refresh() {
    const [sponsorsSnap, categoriesSnap, businessesSnap] = await Promise.all([
      getDocs(query(collection(db, 'sponsors'), orderBy('name'))),
      getDocs(query(collection(db, 'categories'), orderBy('name'))),
      getDocs(query(collection(db, 'businesses'), orderBy('name'))),
    ]);

    setSponsors(sponsorsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sponsor, 'id'>) })));
    setCategories(categoriesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })));
    setBusinesses(businessesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Business, 'id'>) })));
  }

  async function addSponsor(data: Omit<Sponsor, 'id'>) {
    await addDoc(collection(db, 'sponsors'), strip(data));
  }
  async function updateSponsor(id: string, data: Partial<Omit<Sponsor, 'id'>>) {
    await updateDoc(doc(db, 'sponsors', id), strip(data));
  }
  async function deleteSponsor(id: string) {
    await deleteDoc(doc(db, 'sponsors', id));
  }

  // Businesses
  async function addBusiness(data: Omit<Business, 'id'>) {
    await addDoc(collection(db, 'businesses'), strip(data));
  }
  async function updateBusiness(id: string, data: Partial<Omit<Business, 'id'>>) {
    await updateDoc(doc(db, 'businesses', id), strip(data));
  }
  async function deleteBusiness(id: string) {
    await deleteDoc(doc(db, 'businesses', id));
  }

  // Categories
  async function addCategory(data: Omit<Category, 'id'>) {
    await addDoc(collection(db, 'categories'), strip(data));
  }
  async function updateCategory(id: string, data: Partial<Omit<Category, 'id'>>) {
    await updateDoc(doc(db, 'categories', id), strip(data));
  }
  async function deleteCategory(id: string) {
    await deleteDoc(doc(db, 'categories', id));
  }

  return (
    <DataContext.Provider
      value={{
        businesses,
        sponsors,
        categories,
        loading,
        refresh,
        addSponsor,
        updateSponsor,
        deleteSponsor,
        addBusiness,
        updateBusiness,
        deleteBusiness,
        addCategory,
        updateCategory,
        deleteCategory,
      }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
