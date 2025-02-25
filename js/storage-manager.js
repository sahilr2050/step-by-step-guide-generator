const StorageManager = {
    // Initialize IndexedDB
    initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("GuideScreenshots", 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains("screenshots")) {
                    db.createObjectStore("screenshots", { keyPath: "id" });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    // Save a screenshot to IndexedDB
    saveScreenshot(key, screenshot) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this.initDatabase().then(db => {
                    this._saveScreenshotToDb(key, screenshot, resolve, reject);
                }).catch(reject);
            } else {
                this._saveScreenshotToDb(key, screenshot, resolve, reject);
            }
        });
    },

    _saveScreenshotToDb(key, screenshot, resolve, reject) {
        try {
            const transaction = this.db.transaction(["screenshots"], "readwrite");
            const store = transaction.objectStore("screenshots");

            const data = {
                id: key,
                data: screenshot,
                timestamp: Date.now()
            };

            const request = store.put(data);

            request.onsuccess = () => resolve(key);
            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    },

    // Get a screenshot from IndexedDB
    getScreenshot(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this.initDatabase().then(db => {
                    this._getScreenshotFromDb(key, resolve, reject);
                }).catch(reject);
            } else {
                this._getScreenshotFromDb(key, resolve, reject);
            }
        });
    },

    _getScreenshotFromDb(key, resolve, reject) {
        try {
            const transaction = this.db.transaction(["screenshots"], "readonly");
            const store = transaction.objectStore("screenshots");
            const request = store.get(key);

            request.onsuccess = (event) => {
                const result = event.target.result;
                resolve(result ? result.data : null);
            };

            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    },

    // Delete a screenshot
    deleteScreenshot(key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this.initDatabase().then(db => {
                    this._deleteScreenshotFromDb(key, resolve, reject);
                }).catch(reject);
            } else {
                this._deleteScreenshotFromDb(key, resolve, reject);
            }
        });
    },

    _deleteScreenshotFromDb(key, resolve, reject) {
        try {
            const transaction = this.db.transaction(["screenshots"], "readwrite");
            const store = transaction.objectStore("screenshots");
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    },

    // Delete all screenshots for a guide
    deleteGuideScreenshots(guideId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                this.initDatabase().then(db => {
                    this._deleteGuideScreenshotsFromDb(guideId, resolve, reject);
                }).catch(reject);
            } else {
                this._deleteGuideScreenshotsFromDb(guideId, resolve, reject);
            }
        });
    },

    _deleteGuideScreenshotsFromDb(guideId, resolve, reject) {
        try {
            const transaction = this.db.transaction(["screenshots"], "readwrite");
            const store = transaction.objectStore("screenshots");
            const keyRange = IDBKeyRange.bound(
                `${guideId}_0`,
                `${guideId}_${Number.MAX_SAFE_INTEGER}`,
                false,
                false
            );

            const request = store.delete(keyRange);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        } catch (error) {
            reject(error);
        }
    }
};

// Pre-initialize the database when the module loads
StorageManager.initDatabase().catch(console.error);

export default StorageManager;
