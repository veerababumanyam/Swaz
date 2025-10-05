import { TransferHistoryEntry } from '../types';

// Import database functions from the src level
import { getHistoryFromDb, addHistoryEntryToDb, clearHistoryFromDb } from '../src/services/databaseService';

// Cache for synchronous access
let historyCache: TransferHistoryEntry[] = [];
let cacheInitialized = false;

// Initialize cache asynchronously
async function initializeCache(): Promise<void> {
    if (!cacheInitialized) {
        try {
            historyCache = await getHistoryFromDb();
            cacheInitialized = true;
        } catch (error) {
            console.error("Failed to initialize history cache from SQLite DB", error);
            historyCache = [];
        }
    }
}

export const getHistory = (): TransferHistoryEntry[] => {
    // Initialize cache if needed (fire and forget)
    if (!cacheInitialized) {
        initializeCache().catch(() => {});
    }
    return historyCache;
};

export const addHistoryEntry = (entryData: Omit<TransferHistoryEntry, 'id' | 'date'>): TransferHistoryEntry[] => {
    const newEntry: TransferHistoryEntry = {
        ...entryData,
        id: `${Date.now()}-${entryData.fileName}`,
        date: Date.now(),
    };

    // Update cache immediately for UI responsiveness
    historyCache = [newEntry, ...historyCache].slice(0, 50);

    // Save to database asynchronously
    addHistoryEntryToDb(newEntry).catch(error => {
        console.error("Failed to save transfer history to SQLite DB", error);
    });

    return historyCache;
};

export const clearHistory = (): TransferHistoryEntry[] => {
    // Clear cache immediately for UI responsiveness
    historyCache = [];

    // Clear database asynchronously
    clearHistoryFromDb().catch(error => {
        console.error("Failed to clear transfer history from SQLite DB", error);
    });

    return historyCache;
};