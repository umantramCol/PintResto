import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  place_id: string;
  name: string;
  photo_url: string;
  rating?: number;
  onPress: (place_id: string) => void;
}

// Altura pseudo-aleatoria determinista basada en el nombre del lugar.
// Calculada fuera del componente para no recrearla en cada render.
function getCardHeight(name: string): number {
  const min = 150;
  const max = 280;
  const seed = name.length;
  return min + (seed % 10) * ((max - min) / 10);
}

// React.memo evita re-renders cuando las props primitivas no cambian (regla 2.3, 2.5)
export const RestaurantCard = memo(function RestaurantCard({
  place_id,
  name,
  photo_url,
  rating,
  onPress,
}: Props) {
  const cardHeight = getCardHeight(name);

  return (
    <Pressable style={styles.cardContainer} onPress={() => onPress(place_id)}>
      <Image
        source={{ uri: photo_url }}
        style={[styles.image, { height: cardHeight }]}
        contentFit="cover"
        transition={200}
        // Carga imagen optimizada: 2x el tamaño de display para retina (regla 2.7)
        cachePolicy="memory-disk"
      />
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
        {rating ? (
          <Text style={styles.rating}>⭐ {rating.toFixed(1)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  image: {
    width: '100%',
    borderRadius: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 8,
    justifyContent: 'flex-end',
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  rating: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
});
