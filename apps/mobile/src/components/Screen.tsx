import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Disclaimer } from './Disclaimer'
import { colors, font, space } from '@/theme/tokens'

export function Screen({
  title,
  subtitle,
  right,
  overlay,
  children,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  /** Rendered above the scrolling content, pinned to the top of the screen (alert cards). */
  overlay?: ReactNode
  children: ReactNode
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {overlay ? (
        <View style={styles.overlay} pointerEvents="box-none">
          {overlay}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        <View style={styles.body}>{children}</View>
        <View style={styles.footer}>
          <Disclaimer />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space.lg },
  title: { color: colors.text, fontSize: font.title, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: font.body, marginTop: 2 },
  body: { flexGrow: 1, gap: space.md },
  footer: { paddingVertical: space.md },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: space.md, paddingTop: space.sm, maxWidth: 720, width: '100%', alignSelf: 'center' },
})
