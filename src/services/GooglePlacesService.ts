import axios from 'axios';
import { CachedPlace } from '../db/PlacesRepository';

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AQUI_TU_API_KEY';

export class GooglePlacesService {
  static async getNearbyRestaurants(lat: number, lng: number, radius: number = 5000): Promise<CachedPlace[]> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            location: `${lat},${lng}`,
            radius: radius,
            type: 'restaurant',
            key: GOOGLE_API_KEY,
          },
        }
      );

      if (response.data.status !== 'OK') {
        if (response.data.status === 'REQUEST_DENIED' && GOOGLE_API_KEY === 'AQUI_TU_API_KEY') {
            return this.getMockPlaces(lat, lng);
        }
        return [];
      }

      const results = response.data.results;
      const cachedPlaces: CachedPlace[] = results.map((place: any) => {
        let photo_url = '';
        if (place.photos && place.photos.length > 0) {
          const photo_reference = place.photos[0].photo_reference;
          photo_url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo_reference}&key=${GOOGLE_API_KEY}`;
        } else {
            photo_url = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80';
        }

        const address = place.vicinity || 'Dirección no disponible';
        // Generamos un link fácil e inteligente de Google Maps basado en las coordenadas o place_id
        const maps_url = `https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}&query_place_id=${place.place_id}`;

        return {
          place_id: place.place_id,
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          photo_url,
          address,
          maps_url,
          cached_at: Date.now(),
        };
      });

      return cachedPlaces;
    } catch (error) {
      console.error('Error fetching nearby restaurants:', error);
      return [];
    }
  }
  
  static getMockPlaces(baseLat: number, baseLng: number): CachedPlace[] {
      return [
        {
          place_id: 'mock1',
          name: 'El Gran Taco (Mock)',
          lat: baseLat + 0.002,
          lng: baseLng + 0.002,
          photo_url: 'https://images.unsplash.com/photo-1565299585323-38d5b008e281?auto=format&fit=crop&w=400&q=80',
          address: 'A 200m de ti',
          maps_url: `https://maps.google.com/?q=${baseLat + 0.002},${baseLng + 0.002}`,
          cached_at: Date.now()
        },
        {
          place_id: 'mock2',
          name: 'Bella Italia (Mock)',
          lat: baseLat - 0.003,
          lng: baseLng + 0.001,
          photo_url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80',
          address: 'A 300m de ti',
          maps_url: `https://maps.google.com/?q=${baseLat - 0.003},${baseLng + 0.001}`,
          cached_at: Date.now()
        },
        {
          place_id: 'mock3',
          name: 'Sushi Zen (Mock)',
          lat: baseLat + 0.001,
          lng: baseLng - 0.002,
          photo_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=400&q=80',
          address: 'A 250m de ti',
          maps_url: `https://maps.google.com/?q=${baseLat + 0.001},${baseLng - 0.002}`,
          cached_at: Date.now()
        },
         {
          place_id: 'mock4',
          name: 'Burger Joint (Mock)',
          lat: baseLat - 0.005,
          lng: baseLng - 0.004,
          photo_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
          address: 'A 600m de ti',
          maps_url: `https://maps.google.com/?q=${baseLat - 0.005},${baseLng - 0.004}`,
          cached_at: Date.now()
        },
        {
          place_id: 'mock5',
          name: 'Café Paris (Mock)',
          lat: baseLat + 0.006,
          lng: baseLng - 0.003,
          photo_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
          address: 'A 700m de ti',
          maps_url: `https://maps.google.com/?q=${baseLat + 0.006},${baseLng - 0.003}`,
          cached_at: Date.now()
        },
        {
          place_id: 'mock6',
          name: 'Asador del Sur (Mock)',
          lat: baseLat - 0.001,
          lng: baseLng - 0.001,
          photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
          address: 'A 150m de ti',
          maps_url: `https://maps.google.com/?q=${baseLat - 0.001},${baseLng - 0.001}`,
          cached_at: Date.now()
        }
      ]
  }
}
