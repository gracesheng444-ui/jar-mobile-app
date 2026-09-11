import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles, PLACEHOLDER } from '../theme';
import { AvatarPicker } from './AvatarPicker';
import { JarGlyph } from './JarGlyph';

interface SetupProfileScreenProps {
  userId: string;
  initialAvatarColor: string;
  onComplete: (name: string) => void;
}

/** One-time step shown right after a brand-new account's first sign-in — the account already has default profile
 *  fields, but no name yet, and hasn't looked at any jars — so this stands in for a "sign up" step. */
export function SetupProfileScreen({ userId, initialAvatarColor, onComplete }: SetupProfileScreenProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarColor, setAvatarColor] = useState(initialAvatarColor);
  const trimmed = name.trim();

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.setupProfile.heading}</Text>
      <Text style={cardStyles.label}>{t.setupProfile.subtitle}</Text>

      <AvatarPicker
        userId={userId}
        name={trimmed}
        avatarUrl={avatarUrl}
        avatarColor={avatarColor}
        onAvatarChange={({ url, color }) => {
          setAvatarUrl(url);
          setAvatarColor(color);
        }}
        showSkipOption
      />

      <TextInput
        style={cardStyles.input}
        value={name}
        onChangeText={setName}
        placeholder={t.setupProfile.namePlaceholder}
        placeholderTextColor={PLACEHOLDER}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={40}
      />
      <Pressable
        style={[cardStyles.primaryButton, !trimmed && cardStyles.primaryButtonDisabled]}
        disabled={!trimmed}
        onPress={() => trimmed && onComplete(trimmed)}
      >
        <Text style={cardStyles.primaryButtonText}>{t.setupProfile.continueButton}</Text>
      </Pressable>
    </View>
  );
}
