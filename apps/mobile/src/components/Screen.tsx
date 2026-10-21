import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Disclaimer } from './Disclaimer'
import { colors, font, space } from '@/theme/tokens'

export function Screen({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {right}
        </View>
        <View style={styles.body}>{children}</View>
        <View style={styles.footer}>
          <Disclaimer />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, paddingHorizontal: space.md, paddingTop: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  body: { flex: 1, gap: space.md },
  footer: { paddingVertical: space.md },
})
