import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  limit,
  Firestore,
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';
import { Facility, DigitalWastePassport } from '../src/types';

let dbInstance: Firestore | null = null;
let isInitialized = false;

export function getDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  try {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app, config.firestoreDatabaseId || '(default)');
    isInitialized = true;
    return dbInstance;
  } catch (err) {
    console.warn('Firebase Firestore initialization failed, using local in-memory fallback:', err);
    return null;
  }
}

/**
 * Load all facilities from Firestore collection 'facilities'.
 * If collection is empty, seed it with defaultFacilities.
 */
export async function syncFacilitiesWithFirestore(
  defaultFacilities: Record<string, Facility>
): Promise<Record<string, Facility>> {
  const db = getDb();
  if (!db) return defaultFacilities;

  try {
    const colRef = collection(db, 'facilities');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      console.log('Firestore facilities collection empty, seeding with default facilities...');
      const batch = writeBatch(db);
      for (const [id, fac] of Object.entries(defaultFacilities)) {
        const docRef = doc(db, 'facilities', id);
        batch.set(docRef, { ...fac, synced_at: new Date().toISOString() });
      }
      await batch.commit();
      console.log(`Seeded ${Object.keys(defaultFacilities).length} facilities to Firestore.`);
      return defaultFacilities;
    }

    const loaded: Record<string, Facility> = {};
    snap.forEach((d) => {
      const data = d.data() as Facility;
      loaded[data.id] = data;
    });

    console.log(`Loaded ${Object.keys(loaded).length} facilities from live Firestore.`);
    return loaded;
  } catch (err) {
    console.warn('Failed to sync facilities with Firestore, using local defaults:', err);
    return defaultFacilities;
  }
}

/**
 * Save or update a single facility in Firestore
 */
export async function saveFacilityToFirestore(facility: Facility): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'facilities', facility.id);
    await setDoc(docRef, { ...facility, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`Failed to save facility ${facility.id} to Firestore:`, err);
    return false;
  }
}

/**
 * Record IoT telemetry in Firestore
 */
export async function logTelemetryToFirestore(
  facilityId: string,
  reading: { moisture_pct: number; contamination_flag: boolean }
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const telemetryId = `TEL-${Date.now()}-${facilityId}`;
    const docRef = doc(db, 'sensor_telemetry', telemetryId);
    await setDoc(docRef, {
      facility_id: facilityId,
      ...reading,
      recorded_at: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn(`Failed to log telemetry to Firestore:`, err);
    return false;
  }
}

/**
 * Save generated digital waste passports into Firestore
 */
export async function savePassportsToFirestore(passports: DigitalWastePassport[]): Promise<boolean> {
  const db = getDb();
  if (!db || passports.length === 0) return false;

  try {
    const batch = writeBatch(db);
    for (const p of passports) {
      const docRef = doc(db, 'passports', p.record_hash);
      batch.set(docRef, {
        ...p,
        synced_at: new Date().toISOString(),
      });
    }
    await batch.commit();
    console.log(`Saved ${passports.length} waste passports to Firestore.`);
    return true;
  } catch (err) {
    console.warn('Failed to save passports to Firestore:', err);
    return false;
  }
}

/**
 * Fetch passports from Firestore
 */
export async function loadPassportsFromFirestore(): Promise<DigitalWastePassport[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'passports');
    const snap = await getDocs(query(colRef, limit(50)));
    if (snap.empty) return null;

    const list: DigitalWastePassport[] = [];
    snap.forEach((d) => {
      list.push(d.data() as DigitalWastePassport);
    });
    return list;
  } catch (err) {
    console.warn('Failed to load passports from Firestore:', err);
    return null;
  }
}
