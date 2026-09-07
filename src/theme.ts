import { StyleSheet } from 'react-native';

/**
 * Shared "sticker/scrapbook" visual language for every auxiliary screen
 * (sign-in, jar list, create/join, waiting-for-partner, profile) — matching
 * the hand-drawn jar illustration, the app icon, and DOODLE_PALETTE, so
 * these screens read as the same app instead of generic default UI.
 */
export const INK = '#2B2118';
export const CREAM = '#FDF6EC';
export const CREAM_FIELD = '#FFFDF9';
export const CREAM_BORDER = '#E4D9C4';
export const GOLD = '#FFC94A';
export const MUTED = '#8A7C68';
export const PLACEHOLDER = '#C9BBA3';

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: CREAM,
    borderRadius: 22,
    padding: 26,
    margin: 20,
    borderWidth: 2,
    borderColor: INK,
    // React Native's shadow props (iOS/Android) approximate the flat
    // "sticker" drop-shadow used in the web build's box-shadow.
    shadowColor: INK,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
  },
  heading: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: INK, marginTop: 2, marginBottom: 6 },
  label: { fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 14, lineHeight: 18 },
  input: {
    borderWidth: 2,
    borderColor: CREAM_BORDER,
    backgroundColor: CREAM_FIELD,
    borderRadius: 14,
    padding: 13,
    fontSize: 17,
    textAlign: 'center',
    letterSpacing: 1,
    color: INK,
    fontWeight: '600',
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: GOLD,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: INK,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 2,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontWeight: '800', color: INK, fontSize: 15 },
  secondaryButton: {
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: { fontWeight: '700', color: INK, fontSize: 15 },
  link: { color: INK, fontSize: 13, fontWeight: '600', textAlign: 'center', textDecorationLine: 'underline' },
  errorText: { color: '#B3261E', fontSize: 13, marginTop: 10, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: CREAM_BORDER },
  dividerText: { fontSize: 11, color: PLACEHOLDER, fontWeight: '600' },
});
