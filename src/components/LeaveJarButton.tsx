import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Deleting a jar affects your partner too, so this asks for a second, explicit tap before doing it. */
export function LeaveJarButton({ onLeave }: { onLeave: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Pressable onPress={() => setConfirming(true)}>
        <Text style={styles.link}>Leave this jar</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.text}>This deletes the jar (and its history) for both of you. Are you sure?</Text>
      <View style={styles.row}>
        <Pressable style={styles.cancelButton} onPress={() => setConfirming(false)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.leaveButton} onPress={onLeave}>
          <Text style={styles.leaveButtonText}>Yes, leave</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  card: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12 },
  text: { color: '#7F1D1D', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#FDF6EC', borderWidth: 2, borderColor: '#2B2118', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  cancelButtonText: { fontWeight: '700', color: '#2B2118' },
  leaveButton: { flex: 1, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  leaveButtonText: { color: 'white', fontWeight: '600' },
});
