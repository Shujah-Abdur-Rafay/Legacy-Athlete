import { collection, getDocs, writeBatch, doc, serverTimestamp, setDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PRICING_TIERS, ROADMAP_STEPS } from '../../constants';

const DEFAULT_SCHEDULE = [
  { day: 0, times: [] },
  { day: 1, times: [{ h: 18, m: 30, focus: 'Speed & Agility (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Total Skills/IQ/Gameplay (GS)', duration: 60 }] },
  { day: 2, times: [{ h: 18, m: 30, focus: 'Strength + Power (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Shooting (300+) (GS)', duration: 60 }] },
  { day: 3, times: [{ h: 18, m: 30, focus: 'Mobility + Cond. (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Ball Handling (GS)', duration: 60 }] },
  { day: 4, times: [{ h: 18, m: 30, focus: 'Speed & Agility (GS)', duration: 30 }, { h: 19, m: 0, focus: 'Total Skills/IQ/Gameplay (GS)', duration: 60 }] },
  { day: 5, times: [] },
  { day: 6, times: [{ h: 8, m: 0, focus: 'Select Practice (GS)', duration: 60 }, { h: 9, m: 0, focus: 'Strength + Power (GS)', duration: 30 }, { h: 9, m: 30, focus: 'Game prep: footwork and skills (GS)', duration: 60 }] },
];

const PACKAGE_PRICE_CENTS: Record<string, number> = {
  'drop-in': 2250,
  '1x-week': 17900,
  '2x-week': 25900,
  '3x-week': 30900,
  '4x-week': 35900,
  'performance-solo': 9900,
  'camp-weekly': 24900,
  'camp-early-bird': 22900,
  'camp-day-pass': 6500,
};

export async function seedScheduleIfEmpty() {
  const snap = await getDocs(collection(db, 'schedule_templates'));
  if (!snap.empty) return false;
  const batch = writeBatch(db);
  for (const day of DEFAULT_SCHEDULE) {
    batch.set(doc(db, 'schedule_templates', String(day.day)), {
      day: day.day,
      times: day.times,
      active: true,
      updatedAt: serverTimestamp(),
    });
  }
  batch.set(doc(db, 'schedule_meta', 'version'), { version: 1, updatedAt: serverTimestamp() });
  await batch.commit();
  return true;
}

export async function seedPackagesIfEmpty() {
  const snap = await getDocs(collection(db, 'packages'));
  if (!snap.empty) return false;
  const batch = writeBatch(db);
  PRICING_TIERS.forEach((tier, i) => {
    batch.set(doc(db, 'packages', tier.id), {
      ...tier,
      priceCents: PACKAGE_PRICE_CENTS[tier.id] ?? Math.round(parseFloat(tier.price.replace(/,/g, '')) * 100),
      order: i,
      active: true,
      updatedAt: serverTimestamp(),
    });
  });
  batch.set(doc(db, 'packages', 'performance-addon-config'), {
    id: 'performance-addon-config',
    name: 'PERFORMANCE ADD-ON',
    description: 'Add-on pricing config (not displayed as a tier)',
    dropInCents: 3500,
    defaultCents: 7900,
    memberMonthly: 79,
    nonMemberMonthly: 99,
    singleSession: 35,
    hidden: true,
    order: 999,
    active: true,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return true;
}

export async function seedEventsIfEmpty() {
  const snap = await getDocs(collection(db, 'events'));
  if (!snap.empty) return false;
  const batch = writeBatch(db);
  ROADMAP_STEPS.forEach((step, i) => {
    batch.set(doc(db, 'events', `event-${step.phase}`), {
      id: `event-${step.phase}`,
      phase: step.phase,
      title: step.title,
      description: step.description,
      tag: step.tag,
      order: i,
      active: true,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return true;
}

export async function bumpScheduleVersion() {
  const ref = doc(db, 'schedule_meta', 'version');
  const current = await getDoc(ref);
  if (current.exists()) {
    await setDoc(ref, { version: increment(1) as any, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(ref, { version: 1, updatedAt: serverTimestamp() });
  }
}
