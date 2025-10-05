// Import database functions from the src level
import { saveScheduledJobToDb, getScheduledJobFromDb, clearScheduledJobFromDb, ScheduledJobFromDB, ScheduledJobMetadata } from '../src/services/databaseService';

// Re-export types for compatibility
export type { ScheduledJobFromDB, ScheduledJobMetadata };

export interface ScheduledJob {
    files: File[];
    scheduledTime: number;
    roomId: string;
}

// Cache for synchronous access
let scheduledJobCache: ScheduledJobFromDB | null = null;
let cacheInitialized = false;

// Initialize cache asynchronously
async function initializeScheduledJobCache(): Promise<void> {
    if (!cacheInitialized) {
        try {
            scheduledJobCache = await getScheduledJobFromDb();
            cacheInitialized = true;
        } catch (error) {
            console.error("Failed to initialize scheduled job cache from SQLite DB", error);
            scheduledJobCache = null;
        }
    }
}

/**
 * Saves a scheduled transfer job to SQLite DB.
 * Since we only allow one scheduled job at a time, it overwrites any existing job.
 * @param job - The job object containing files, scheduled time, and room ID.
 */
export async function saveScheduledJob(job: ScheduledJob): Promise<void> {
    try {
        await saveScheduledJobToDb(job);
        // Update cache immediately for UI responsiveness
        scheduledJobCache = await getScheduledJobFromDb();
    } catch (error) {
        console.error('Failed to save scheduled job to SQLite DB:', error);
        throw error;
    }
}

/**
 * Retrieves the currently scheduled transfer job from SQLite DB.
 * @returns The job object, or null if no job is found.
 */
export function getScheduledJob(): ScheduledJobFromDB | null {
    // Initialize cache if needed (fire and forget)
    if (!cacheInitialized) {
        initializeScheduledJobCache().catch(() => {});
    }
    return scheduledJobCache;
}

/**
 * Clears any scheduled transfer job from SQLite DB.
 */
export async function clearScheduledJob(): Promise<void> {
    try {
        await clearScheduledJobFromDb();
        // Update cache immediately for UI responsiveness
        scheduledJobCache = null;
    } catch (error) {
        console.error('Failed to clear scheduled job from SQLite DB:', error);
        throw error;
    }
}