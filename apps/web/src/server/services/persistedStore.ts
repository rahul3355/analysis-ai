import fs from "fs";
import path from "path";

const STORE_DIR = path.join(process.cwd(), ".analysis-ai");
const STORE_PATH = path.join(STORE_DIR, "documents.json");

export interface StoreRecord {
  documentId: string;
  fileName: string;
  fileSize: number;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
  chunkCount: number;
  uploadedAt: string;
  storageUrl: string;
}

function ensureDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function loadAll(): Map<string, StoreRecord> {
  try {
    ensureDir();
    if (!fs.existsSync(STORE_PATH)) return new Map();
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const arr: StoreRecord[] = JSON.parse(raw);
    const map = new Map<string, StoreRecord>();
    for (const r of arr) map.set(r.documentId, r);
    return map;
  } catch (err) {
    console.error("[persistedStore] Failed to load store, starting fresh:", err);
    return new Map();
  }
}

function saveAll(map: Map<string, StoreRecord>): void {
  ensureDir();
  const arr = Array.from(map.values());
  const tmp = STORE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), "utf-8");
  fs.renameSync(tmp, STORE_PATH);
}

// Module-level in-memory store (always authoritative)
const store = loadAll();

// Debounced persistence: batches disk writes
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveAll(store);
  }, 500);
}

function flushSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveAll(store);
}

export function getRecord(docId: string): StoreRecord | undefined {
  return store.get(docId);
}

export function getAllRecords(): StoreRecord[] {
  return Array.from(store.values());
}

export function setRecord(record: StoreRecord): void {
  store.set(record.documentId, record);
  // Only persist immediately on terminal states; debounce intermediate updates
  if (record.status === "ready" || record.status === "error") {
    flushSave();
  } else {
    scheduleSave();
  }
}

export function deleteRecord(docId: string): boolean {
  const existed = store.delete(docId);
  if (existed) flushSave();
  return existed;
}
