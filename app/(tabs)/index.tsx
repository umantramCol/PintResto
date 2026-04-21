import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import MasonryList from '@react-native-seoul/masonry-list';
import { Image } from 'expo-image';

import { GooglePlacesService } from '@/src/services/GooglePlacesService';
import { CachedPlace, getCachedPlaces, savePlaces } from '@/src/db/PlacesRepository';
import { RestaurantCard } from '@/src/components/RestaurantCard';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface PlaceDetails {
  open_now?: boolean;
  weekday_text?: string[];
  photos?: string[];
}

// ---------------------------------------------------------------------------
// renderItem hoisted fuera del componente para una referencia estable (regla 2.1, 2.2)
// Recibe onPress y el mapa de places por place_id para pasar primitivos (regla 2.5)
// ---------------------------------------------------------------------------
type RenderItemArgs = {
  item: CachedPlace;
};

export default function HomeScreen() {
  const [places, setPlaces] = useState<CachedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CachedPlace | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentLocationStr, setCurrentLocationStr] = useState<string>('Obteniendo tu ubicación...');

  // useCallback para estabilizar la referencia del handler (regla 2.2)
  const handleSelectPlace = useCallback(async (place_id: string | null) => {
    if (!place_id) {
      setSelectedPlace(null);
      setPlaceDetails(null);
      return;
    }
    const place = places.find((p) => p.place_id === place_id) ?? null;
    setSelectedPlace(place);
    if (place) {
      setLoadingDetails(true);
      setPlaceDetails(null);
      const details = await GooglePlacesService.getPlaceDetails(place.place_id);
      setPlaceDetails(details);
      setLoadingDetails(false);
    }
  }, [places]);

  // renderItem con referencia estable usando useCallback (regla 2.1, 2.2)
  // MasonryList tipifica item como unknown, hacemos el cast aquí para mantener la seguridad de tipos
  const renderItem = useCallback(({ item }: { item: unknown }) => {
    const place = item as CachedPlace;
    return (
      <RestaurantCard
        place_id={place.place_id}
        name={place.name}
        photo_url={place.photo_url}
        rating={place.rating}
        onPress={handleSelectPlace}
      />
    );
  }, [handleSelectPlace]);

  // keyExtractor estable (regla 2.2)
  const keyExtractor = useCallback((item: CachedPlace): string => item.place_id, []);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const db = await SQLite.openDatabaseAsync('pintresto.db');

      // Solo usa cache si NO es un refresh manual
      if (!isRefresh) {
        const cached = await getCachedPlaces(db);
        if (cached.length > 0) {
          setPlaces(cached);
          setLoading(false);
          return;
        }
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para buscar restaurantes cercanos.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});

      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geocode.length > 0) {
          const block = geocode[0];
          setCurrentLocationStr(`${block.street || block.name}, ${block.city || block.region}`);
        } else {
          setCurrentLocationStr('Ubicación encontrada');
        }
      } catch {
        setCurrentLocationStr('Ubicación encontrada');
      }

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
      setRefreshing(false);
    }
  };

  // useCallback para estabilizar (regla 2.2)
  const handleRefresh = useCallback(() => fetchRestaurants(true), []);

  // useCallback para estabilizar (regla 2.2)
  const openGoogleMaps = useCallback(() => {
    if (selectedPlace?.maps_url) {
      Linking.openURL(selectedPlace.maps_url).catch(() =>
        Alert.alert('Error', 'No se pudo abrir el enlace de Google Maps.')
      );
    }
  }, [selectedPlace]);

  const closeModal = useCallback(() => handleSelectPlace(null), [handleSelectPlace]);

  // Memoizar el array de fotos para evitar recrearlo en cada render (regla 2.4)
  const carouselPhotos = useMemo<string[]>(() => {
    if (placeDetails?.photos && placeDetails.photos.length > 0) {
      return placeDetails.photos;
    }
    return selectedPlace?.photo_url ? [selectedPlace.photo_url] : [];
  }, [placeDetails?.photos, selectedPlace?.photo_url]);

  // Calcular estado/horas del lugar (derivado, no estado adicional) (regla 6.1)
  const openStatusText = useMemo(() => {
    if (!placeDetails) return null;
    const isOpen = placeDetails.open_now;
    const statusText = isOpen ? 'Abierto ahora' : 'Cerrado';
    const statusColor = isOpen ? '#4CAF50' : '#F44336';

    let hoursToday = '';
    if (placeDetails.weekday_text && placeDetails.weekday_text.length > 0) {
      const todayIdx = (new Date().getDay() + 6) % 7;
      const todayString = placeDetails.weekday_text[todayIdx] || placeDetails.weekday_text[0];
      const splitIdx = todayString.indexOf(':');
      hoursToday = splitIdx !== -1 ? todayString.slice(splitIdx + 1).trim() : todayString;
    }

    return { statusText, statusColor, hoursToday, isDefined: isOpen !== undefined };
  }, [placeDetails]);

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
        {/* Usa ternario en vez de && para evitar render de string vacío (regla 1.1) */}
        <Text style={styles.subtitle}>
          {currentLocationStr ? `Cerca de: ${currentLocationStr}` : 'Obteniendo ubicación...'}
        </Text>
      </View>

      <MasonryList
        data={places}
        keyExtractor={keyExtractor}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        contentContainerStyle={styles.masonryContainer}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Modal de Detalles */}
      <Modal
        visible={!!selectedPlace}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPlace ? (
              <>
                {/* Carousel de fotos — usa el array memoizado (regla 2.4) */}
                <View style={styles.carouselContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.carouselScroll}
                  >
                    {carouselPhotos.map((photoUri, index) => (
                      <Image
                        key={index}
                        source={{ uri: photoUri }}
                        style={styles.carouselImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ))}
                  </ScrollView>
                  <View style={styles.carouselIndicators}>
                    {carouselPhotos.map((_, i) => (
                      <View key={i} style={styles.dot} />
                    ))}
                  </View>
                </View>

                <ScrollView contentContainerStyle={styles.modalBody}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                    {/* Ternario con null en vez de && (regla 1.1) */}
                    {selectedPlace.rating ? (
                      <Text style={styles.ratingText}>
                        ⭐ {selectedPlace.rating} ({selectedPlace.user_ratings_total} reseñas)
                      </Text>
                    ) : null}
                    <Text style={styles.modalAddress}>{selectedPlace.address}</Text>

                    {loadingDetails ? (
                      <ActivityIndicator style={styles.detailsLoader} size="small" color="#ff5252" />
                    ) : openStatusText ? (
                      <View style={styles.detailsContainer}>
                        <Text style={styles.statusText}>
                          {/* Ternario en vez de && para evitar crash con open_now=false (regla 1.1) */}
                          {openStatusText.isDefined ? (
                            <Text style={{ fontWeight: 'bold', color: openStatusText.statusColor }}>
                              {openStatusText.statusText}
                            </Text>
                          ) : null}
                          {openStatusText.hoursToday ? (
                            <Text style={styles.hoursText}> • {openStatusText.hoursToday}</Text>
                          ) : null}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.modalActions}>
                    <Pressable style={styles.mapsButton} onPress={openGoogleMaps}>
                      <Text style={styles.mapsButtonText}>Abrir en Maps</Text>
                    </Pressable>
                    <Pressable style={styles.closeButton} onPress={closeModal}>
                      <Text style={styles.closeButtonText}>Cerrar</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Todos los estilos en StyleSheet.create — sin inline objects (regla 9.2)
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    overflow: 'hidden',
  },
  // Carousel — inline styles eliminados, ahora en StyleSheet (regla 9.2)
  carouselContainer: {
    height: '45%',
    width: '100%',
  },
  carouselScroll: {
    flex: 1,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: '100%',
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
    flexGrow: 1,
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
  detailsLoader: {
    marginTop: 16,
  },
  statusText: {
    fontSize: 16,
  },
  hoursText: {
    color: '#555',
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
