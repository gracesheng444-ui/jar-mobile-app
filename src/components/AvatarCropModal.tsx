import { useEffect, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles, CREAM, INK } from '../theme';

interface AvatarCropModalProps {
  imageUri: string;
  onCancel: () => void;
  /** Fires with an object URL for the cropped square JPEG, ready to hand straight to uploadAvatarPhoto. */
  onConfirm: (croppedUri: string) => void;
}

const VIEWPORT = 260;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Web-only crop step between picking a photo and uploading it — expo-image-picker's
 * `allowsEditing` gives native platforms a built-in crop screen, but has no web
 * implementation, so without this a picked photo on web went straight to upload
 * uncropped. Drag to reposition, +/- to zoom; "Use photo" rasterizes the visible
 * circle onto an offscreen canvas and hands back an object URL.
 */
export function AvatarCropModal({ imageUri, onCancel, onConfirm }: AvatarCropModalProps) {
  const { t } = useI18n();
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    Image.getSize(
      imageUri,
      (width, height) => {
        setNaturalSize({ width, height });
        setZoom(1);
        const scale = Math.max(VIEWPORT / width, VIEWPORT / height);
        setOffset({ x: (VIEWPORT - width * scale) / 2, y: (VIEWPORT - height * scale) / 2 });
      },
      () => setNaturalSize({ width: VIEWPORT, height: VIEWPORT })
    );
  }, [imageUri]);

  const baseScale = naturalSize ? Math.max(VIEWPORT / naturalSize.width, VIEWPORT / naturalSize.height) : 1;
  const displayScale = baseScale * zoom;
  const displayWidth = naturalSize ? naturalSize.width * displayScale : VIEWPORT;
  const displayHeight = naturalSize ? naturalSize.height * displayScale : VIEWPORT;

  const clampOffset = (x: number, y: number) => ({
    x: clamp(x, VIEWPORT - displayWidth, 0),
    y: clamp(y, VIEWPORT - displayHeight, 0),
  });

  // Kept in sync every render (not just in an effect) so the pan responder's callbacks —
  // created once via useRef — always see the latest values instead of a stale closure.
  const liveRef = useRef({ offset, displayWidth, displayHeight });
  liveRef.current = { offset, displayWidth, displayHeight };
  const dragOrigin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
    // Re-clamp whenever zoom or the loaded image size changes the display bounds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, naturalSize]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragOrigin.current = liveRef.current.offset;
      },
      onPanResponderMove: (_evt, gesture) => {
        const { x, y } = dragOrigin.current;
        const { displayWidth: dw, displayHeight: dh } = liveRef.current;
        setOffset({
          x: clamp(x + gesture.dx, VIEWPORT - dw, 0),
          y: clamp(y + gesture.dy, VIEWPORT - dh, 0),
        });
      },
    })
  ).current;

  const adjustZoom = (delta: number) => setZoom((z) => clamp(Math.round((z + delta) * 100) / 100, MIN_ZOOM, MAX_ZOOM));

  const handleConfirm = () => {
    if (!naturalSize) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      const sSize = VIEWPORT / displayScale;
      const sx = clamp(-offset.x / displayScale, 0, naturalSize.width - sSize);
      const sy = clamp(-offset.y / displayScale, 0, naturalSize.height - sSize);
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          onConfirm(URL.createObjectURL(blob));
        },
        'image/jpeg',
        0.9
      );
    };
    img.src = imageUri;
  };

  return (
    <View style={styles.overlay}>
      <View style={cardStyles.card}>
        <Text style={cardStyles.heading}>{t.avatarPicker.cropHeading}</Text>
        <View style={styles.viewport} {...panResponder.panHandlers}>
          {naturalSize && (
            <Image
              source={{ uri: imageUri }}
              style={{ position: 'absolute', left: offset.x, top: offset.y, width: displayWidth, height: displayHeight }}
            />
          )}
        </View>
        <View style={styles.zoomRow}>
          <Pressable style={styles.zoomButton} onPress={() => adjustZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>
          <Pressable style={styles.zoomButton} onPress={() => adjustZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={[cardStyles.secondaryButton, styles.actionButton]} onPress={onCancel}>
            <Text style={cardStyles.secondaryButtonText}>{t.settings.cancel}</Text>
          </Pressable>
          <Pressable style={[cardStyles.primaryButton, styles.actionButton]} onPress={handleConfirm}>
            <Text style={cardStyles.primaryButtonText}>{t.avatarPicker.useCroppedPhoto}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  viewport: {
    width: VIEWPORT,
    height: VIEWPORT,
    borderRadius: VIEWPORT / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: INK,
    alignSelf: 'center',
  },
  zoomRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: { fontSize: 20, fontWeight: '800', color: INK, lineHeight: 22 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionButton: { flex: 1, marginBottom: 0 },
});
