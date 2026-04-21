import { Platform } from 'react-native';

// En web, expo-sqlite no está disponible (usa wa-sqlite.wasm que no carga en Metro web).
// Creamos una capa de abstracción que funciona en ambas plataformas.

let SQLite: typeof import('expo-sqlite') | null = null;

// Solo importamos expo-sqlite en plataformas nativas
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

export const syncDatabase = async () => {
  if (!SQLite) {
    console.log('Database: skipping SQLite on web platform.');
    return null;
  }

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
