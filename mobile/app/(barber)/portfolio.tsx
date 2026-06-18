import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Plus,
  X,
  Trash2,
  Layers,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

export default function PortfolioScreen() {
  const insets              = useSafeAreaInsets();
  const { width }           = useWindowDimensions();
  const { user }            = useAuthStore();
  const barber              = user as BarberProfile | null;

  const COLS   = 3;
  const GAP    = 4;
  const IMG_W  = (width - 32 - GAP * (COLS - 1)) / COLS;

  const [images,       setImages]       = useState<string[]>(barber?.portfolioImages ?? []);
  const [previewUri,   setPreviewUri]   = useState<string | null>(null);

  async function handleUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to upload portfolio images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...uris, ...prev]);
      // TODO: POST /api/barber/portfolio with FormData for each uri
    }
  }

  function handleDelete(uri: string) {
    Alert.alert('Remove Photo', 'Remove this photo from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          setImages((prev) => prev.filter((u) => u !== uri));
          // TODO: DELETE /api/barber/portfolio/:photoId
        },
      },
    ]);
  }

  const data = ['__upload__', ...images];

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Portfolio</Text>
        <Text style={{ fontSize: 13, color: '#A0AEC0' }}>{images.length} photo{images.length !== 1 ? 's' : ''}</Text>
      </View>

      {images.length === 0 ? (
        /* Empty state */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0ff', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={36} color="#3c3cb9" />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A202C', textAlign: 'center' }}>No portfolio photos yet</Text>
          <Text style={{ fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 21 }}>
            Upload photos of your best work to attract clients and showcase your craft.
          </Text>
          <Pressable onPress={handleUpload} style={{ backgroundColor: '#3c3cb9', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Plus size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Upload Photos</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          numColumns={COLS}
          keyExtractor={(item) => item}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          columnWrapperStyle={{ gap: GAP, marginBottom: GAP }}
          renderItem={({ item }) => {
            if (item === '__upload__') {
              return (
                <Pressable
                  onPress={handleUpload}
                  style={{
                    width: IMG_W, height: IMG_W, borderRadius: 12,
                    backgroundColor: '#e0e0ff', borderWidth: 2, borderColor: '#c7c7f5',
                    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <Plus size={24} color="#3c3cb9" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#3c3cb9' }}>Upload</Text>
                </Pressable>
              );
            }
            return (
              <Pressable onPress={() => setPreviewUri(item)} onLongPress={() => handleDelete(item)}>
                <Image
                  source={{ uri: item }}
                  style={{ width: IMG_W, height: IMG_W, borderRadius: 12 }}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }}
        />
      )}

      {/* Full-screen preview */}
      <Modal visible={!!previewUri} animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 10, flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => { handleDelete(previewUri!); setPreviewUri(null); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={18} color="#ff5555" />
            </Pressable>
            <Pressable onPress={() => setPreviewUri(null)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#ffffff" />
            </Pressable>
          </View>
          {previewUri && (
            <Image source={{ uri: previewUri }} style={{ flex: 1 }} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}
