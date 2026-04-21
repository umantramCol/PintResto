import * as SQLite from 'expo-sqlite';

export const syncDatabase = async () => {
  const db = await SQLite.openDatabaseAsync('pintresto.db');
  
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS places_cache (
      place_id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      photo_url TEXT,
      address TEXT,
      maps_url TEXT,
      rating REAL,
      user_ratings_total INTEGER,
      cached_at INTEGER NOT NULL
    );
  `);
  
  console.log('Database initialized successfully.');
  return db;
};
