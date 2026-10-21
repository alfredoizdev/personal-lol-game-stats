import { StyleSheet, Text } from 'react-native'
import { RIOT_DISCLAIMER } from '@lpp/shared'
import { colors, font } from '@/theme/tokens'

export function Disclaimer() {
  return <Text style={styles.text}>{RIOT_DISCLAIMER}</Text>
}

const styles = StyleSheet.create({
  text: { color: colors.muted, fontSize: font.caption - 2, lineHeight: 15 },
})
