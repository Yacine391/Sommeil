export type PhoneUse = "none" | "lt15" | "15-30" | "30-60" | "gt60";
export type AwakeDuration =
  | "lt10"
  | "10-20"
  | "20-30"
  | "30-60"
  | "gt60"
  | "unknown";
export type SleepCompany = "alone" | "together";
export type SportIntensity = "light" | "medium" | "high";
export type ProductUse = "none" | "gummies" | "other" | "private";
export type Ternary = "yes" | "no" | "unknown";
export interface SleepEntry {
  id: string;
  date: string;
  bedTime: string;
  sleepTime: string;
  wakeTime: string;
  outOfBedTime: string;
  rememberedAwakenings: number;
  awakeDuration: AwakeDuration;
  quality: number;
  morningEnergy: number;
  concentration: number;
  phoneUse: PhoneUse;
  company: SleepCompany;
  sport: boolean;
  sportTime?: string;
  sportIntensity?: SportIntensity;
  dream: Ternary;
  sleepThoughts: boolean;
  product: ProductUse;
  comment?: string;
  createdAt: string;
}

const DB = "ysleep",
  STORE = "nights";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) {
        const s = r.result.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("date", "date", { unique: true });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function getEntries(): Promise<SleepEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).getAll();
    r.onsuccess = () =>
      resolve(
        (r.result as SleepEntry[]).sort((a, b) => b.date.localeCompare(a.date)),
      );
    r.onerror = () => reject(r.error);
  });
}
export async function saveEntry(entry: SleepEntry): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite"),
      store = tx.objectStore(STORE),
      lookup = store.index("date").get(entry.date);
    lookup.onsuccess = () =>
      store.put({
        ...entry,
        id: (lookup.result as SleepEntry | undefined)?.id ?? entry.id,
      });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function removeEntry(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function clearEntries(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const awake: Record<AwakeDuration, number> = {
  lt10: 5,
  "10-20": 15,
  "20-30": 25,
  "30-60": 45,
  gt60: 75,
  unknown: 0,
};
export function clockDiff(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number),
    [eh, em] = end.split(":").map(Number);
  let d = eh * 60 + em - (sh * 60 + sm);
  if (d < 0) d += 1440;
  return d;
}
export function metrics(e: SleepEntry) {
  const latency = clockDiff(e.bedTime, e.sleepTime),
    awakeMinutes = awake[e.awakeDuration],
    duration = Math.max(0, clockDiff(e.sleepTime, e.wakeTime) - awakeMinutes);
  const durationPoints = Math.max(0, 35 - Math.abs(duration - 450) / 15),
    continuity = Math.max(
      0,
      20 - e.rememberedAwakenings * 2 - awakeMinutes / 12,
    ),
    latencyPoints = Math.max(0, 15 - Math.max(0, latency - 15) / 4),
    score = Math.round(
      Math.min(
        100,
        durationPoints +
          continuity +
          latencyPoints +
          e.quality * 2 +
          e.morningEnergy,
      ),
    );
  return { latency, awake: awakeMinutes, duration, score };
}
export function formatMinutes(value: number) {
  const v = Math.max(0, Math.round(value)),
    h = Math.floor(v / 60),
    m = v % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}
export const mean = (v: number[]) =>
  v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
export function nightsWithin(entries: SleepEntry[], days: number | null) {
  if (!days) return entries;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days + 1);
  return entries.filter((e) => new Date(`${e.date}T12:00:00`) >= since);
}
export function isWeekend(date: string) {
  const d = new Date(`${date}T12:00:00`).getDay();
  return d === 0 || d === 6;
}
export function summary(entries: SleepEntry[]) {
  return {
    duration: mean(entries.map((e) => metrics(e).duration)),
    latency: mean(entries.map((e) => metrics(e).latency)),
    awakenings: mean(entries.map((e) => e.rememberedAwakenings)),
    awake: mean(entries.map((e) => metrics(e).awake)),
    quality: mean(entries.map((e) => e.quality)),
    energy: mean(entries.map((e) => e.morningEnergy)),
    concentration: mean(entries.map((e) => e.concentration)),
    score: mean(entries.map((e) => metrics(e).score)),
  };
}
export function toCsv(entries: SleepEntry[]) {
  const keys: (keyof SleepEntry)[] = [
    "date",
    "bedTime",
    "sleepTime",
    "wakeTime",
    "outOfBedTime",
    "rememberedAwakenings",
    "awakeDuration",
    "quality",
    "morningEnergy",
    "concentration",
    "phoneUse",
    "company",
    "sport",
    "sportTime",
    "sportIntensity",
    "dream",
    "sleepThoughts",
    "product",
    "comment",
  ];
  const q = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    keys.join(","),
    ...entries.map((e) => keys.map((k) => q(e[k])).join(",")),
  ].join("\n");
}
