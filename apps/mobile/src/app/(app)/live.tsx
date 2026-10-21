import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { colors, font } from '@/theme/tokens'

export default function LiveScreen() {
  return (
    <Screen title="Live">
      <Text style={styles.muted}>Sign in on the desktop app to see live stats.</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: font.body },
})
