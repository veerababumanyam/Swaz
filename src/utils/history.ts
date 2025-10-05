import { TransferHistoryEntry } from '../types';
import { getHistoryFromDb, addHistoryEntryToDb, clearHistoryFromDb } from '../services/databaseService';

export const getHistory = async (): Promise<TransferHistoryEntry[]> => {
    try {
        return await getHistoryFromDb();
    } catch (error) {
        console.error("Failed to get transfer history from DB", error);
        return [];
    }
};

export const addHistoryEntry = async (entryData: Omit<TransferHistoryEntry, 'id' | 'date'>): Promise<void> => {
    const newEntry: TransferHistoryEntry = {
        ...entryData,
        id: `${Date.now()}-${entryData.fileName}`,
        date: Date.now(),
    };

    try {
        await addHistoryEntryToDb(newEntry);
    } catch (error) {
        console.error("Failed to save transfer history to DB", error);
    }
};

export const clearHistory = async (): Promise<void> => {
    try {
        await clearHistoryFromDb();
    } catch (error) {
        console.error("Failed to clear transfer history from DB", error);
    }
};
