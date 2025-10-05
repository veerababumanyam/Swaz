import initSqlJs, { Database } from 'sql.js';
import { TransferHistoryEntry } from '../types';

export interface ScheduledJobMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface ScheduledJobFromDB {
  roomId: string;
  scheduledTime: number;
  fileMetadata: ScheduledJobMetadata[];
}

let db: Database | null = null;
const DB_STORAGE_KEY = 'swaz-sqlite-db';

// This promise ensures the async initialization only happens once.
let dbInitializationPromise: Promise<Database> | null = null;

async function initializeDatabase(): Promise<Database> {
  if (db) return db;

  if (!dbInitializationPromise) {
    dbInitializationPromise = new Promise(async (resolve, reject) => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file: string) => `/${file}` // Points to the public folder for sql-wasm.wasm
        });
        
        const dbFromStorage = localStorage.getItem(DB_STORAGE_KEY);
        if (dbFromStorage) {
          const dbArray = dbFromStorage.split(',').map(Number);
          db = new SQL.Database(new Uint8Array(dbArray));
        } else {
          db = new SQL.Database();
          db.run(`
            CREATE TABLE transfer_history (
              id TEXT PRIMARY KEY,
              fileName TEXT,
              fileSize INTEGER,
              date INTEGER,
              status TEXT,
              fileType TEXT,
              duration INTEGER,
              averageSpeed REAL
            );
            CREATE TABLE scheduled_jobs (
              key TEXT PRIMARY KEY,
              roomId TEXT,
              scheduledTime INTEGER,
              fileMetadata TEXT
            );
          `);
          persistDatabase();
        }
        resolve(db);
      } catch (e) {
        console.error("Failed to initialize SQLite database:", e);
        reject(e);
      }
    });
  }
  
  return dbInitializationPromise;
}

function persistDatabase() {
  if (!db) return;
  try {
    const dbArray = db.export();
    localStorage.setItem(DB_STORAGE_KEY, dbArray.toString());
  } catch (e) {
    console.error("Failed to save database to localStorage:", e);
  }
}

// --- History Functions ---

export async function getHistoryFromDb(): Promise<TransferHistoryEntry[]> {
  const db = await initializeDatabase();
  const res = db.exec("SELECT * FROM transfer_history ORDER BY date DESC");
  if (!res[0]) return [];

  const entries: TransferHistoryEntry[] = res[0].values.map((row: any[]) => ({
    id: row[0] as string,
    fileName: row[1] as string,
    fileSize: row[2] as number,
    date: row[3] as number,
    status: row[4] as 'Sent' | 'Received' | 'Canceled',
    fileType: row[5] as string,
    duration: row[6] as number,
    averageSpeed: row[7] as number,
  }));
  return entries;
}

export async function addHistoryEntryToDb(entry: TransferHistoryEntry): Promise<void> {
  const db = await initializeDatabase();
  db.run(
    "INSERT INTO transfer_history (id, fileName, fileSize, date, status, fileType, duration, averageSpeed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [entry.id, entry.fileName, entry.fileSize, entry.date, entry.status, entry.fileType, entry.duration, entry.averageSpeed]
  );
  persistDatabase();
}

export async function clearHistoryFromDb(): Promise<void> {
  const db = await initializeDatabase();
  db.run("DELETE FROM transfer_history");
  persistDatabase();
}


// --- Scheduled Job Functions ---

export async function saveScheduledJobToDb(job: {
  roomId: string;
  scheduledTime: number;
  files: File[];
}): Promise<void> {
  const db = await initializeDatabase();
  
  const fileMetadata: ScheduledJobMetadata[] = job.files.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  }));

  db.run(
    "INSERT OR REPLACE INTO scheduled_jobs (key, roomId, scheduledTime, fileMetadata) VALUES (?, ?, ?, ?)",
    ['current_job', job.roomId, job.scheduledTime, JSON.stringify(fileMetadata)]
  );
  persistDatabase();
}

export async function getScheduledJobFromDb(): Promise<ScheduledJobFromDB | null> {
  const db = await initializeDatabase();
  const res = db.exec("SELECT roomId, scheduledTime, fileMetadata FROM scheduled_jobs WHERE key = 'current_job'");
  
  if (!res[0] || !res[0].values[0]) {
    return null;
  }
  
  const row = res[0].values[0];
  return {
    roomId: row[0] as string,
    scheduledTime: row[1] as number,
    fileMetadata: JSON.parse(row[2] as string),
  };
}

export async function clearScheduledJobFromDb(): Promise<void> {
  const db = await initializeDatabase();
  db.run("DELETE FROM scheduled_jobs WHERE key = 'current_job'");
  persistDatabase();
}
