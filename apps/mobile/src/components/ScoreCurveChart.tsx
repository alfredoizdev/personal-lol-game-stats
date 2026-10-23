import { useState } from 'react'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { linePath, linearScale } from '@/lib/chart-geometry'
import { ratingBands, type CurvePoint } from '@/lib/score-curve'
import { ratingColor } from '@/lib/area-ui'
import { colors, font } from '@/theme/tokens'

const H = 170
const PAD = { top: 10, right: 14, bottom: 26, left: 34 }

/**
 * One scoring curve (x → score 0–100) over the four rating bands, with the
 * breakpoints marked. Single series, so the title names it and there is no legend.
 */
export function ScoreCurveChart({
  points,
  marks,
  xLabel,
  formatX,
}: {
  points: CurvePoint[]
  marks: number[]
  xLabel: string
  formatX: (x: number) => string
}) {
  const [width, setWidth] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)
  const w = width - PAD.left - PAD.right
  const h = H - PAD.top - PAD.bottom
  const xs = points.map((p) => p.x)
  const x = linearScale([Math.min(...xs), Math.max(...xs)], [PAD.left, PAD.left + w])
  const y = linearScale([0, 100], [PAD.top + h, PAD.top])
  const path = linePath(points.map((p) => ({ x: x(p.x), y: y(p.y) })))
  const score = (v: number) => points.find((p) => Math.abs(p.x - v) < 1e-9)?.y ?? null

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {ratingBands().map((b) => (
            <Rect key={b.rating} x={PAD.left} y={y(b.to)} width={w} height={y(b.from) - y(b.to)} fill={ratingColor(b.rating)} opacity={0.12} />
          ))}
          {ratingBands().map((b) => (
            <SvgText key={`l${b.rating}`} x={PAD.left + w - 4} y={y(b.to) + 11} fontSize={9} fill={colors.muted} textAnchor="end">
              {b.rating}
            </SvgText>
          ))}
          {[0, 50, 100].map((v) => (
            <SvgText key={`y${v}`} x={PAD.left - 6} y={y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
              {v}
            </SvgText>
          ))}
          <Line x1={PAD.left} x2={PAD.left + w} y1={y(0)} y2={y(0)} stroke={colors.border} strokeWidth={1} />
          <Path d={path} stroke={colors.text} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {marks.map((m) => {
            const s = score(m)
            if (s === null) return null
            return (
              <Circle key={m} cx={x(m)} cy={y(s)} r={4} fill={colors.accent} stroke={colors.surfaceSolid} strokeWidth={2} />
            )
          })}
          {marks.map((m) => (
            <SvgText key={`x${m}`} x={x(m)} y={H - 8} fontSize={10} fill={colors.text} fontWeight="700" textAnchor="middle">
              {formatX(m)}
            </SvgText>
          ))}
        </Svg>
      ) : null}
      <Text style={styles.axis}>{xLabel}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  axis: { color: colors.muted, fontSize: font.caption - 1, textAlign: 'center' },
})
