import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Alert, Modal, Pressable, Linking, ScrollView, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import MasonryList from '@react-native-seoul/masonry-list';
import { Image } from 'expo-image';

import { GooglePlacesService } from '@/src/services/GooglePlacesService';
import { CachedPlace, getCachedPlaces, savePlaces } from '@/src/db/PlacesRepository';
import { RestaurantCard } from '@/src/components/RestaurantCard';

export default function HomeScreen() {
  const [places, setPlaces] = useState<CachedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<CachedPlace | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{open_now?: boolean; weekday_text?: string[]; photos?: string[]}|null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentLocationStr, setCurrentLocationStr] = useState<string>('Obteniendo tu ubicación...');

  const handleSelectPlace = async (place: CachedPlace | null) => {
    setSelectedPlace(place);
    if (place) {
      setLoadingDetails(true);
      setPlaceDetails(null);
      const details = await GooglePlacesService.getPlaceDetails(place.place_id);
      setPlaceDetails(details);
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const db = await SQLite.openDatabaseAsync('pintresto.db');
      
      const cached = await getCachedPlaces(db);
      if (cached.length > 0) {
        setPlaces(cached);
        setLoading(false);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para buscar restaurantes cercanos.');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      // Decodificar la dirección actual
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (geocode && geocode.length > 0) {
          const block = geocode[0];
          setCurrentLocationStr(`${block.street || block.name}, ${block.city || block.region}`);
        } else {
          setCurrentLocationStr('Ubicación encontrada');
        }
      } catch(e) {
        setCurrentLocationStr('Ubicación encontrada');
      }

      // Ampliamos el rango a 5000 metros (5KM)
      const results = await GooglePlacesService.getNearbyRestaurants(
        location.coords.latitude,
        location.coords.longitude,
        5000
      );

      if (results.length > 0) {
        await savePlaces(db, results);
        setPlaces(results);
      } else {
        Alert.alert('Sin resultados', 'No se encontraron restaurantes cerca.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al buscar restaurantes.');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = () => {
    if (selectedPlace?.maps_url) {
      Linking.openURL(selectedPlace.maps_url).catch((err) =>
        Alert.alert('Error', 'No se pudo abrir el enlace de Google Maps.')
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff5252" />
        <Text style={styles.loadingText}>Buscando lugares deliciosos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PintResto</Text>
        <Text style={styles.subtitle}>Cerca de: {currentLocationStr}</Text>
      </View>
      <MasonryList
        data={places}
        keyExtractor={(item): string => item.place_id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <RestaurantCard item={item as CachedPlace} onPress={handleSelectPlace} />}
        contentContainerStyle={styles.masonryContainer}
        onRefresh={fetchRestaurants}
      />

      {/* Modal / Popup de Detalles */}
      <Modal
        visible={!!selectedPlace}
        animationType="slide"
        transparent={true}
        onRequestClose={() => handleSelectPlace(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPlace && (
              <>
                <View style={{ height: '50%', width: '100%' }}>
                  <ScrollView 
                    horizontal 
                    pagingEnabled 
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                  >
                    {(placeDetails?.photos && placeDetails.photos.length > 0 ? placeDetails.photos : [selectedPlace.photo_url]).map((photoUri, index) => (
                      <Image
                        key={index}
                        source={{ uri: photoUri }}
                        style={{ width: SCREEN_WIDTH, height: '100%' }}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                  <View style={styles.carouselIndicators}>
                    {(placeDetails?.photos && placeDetails.photos.length > 0 ? placeDetails.photos : [selectedPlace.photo_url]).map((_, i) => (
                      <View key={i} style={styles.dot} />
                    ))}
                  </View>
                </View>
                <ScrollView contentContainerStyle={styles.modalBody}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                    {selectedPlace.rating ? (
                      <Text style={styles.ratingText}>
                        ⭐ {selectedPlace.rating} ({selectedPlace.user_ratings_total} reseñas)
                      </Text>
                    ) : null}
                    <Text style={styles.modalAddress}>{selectedPlace.address}</Text>

                    {loadingDetails ? (
                      <ActivityIndicator style={{ marginTop: 16 }} size="small" color="#ff5252" />
                    ) : placeDetails ? (
                      <View style={styles.detailsContainer}>
                        {(() => {
                           const statusText = placeDetails.open_now ? 'Abierto ahora' : 'Cerrado';
                           const statusColor = placeDetails.open_now ? '#4CAF50' : '#F44336';
                           
                           let hoursToday = '';
                           if (placeDetails.weekday_text && placeDetails.weekday_text.length > 0) {
                             // En la API de Google Places, weekday_text asume índice 0 = Lunes
                             const todayIdx = (new Date().getDay() + 6) % 7;
                             const todayString = placeDetails.weekday_text[todayIdx] || placeDetails.weekday_text[0];
                             const splitIdx = todayString.indexOf(':');
                             if (splitIdx !== -1) {
                               hoursToday = todayString.slice(splitIdx + 1).trim();
                             } else {
                               hoursToday = todayString;
                             }
                           }

                           return (
                             <Text style={{ fontSize: 16 }}>
                               {placeDetails.open_now !== undefined && (
                                 <Text style={{ fontWeight: 'bold', color: statusColor }}>{statusText}</Text>
                               )}
                               {hoursToday ? <Text style={{ color: '#555' }}> • {hoursToday}</Text> : null}
                             </Text>
                           );
                        })()}
                      </View>
                    ) : null}
                  </View>
                  
                  <View style={styles.modalActions}>
                    <Pressable style={styles.mapsButton} onPress={openGoogleMaps}>
                      <Text style={styles.mapsButtonText}>Abrir en Maps</Text>
                    </Pressable>
                    <Pressable style={styles.closeButton} onPress={() => handleSelectPlace(null)}>
                      <Text style={styles.closeButtonText}>Cerrar</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  masonryContainer: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    overflow: 'hidden',
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  modalBody: {
    padding: 24,
    flex: 1,
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  ratingText: {
    fontSize: 14,
    color: '#E6A11D',
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalAddress: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    lineHeight: 22,
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  openStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  hoursContainer: {
    marginTop: 8,
  },
  hoursTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 4,
  },
  hourText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  mapsButton: {
    flex: 1,
    backgroundColor: '#ff5252',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
