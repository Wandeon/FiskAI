/**
 * PWA Offline Support Module
 *
 * Provides offline-first data caching and sync capabilities for the FiskAI PWA.
 *
 * Features:
 * - IndexedDB-based offline data storage
 * - Background sync for offline mutations
 * - React hooks for easy integration
 * - Network-first with cache fallback strategy
 */

// Database operations
export {
  STORES,
  type StoreName,
  type SyncQueueItem,
  type CacheMeta,
  openDB,
  getAll,
  getByCompany,
  getById,
  put,
  putMany,
  remove,
  clear,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  updateCacheMeta,
  getCacheMeta,
  isCacheStale,
} from "./offline-db"

// Offline data manager
export {
  type OfflineDataStore,
  isOnline,
  fetchWithOffline,
  fetchOneWithOffline,
  createWithOffline,
  updateWithOffline,
  deleteWithOffline,
  processSyncQueue,
  getPendingSyncCount,
  clearOfflineData,
} from "./offline-manager"

// React hooks (client-side only)
export {
  useOnlineStatus,
  usePendingSyncCount,
  useOfflineData,
  useOfflineItem,
  useOfflineMutation,
  useBackgroundSync,
} from "./use-offline"
