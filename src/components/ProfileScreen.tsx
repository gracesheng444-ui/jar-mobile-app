import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { cardStyles, PLACEHOLDER } from '../theme';
import { JarGlyph } from './JarGlyph';

interface ProfileScreenProps {
  currentName: string;
  onSave: (name: string) => void;
  onBack: () => void;
}

export function ProfileScreen({ currentName, onSave, onBack }: ProfileScreenProps) {
  // 'Partner' is the DB default for "never customized" — don't prefill it as if it were a real name.
  const [name, setName] = useState(currentName === 'Partner' ? '' : currentName);
  const trimmed = name.trim();

  return (
    <View style={cardStyles.card}>
      <Pressable onPress={onBack}>
        <Text style={cardStyles.link}>← Back</Text>
      </Pressable>
      <JarGlyph />
      <Text style={cardStyles.heading}>Your name</Text>
      <Text style={cardStyles.label}>Shown to your partner instead of "Partner" — in the jar list and on the tap button.</Text>
      <TextInput
        style={cardStyles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Grace"
        placeholderTextColor={PLACEHOLDER}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={40}
      />
      <Pressable
        style={[cardStyles.primaryButton, !trimmed && cardStyles.primaryButtonDisabled]}
        disabled={!trimmed}
        onPress={() => trimmed && onSave(trimmed)}
      >
        <Text style={cardStyles.primaryButtonText}>Save</Text>
      </Pressable>
    </View>
  );
}
