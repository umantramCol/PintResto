# PintResto 🍽️

Aplicación de búsqueda visual de restaurantes cercanos construida con **React Native + Expo**. Muestra un grid estilo Pinterest con fotos de lugares obtenidos vía Google Places API y los guarda localmente en SQLite.

## Stack

- [Expo](https://expo.dev) + [Expo Router](https://docs.expo.dev/router/introduction) (file-based routing)
- Google Places API (búsqueda y detalles de restaurantes)
- `expo-sqlite` (caché local de resultados)
- `expo-image` (imágenes optimizadas con caché)
- `@react-native-seoul/masonry-list` (grid tipo Pinterest)

## Get started

1. Instalar dependencias

   ```bash
   npm install
   ```

2. Configurar la API key en `.env`:

   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
   ```

3. Iniciar la app

   ```bash
   npx expo start
   ```

Podés abrir la app en:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

---

## Mejoras aplicadas — Vercel React Native Skills

> Refactoring aplicado el 21/04/2026 usando la skill `vercel-react-native-skills`.

### `src/db/databaseInit.ts` — Bug crítico corregido
- **Eliminado `DROP TABLE IF EXISTS`** → el cache de restaurantes ahora persiste entre reinicios de la app (antes se borraba en cada apertura)

### `src/components/RestaurantCard.tsx` — Rendimiento
- Envuelto en **`React.memo`** → se re-renderiza solo cuando sus props cambian (regla 2.3)
- Ahora recibe **primitivos** (`place_id`, `name`, `photo_url`, `rating`) en vez del objeto completo → memoización efectiva (regla 2.5)
- La función `getCardHeight` se movió **fuera del componente** → no se recrea en cada render
- Muestra el **rating** en la tarjeta con estrella dorada

### `app/(tabs)/index.tsx` — Múltiples mejoras

| Regla | Cambio |
|-------|--------|
| `2.1 / 2.2` | `renderItem` y `keyExtractor` estables con `useCallback` |
| `2.4` | `carouselPhotos` memoizado con `useMemo` |
| `2.2` | `handleSelectPlace`, `openGoogleMaps`, `closeModal`, `handleRefresh` con `useCallback` |
| `1.1` | `&&` con `open_now` reemplazado por ternarios con `null` (previene crash en producción) |
| `6.1` | Estado `openStatusText` derivado con `useMemo` en vez de lógica inline compleja |
| `9.2` | Todos los inline styles movidos a `StyleSheet.create` |
| UX | `refreshing` prop correctamente implementada con estado dedicado |

---

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/)

## Join the community

- [Expo on GitHub](https://github.com/expo/expo)
- [Discord community](https://chat.expo.dev)
