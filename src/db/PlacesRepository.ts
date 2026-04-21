import * as SQLite from 'expo-sqlite';

export interface CachedPlace {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  photo_url: string;
  address?: string;
  maps_url?: string;
  rating?: number;
  user_ratings_total?: number;
  cached_at: number;
}

export const savePlaces = async (db: SQLite.SQLiteDatabase, places: CachedPlace[]) => {
  const statement = await db.prepareAsync(
    'INSERT OR REPLACE INTO places_cache (place_id, name, lat, lng, photo_url, address, maps_url, rating, user_ratings_total, cached_at) VALUES ($place_id, $name, $lat, $lng, $photo_url, $address, $maps_url, $rating, $user_ratings_total, $cached_at)'
  );
  try {
    for (const place of places) {
      await statement.executeAsync({
        $place_id: place.place_id,
        $name: place.name,
        $lat: place.lat,
        $lng: place.lng,
        $photo_url: place.photo_url,
        $address: place.address || '',
        $maps_url: place.maps_url || '',
        $rating: place.rating || null,
        $user_ratings_total: place.user_ratings_total || null,
        $cached_at: place.cached_at,
      });
    }
  } finally {
    await statement.finalizeAsync();
  }
};

export const getCachedPlaces = async (db: SQLite.SQLiteDatabase): Promise<CachedPlace[]> => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  const allRows = await db.getAllAsync<CachedPlace>(
    'SELECT * FROM places_cache WHERE cached_at > ?',
    oneDayAgo
  );
  
  return allRows;
};
