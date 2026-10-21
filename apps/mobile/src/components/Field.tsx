import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, font, radius } from '@/theme/tokens'

type Props = TextInputProps & {
  label?: string
  secure?: boolean
  error?: string | null
}

/** Rounded translucent input with optional label and show/hide toggle for passwords. */
export function Field({ label, secure, error, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secure)
  return (
    <View style={styles.wrap}>
      <View style={[styles.box, error ? styles.boxError : null]}>
        <View style={styles.textCol}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          <TextInput
            placeholderTextColor={colors.muted}
            secureTextEntry={hidden}
            style={[styles.input, style]}
            {...rest}
          />
        </View>
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Text style={styles.eye}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.control + 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  boxError: { borderColor: colors.loss },
  textCol: { flex: 1 },
  label: { color: colors.text, fontSize: font.caption + 1, fontWeight: '600', marginBottom: 2 },
  input: { color: colors.text, fontSize: font.body, paddingVertical: 4 },
  eye: { color: colors.accent, fontSize: font.caption + 1, fontWeight: '600' },
  error: { color: colors.loss, fontSize: font.caption + 1, paddingHorizontal: 4 },
})
