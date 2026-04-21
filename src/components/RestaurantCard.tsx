import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { CachedPlace } from '../db/PlacesRepository';

interface Props {
  item: CachedPlace;
  onPress: (item: CachedPlace) => void;
}

export const RestaurantCard: React.FC<Props> = ({ item, onPress }) => {
  // Generar altura pseudo-aleatoria (estilo masonry realístico) o constante.
  const randomHeight = useMemo(() => {
    const min = 150;
    const max = 280;
    const seed = item.name.length; 
    return min + (seed % 10) * ((max - min) / 10);
  }, [item.name]);

  return (
    <Pressable style={styles.cardContainer} onPress={() => onPress(item)}>
      <Image
        source={{ uri: item.photo_url }}
        style={[styles.image, { height: randomHeight }]}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.overlay}>
        <Text style={styles.title} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#333',
    // Sombras
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
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
