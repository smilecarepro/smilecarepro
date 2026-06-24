
const DB_PREFIX = "smilecare_cache_";
const QUEUE_KEY = "smilecare_sync_queue";

export const localDB = {
  // Save GET results — skips large payloads and handles quota overflow gracefully
  save: (path, data) => {
    try {
      const payload = JSON.stringify({ data, timestamp: Date.now() });

      // Skip caching if payload is larger than 150KB to protect localStorage quota
      if (payload.length > 150 * 1024) {
        console.warn(`LocalDB: skipping cache for ${path} (${(payload.length/1024).toFixed(1)}KB too large)`);
        return;
      }

      try {
        localStorage.setItem(DB_PREFIX + path, payload);
      } catch (quotaErr) {
        // Quota exceeded — clear all smilecare cache entries and retry once
        console.warn("LocalDB: quota exceeded, clearing old cache...");
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(DB_PREFIX)) keysToDelete.push(key);
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
        try {
          localStorage.setItem(DB_PREFIX + path, payload);
        } catch (_) {
          // Give up silently — cache unavailable, app still works online
        }
      }
    } catch (e) {
      console.error("LocalDB Save Error:", e);
    }
  },

  // Get cached data
  get: (path) => {
    try {
      const cached = localStorage.getItem(DB_PREFIX + path);
      return cached ? JSON.parse(cached).data : null;
    } catch (e) {
      return null;
    }
  },

  // Add to sync queue
  enqueue: (path, method, body, isMultipart = false) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    queue.push({
      id: Date.now(),
      path,
      method,
      body,
      isMultipart,
      timestamp: Date.now()
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  // Get queue
  getQueue: () => JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"),

  // Clear item from queue
  removeFromQueue: (id) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  }
};
