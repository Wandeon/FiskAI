/**
 * IndexedDB-based offline data storage for PWA
 *
 * Provides offline-first caching for critical business data:
 * - Invoices, expenses, contacts, products
 * - Background sync queue for offline mutations
 */

const DB_NAME = "fiskai-offline"
const DB_VERSION = 1

// Store names for different data types
export const STORES = {
  INVOICES: "invoices",
  EXPENSES: "expenses",
  CONTACTS: "contacts",
  PRODUCTS: "products",
  SYNC_QUEUE: "syncQueue",
  CACHE_META: "cacheMeta",
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

export interface SyncQueueItem {
  id: string
  action: "create" | "update" | "delete"
  store: StoreName
  data: Record<string, unknown>
  timestamp: number
  retries: number
}

export interface CacheMeta {
  store: StoreName
  lastSync: number
  version: number
}

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * Open or create the IndexedDB database
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores for business data
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        const invoiceStore = db.createObjectStore(STORES.INVOICES, { keyPath: "id" })
        invoiceStore.createIndex("companyId", "companyId", { unique: false })
        invoiceStore.createIndex("updatedAt", "updatedAt", { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.EXPENSES)) {
        const expenseStore = db.createObjectStore(STORES.EXPENSES, { keyPath: "id" })
        expenseStore.createIndex("companyId", "companyId", { unique: false })
        expenseStore.createIndex("updatedAt", "updatedAt", { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
        const contactStore = db.createObjectStore(STORES.CONTACTS, { keyPath: "id" })
        contactStore.createIndex("companyId", "companyId", { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: "id" })
        productStore.createIndex("companyId", "companyId", { unique: false })
      }

      // Sync queue for offline mutations
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" })
        syncStore.createIndex("timestamp", "timestamp", { unique: false })
      }

      // Cache metadata for sync tracking
      if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
        db.createObjectStore(STORES.CACHE_META, { keyPath: "store" })
      }
    }
  })

  return dbPromise
}

/**
 * Get all items from a store
 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as T[])
  })
}

/**
 * Get items by company ID
 */
export async function getByCompany<T>(storeName: StoreName, companyId: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const index = store.index("companyId")
    const request = index.getAll(companyId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as T[])
  })
}

/**
 * Get a single item by ID
 */
export async function getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.get(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as T | undefined)
  })
}

/**
 * Put (insert or update) an item
 */
export async function put<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.put(item)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Put multiple items in a batch
 */
export async function putMany<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)

    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()

    for (const item of items) {
      store.put(item)
    }
  })
}

/**
 * Delete an item by ID
 */
export async function remove(storeName: StoreName, id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Clear all items from a store
 */
export async function clear(storeName: StoreName): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.clear()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Add an item to the sync queue for background sync
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">) {
  const queueItem: SyncQueueItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    retries: 0,
  }
  await put(STORES.SYNC_QUEUE, queueItem)
  return queueItem
}

/**
 * Get all pending sync queue items
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAll<SyncQueueItem>(STORES.SYNC_QUEUE)
}

/**
 * Remove an item from the sync queue
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  await remove(STORES.SYNC_QUEUE, id)
}

/**
 * Update cache metadata for a store
 */
export async function updateCacheMeta(storeName: StoreName): Promise<void> {
  const meta: CacheMeta = {
    store: storeName,
    lastSync: Date.now(),
    version: DB_VERSION,
  }
  await put(STORES.CACHE_META, meta as CacheMeta & { id: string })
}

/**
 * Get cache metadata for a store
 */
export async function getCacheMeta(storeName: StoreName): Promise<CacheMeta | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHE_META, "readonly")
    const store = transaction.objectStore(STORES.CACHE_META)
    const request = store.get(storeName)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result as CacheMeta | undefined)
  })
}

/**
 * Check if cached data is stale (older than maxAge in milliseconds)
 */
export async function isCacheStale(storeName: StoreName, maxAge: number): Promise<boolean> {
  const meta = await getCacheMeta(storeName)
  if (!meta) return true
  return Date.now() - meta.lastSync > maxAge
}
