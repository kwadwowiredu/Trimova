import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  Image,
  useWindowDimensions,
  Animated,
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
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';
import { uploadImage, isLocalUri } from '@/services/uploads';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Skeleton } from '@/components/ui/Skeleton';
import type { BarberProfile } from '@/types/user';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Grid tile that shows a shimmering skeleton until the remote photo finishes
// downloading — so slots that DO have photos never render as blank squares.
function PortfolioTile({
  uri, size, onPress, onLongPress,
}: { uri: string; size: number; onPress: () => void; onLongPress: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden' }}>
      {!loaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Skeleton width={size} height={size} borderRadius={12} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={{ width: size, height: size, opacity: loaded ? 1 : 0 }}
        resizeMode="cover"
        onLoadEnd={() => setLoaded(true)}
      />
    </Pressable>
  );
}

export default function PortfolioScreen() {
  const insets              = useSafeAreaInsets();
  const c                   = useThemeColors();
  const { width }           = useWindowDimensions();
  const { user, updateUser, mergeUser } = useAuthStore();
  const barber              = user as BarberProfile | null;

  const COLS   = 3;
  const GAP    = 4;
  const IMG_W  = (width - 32 - GAP * (COLS - 1)) / COLS;

  const [images,       setImages]       = useState<string[]>(barber?.portfolioImages ?? []);
  const [previewUri,   setPreviewUri]   = useState<string | null>(null);
  const [deleteUri,    setDeleteUri]    = useState<string | null>(null);
  const [busy,         setBusy]         = useState(false);

  // Re-seed when the background sync delivers fresh data after mount.
  useEffect(() => {
    if (busy) return;
    setImages(barber?.portfolioImages ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('Photos added to portfolio');
  const [toastOk,  setToastOk]  = useState(true);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg);
    setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  // Persist the full image list to the DB (uploading any new local files first).
  async function persistImages(next: string[], successMsg: string) {
    const previous = images;
    setImages(next); // optimistic
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const uri of next) {
        urls.push(isLocalUri(uri) ? await uploadImage(uri, 'portfolio') : uri);
      }
      const res = await authService.updateProfile({ portfolioImages: urls });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
      setImages(urls);
      showToast(successMsg, true);
    } catch (e) {
      setImages(previous); // roll back so the UI matches the server
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    } finally {
      setBusy(false);
    }
  }

  // Close the preview first, then open the confirm dialog — two RN Modals can't
  // be visible at once, so the confirm must wait for the preview to dismiss.
  function requestDeleteFromPreview() {
    const uri = previewUri;
    setPreviewUri(null);
    if (uri) setTimeout(() => setDeleteUri(uri), 250);
  }

  async function handleUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      persistImages([...uris, ...images], 'Photos added to portfolio');
    }
  }

  function confirmDelete() {
    if (!deleteUri) return;
    const next = images.filter((u) => u !== deleteUri);
    setDeleteUri(null);
    setPreviewUri(null);
    persistImages(next, 'Photo removed');
  }

  const data = ['__upload__', ...images];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Portfolio</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Showcase your work</Text>
        </View>
        <Text style={{ fontSize: 13, color: c.textFaint }}>{images.length} photo{images.length !== 1 ? 's' : ''}</Text>
      </View>

      {images.length === 0 ? (
        /* Empty state */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={36} color={c.accent} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' }}>No portfolio photos yet</Text>
          <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 21 }}>
            Upload photos of your best work to attract clients and showcase your craft.
          </Text>
          <Pressable onPress={handleUpload} style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
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
          ListHeaderComponent={
            <Text style={{ fontSize: 12, color: c.textFaint, marginBottom: 12 }}>Tap a photo to preview · long-press to remove</Text>
          }
          renderItem={({ item }) => {
            if (item === '__upload__') {
              return (
                <Pressable
                  onPress={handleUpload}
                  style={{
                    width: IMG_W, height: IMG_W, borderRadius: 12,
                    backgroundColor: c.accentSoft, borderWidth: 2, borderColor: c.accent,
                    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  <Plus size={24} color={c.accent} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.accent }}>Upload</Text>
                </Pressable>
              );
            }
            return (
              <PortfolioTile
                uri={item}
                size={IMG_W}
                onPress={() => setPreviewUri(item)}
                onLongPress={() => setDeleteUri(item)}
              />
            );
          }}
        />
      )}

      {/* Full-screen preview */}
      <Modal visible={!!previewUri} animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 10, flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={requestDeleteFromPreview} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,0,0,0.25)', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* Delete confirm */}
      <ConfirmModal
        visible={!!deleteUri}
        onClose={() => setDeleteUri(null)}
        onConfirm={confirmDelete}
        title="Remove Photo"
        message="Remove this photo from your portfolio? This can't be undone."
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
      />

      {/* Upload toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: toastOk ? c.success : c.danger, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        {toastOk ? <Check size={18} color="#fff" /> : <X size={18} color="#fff" />}
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 }}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}
