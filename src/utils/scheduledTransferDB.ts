import { saveScheduledJobToDb, getScheduledJobFromDb, clearScheduledJobFromDb, ScheduledJobFromDB, ScheduledJobMetadata } from '../services/databaseService';

// This is the object that will be returned from the DB
export type { ScheduledJobFromDB, ScheduledJobMetadata };

// The input for saving a job still takes File objects for convenience
export interface ScheduledJob {
    files: File[];
    scheduledTime: number;
    roomId: string;
}

export async function saveScheduledJob(job: ScheduledJob): Promise<void> {
    await saveScheduledJobToDb(job);
}

export async function getScheduledJob(): Promise<ScheduledJobFromDB | null> {
    return await getScheduledJobFromDb();
}

export async function clearScheduledJob(): Promise<void> {
    await clearScheduledJobFromDb();
}
