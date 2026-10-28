import { StyleSheet, Text, View } from 'react-native'
import Svg, { Line, Path } from 'react-native-svg'
import { colors, font } from '@/theme/tokens'

/**
 * Half ring, 0–100, with the number centred on the baseline (mockup from the
 * owner, 2026-10-22). `color` is the rating colour; the track is a faint ring.
 * `text` replaces the centred number (the arc still fills by `score`).
 */
/** `tick` draws a small reference mark on the ring at that 0–100 value (e.g. 70 = on target). */
export function SemiDonut({ score, size, color, label, text, tick, trackColor = colors.border }: { score: number | null; size: number; color: string; label?: string; text?: string; tick?: number; /** The unfilled part of the ring; red on the impact arc (what you do not bring). */ trackColor?: string }) {
  const stroke = Math.max(6, Math.round(size * 0.08))
  const r = size / 2 - stroke
  const cx = size / 2
  const cy = size / 2
  const arc = `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const length = Math.PI * r
  const fraction = score === null ? 0 : Math.max(0, Math.min(1, score / 100))
  const height = size / 2 + stroke
  return (
    <View style={[styles.wrap, { width: size, height }]}>
      <Svg width={size} height={height}>
        <Path d={arc} stroke={trackColor} strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {fraction > 0 ? (
          <Path d={arc} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${length * fraction} ${length}`} />
        ) : null}
        {tick !== undefined ? <TickMark cx={cx} cy={cy} r={r} stroke={stroke} value={tick} /> : null}
      </Svg>
      <View style={[styles.center, { top: size * 0.24 }]}>
        <Text style={[styles.score, { fontSize: size * 0.26 }]} maxFontSizeMultiplier={1.15}>{text ?? (score === null ? '—' : String(score))}</Text>
        {label ? <Text style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.15}>{label}</Text> : null}
      </View>
    </View>
  )
}

function TickMark({ cx, cy, r, stroke, value }: { cx: number; cy: number; r: number; stroke: number; value: number }) {
  const a = Math.PI * (1 - Math.max(0, Math.min(1, value / 100))) // 0 → left end, 100 → right end
  const inner = r - stroke * 0.9
  const outer = r + stroke * 0.9
  return <Line x1={cx + inner * Math.cos(a)} y1={cy - inner * Math.sin(a)} x2={cx + outer * Math.cos(a)} y2={cy - outer * Math.sin(a)} stroke={colors.text} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'flex-end' },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  score: { color: colors.text, fontWeight: '800', letterSpacing: -1 },
  label: { color: colors.muted, fontSize: font.caption - 1, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
})
