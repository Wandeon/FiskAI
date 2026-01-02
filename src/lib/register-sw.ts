import { processSyncQueue } from "./pwa/offline-manager"

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope)

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "SYNC_OFFLINE_DATA") {
            // Trigger sync of offline data from IndexedDB
            void processSyncQueue().then((result) => {
              console.log("Sync completed:", result)
            })
          }
        })

        // Register for background sync if supported
        if ("sync" in registration) {
          // Request sync when online
          window.addEventListener("online", () => {
            void (registration as ServiceWorkerRegistration & { sync: SyncManager }).sync
              .register("sync-offline-data")
              .catch((err: Error) => console.log("Background sync registration failed:", err))
          })
        }
      })
      .catch((error) => {
        console.log("SW registration failed:", error)
      })
  })
}

// Type declaration for SyncManager
interface SyncManager {
  register(tag: string): Promise<void>
}
