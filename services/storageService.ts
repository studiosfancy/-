import { ShoppingItem } from '../types';

const DB_NAME = 'HouseManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'shopping_items';
const KEY = 'current_list';

const getDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error("IndexedDB error:", request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

export const saveItemsToDB = async (items: ShoppingItem[]): Promise<void> => {
    try {
        const db = await getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(items, KEY);
            
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to save to DB", e);
        throw e;
    }
};

export const loadItemsFromDB = async (): Promise<ShoppingItem[]> => {
    try {
        const db = await getDB();
        return new Promise<ShoppingItem[]>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(KEY);
            
            req.onsuccess = () => {
                resolve(req.result || []);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to load from DB", e);
        return [];
    }
};

export const clearDatabase = async (): Promise<void> => {
    try {
        const db = await getDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear(); // Wipes the entire store
            
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.error("Failed to clear DB", e);
        throw e;
    }
};

export const migrateFromLocalStorage = async (): Promise<ShoppingItem[] | null> => {
    try {
        const json = localStorage.getItem('shopping_items');
        if (json) {
            console.log("Migrating data from LocalStorage to IndexedDB...");
            const items = JSON.parse(json);
            await saveItemsToDB(items);
            // Clear LocalStorage to free up quota immediately
            localStorage.removeItem('shopping_items');
            return items;
        }
    } catch (e) {
        console.error("Migration failed", e);
    }
    return null;
};