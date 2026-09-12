import { useEffect, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles, CREAM, CREAM_BORDER, INK } from '../theme';

interface AvatarCropModalProps {
  imageUri: string;
  onCancel: () => void;
  /** Fires with an object URL for the cropped square JPEG, ready to hand straight to uploadAvatarPhoto. */
  onConfirm: (croppedUri: string) => void;
}

const STAGE = 300;
const OUTPUT_SIZE = 512;
const MIN_RADIUS = 40;
const RADIUS_STEP = 15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface Layout {
  containScale: number;
  displayWidth: number;
  displayHeight: number;
  imgLeft: number;
  imgTop: number;
  maxRadius: number;
}

function layoutFor(width: number, height: number): Layout {
  const containScale = Math.min(STAGE / width, STAGE / height);
  const displayWidth = width * containScale;
  const displayHeight = height * containScale;
  return {
    containScale,
    displayWidth,
    displayHeight,
    imgLeft: (STAGE - displayWidth) / 2,
    imgTop: (STAGE - displayHeight) / 2,
    maxRadius: Math.min(displayWidth, displayHeight) / 2,
  };
}

/**
 * Web-only crop step between picking a photo and uploading it — expo-image-picker's
 * `allowsEditing` gives native platforms a built-in crop screen, but has no web
 * implementation, so without this a picked photo on web went straight to upload
 * uncropped. Native keeps using the OS picker's crop screen unchanged.
 *
 * Shows the whole photo (never clipped) with a circular selection over it that you
 * drag to reposition and zoom (+/-) to resize — the opposite of panning a zoomed
 * photo behind a fixed frame, which hid most of the photo the whole time. "Use
 * photo" rasterizes whatever the circle currently covers onto an offscreen canvas.
 */
export function AvatarCropModal({ imageUri, onCancel, onConfirm }: AvatarCropModalProps) {
  const { t } = useI18n();
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [radius, setRadius] = useState(STAGE / 4);
  const [center, setCenter] = useState({ x: STAGE / 2, y: STAGE / 2 });

  useEffect(() => {
    Image.getSize(
      imageUri,
      (width, height) => {
        const layout = layoutFor(width, height);
        setNaturalSize({ width, height });
        setRadius(Math.max(MIN_RADIUS, layout.maxRadius * 0.8));
        setCenter({ x: layout.imgLeft + layout.displayWidth / 2, y: layout.imgTop + layout.displayHeight / 2 });
      },
      () => setNaturalSize({ width: STAGE, height: STAGE })
    );
  }, [imageUri]);

  const layout = naturalSize ? layoutFor(naturalSize.width, naturalSize.height) : layoutFor(STAGE, STAGE);

  const clampCenter = (x: number, y: number, r: number) => ({
    x: clamp(x, layout.imgLeft + r, layout.imgLeft + layout.displayWidth - r),
    y: clamp(y, layout.imgTop + r, layout.imgTop + layout.displayHeight - r),
  });

  // Kept in sync every render (not just in an effect) so the pan responder's callbacks —
  // created once via useRef — always see the latest values instead of a stale closure.
  const liveRef = useRef({ center, radius, layout });
  liveRef.current = { center, radius, layout };
  const dragOrigin = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragOrigin.current = liveRef.current.center;
      },
      onPanResponderMove: (_evt, gesture) => {
        const { x, y } = dragOrigin.current;
        const { radius: r, layout: l } = liveRef.current;
        setCenter({
          x: clamp(x + gesture.dx, l.imgLeft + r, l.imgLeft + l.displayWidth - r),
          y: clamp(y + gesture.dy, l.imgTop + r, l.imgTop + l.displayHeight - r),
        });
      },
    })
  ).current;

  const adjustRadius = (delta: number) => {
    setRadius((r) => {
      const next = clamp(r + delta, MIN_RADIUS, layout.maxRadius);
      setCenter((c) => clampCenter(c.x, c.y, next));
      return next;
    });
  };

  const handleConfirm = () => {
    if (!naturalSize) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      const sSize = (radius * 2) / layout.containScale;
      const sx = clamp((center.x - radius - layout.imgLeft) / layout.containScale, 0, naturalSize.width - sSize);
      const sy = clamp((center.y - radius - layout.imgTop) / layout.containScale, 0, naturalSize.height - sSize);
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
        <View style={styles.stage} {...panResponder.panHandlers}>
          {naturalSize && (
            <>
              <Image
                source={{ uri: imageUri }}
                style={{ position: 'absolute', left: layout.imgLeft, top: layout.imgTop, width: layout.displayWidth, height: layout.displayHeight }}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.circle,
                  {
                    left: center.x - radius,
                    top: center.y - radius,
                    width: radius * 2,
                    height: radius * 2,
                    borderRadius: radius,
                    // RN 0.81 supports CSS box-shadow via this key (see the "shadow* style props are
                    // deprecated" runtime warning) but its types don't declare it yet — a huge spread
                    // outside a clipped stage is the standard trick for darkening everything but the hole.
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  } as object,
                ]}
              />
            </>
          )}
        </View>
        <View style={styles.zoomRow}>
          <Pressable style={styles.zoomButton} onPress={() => adjustRadius(-RADIUS_STEP)} disabled={radius <= MIN_RADIUS}>
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>
          <Pressable style={styles.zoomButton} onPress={() => adjustRadius(RADIUS_STEP)} disabled={radius >= layout.maxRadius}>
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
  stage: {
    width: STAGE,
    height: STAGE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CREAM_BORDER,
    borderWidth: 2,
    borderColor: INK,
    alignSelf: 'center',
  },
  circle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
