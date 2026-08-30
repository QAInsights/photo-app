/**
 * The xAI API key, kept in this browser only and encrypted at rest.
 *
 * A random AES-256-GCM data key is generated once and stored in IndexedDB as
 * a NON-extractable CryptoKey — its raw bytes can never be read back out of
 * storage, only used by WebCrypto here. The key itself is stored beside it as
 * ciphertext + IV.
 *
 * Threat model, honestly: this protects the key at rest on this device
 * (storage inspectors, exported profiles, backup dumps). It cannot protect
 * against live code running in the page's own context.
 */

const DB_NAME = "northlight";
const DB_VERSION = 1;
const STORE = "settings";
const KEY_RECORD = "xai-key";
const SECRET_RECORD = "xai-secret";

type KeyRecord = { id: string; key: CryptoKey };
type SecretRecord = { id: string; iv: Uint8Array; data: Uint8Array };

function storageAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Settings storage failed."));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open settings storage."));
  });
}

async function getRecord<T>(id: string): Promise<T | undefined> {
  const db = await openDb();
  try {
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    return await requestToPromise(store.get(id) as IDBRequest<T | undefined>);
  } finally {
    db.close();
  }
}

async function putRecord<T extends { id: string }>(record: T): Promise<void> {
  const db = await openDb();
  try {
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    await requestToPromise(store.put(record));
  } finally {
    db.close();
  }
}

async function deleteRecords(ids: string[]): Promise<void> {
  const db = await openDb();
  try {
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    for (const id of ids) await requestToPromise(store.delete(id));
  } finally {
    db.close();
  }
}

async function getDataKey(): Promise<CryptoKey> {
  const existing = await getRecord<KeyRecord>(KEY_RECORD);
  if (existing?.key) return existing.key;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await putRecord({ id: KEY_RECORD, key });
  return key;
}

/** The decrypted key, or null when none is stored (or it fails to decrypt). */
export async function loadBrowserApiKey(): Promise<string | null> {
  if (!storageAvailable()) return null;
  try {
    const secret = await getRecord<SecretRecord>(SECRET_RECORD);
    if (!secret) return null;
    const keyRecord = await getRecord<KeyRecord>(KEY_RECORD);
    if (!keyRecord?.key) {
      await deleteRecords([SECRET_RECORD]);
      return null;
    }
    // Copy into ArrayBuffer-backed views — structured clone from IndexedDB
    // hands back ArrayBufferLike, which WebCrypto's types refuse.
    const iv = new Uint8Array(secret.iv);
    const data = new Uint8Array(secret.data);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyRecord.key, data);
    return new TextDecoder().decode(plain);
  } catch {
    await clearBrowserApiKey().catch(() => {});
    return null;
  }
}

export async function saveBrowserApiKey(apiKey: string): Promise<void> {
  if (!storageAvailable()) {
    throw new Error("This browser has no settings storage.");
  }
  const dataKey = await getDataKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dataKey, new TextEncoder().encode(apiKey)),
  );
  await putRecord({ id: SECRET_RECORD, iv, data });
}

export async function clearBrowserApiKey(): Promise<void> {
  if (!storageAvailable()) return;
  await deleteRecords([SECRET_RECORD, KEY_RECORD]);
}
