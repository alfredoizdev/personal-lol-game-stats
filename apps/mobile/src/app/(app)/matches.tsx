import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { colors, font } from '@/theme/tokens'

export default function MatchesScreen() {
  return (
    <Screen title="My Matches" subtitle="Recent performance">
      <Text style={styles.muted}>Your recent matches will appear here.</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  muted: { color: colors.muted, fontSize: font.body },
})
