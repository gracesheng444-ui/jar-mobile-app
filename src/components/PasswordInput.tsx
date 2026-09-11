import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { cardStyles, MUTED, PLACEHOLDER } from '../theme';
import { EyeIcon, EyeOffIcon } from './EyeIcons';

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}

/** A password field with a show/hide toggle — every password field in the app goes through
 *  this instead of a raw TextInput, so the toggle behaves the same everywhere. */
export function PasswordInput({ value, onChangeText, placeholder }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[cardStyles.input, styles.input]}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!visible}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
      />
      <Pressable style={styles.toggle} onPress={() => setVisible((v) => !v)} hitSlop={8}>
        {visible ? <EyeOffIcon color={MUTED} /> : <EyeIcon color={MUTED} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 14 },
  input: { marginBottom: 0, paddingRight: 44 },
  toggle: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
});
