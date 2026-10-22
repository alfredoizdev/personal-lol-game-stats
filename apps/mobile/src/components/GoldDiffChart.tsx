import { useMemo, useState } from 'react'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'
import { linearScale, niceMax } from '@/lib/chart-geometry'
import { BAR_ENEMY, BAR_YOU } from './CompareBar'
import { colors, font, space } from '@/theme/tokens'

type Point = { t: number; diff: number | null }

const H = 140
const PAD = { top: 14, right: 12, bottom: 24, left: 40 }

/** Gold lead per minute against the lane opponent: cyan above the zero line, red below. */
export function GoldDiffChart({ curve, durationSec }: { curve: Point[]; durationSec: number }) {
  const [width, setWidth] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)

  const geom = useMemo(() => {
    if (curve.length < 2 || width === 0) return null
    const w = width - PAD.left - PAD.right
    const h = H - PAD.top - PAD.bottom
    const yMax = niceMax(curve.map((p) => Math.abs(p.diff ?? 0)), 500)
    const x = linearScale([0, Math.max(durationSec, 60)], [PAD.left, PAD.left + w])
    const y = linearScale([-yMax, yMax], [PAD.top + h, PAD.top])
    const barW = Math.max(2, (w / Math.max(1, curve.length)) * 0.7)
    return { w, h, x, y, yMax, barW }
  }, [curve, width, durationSec])

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Gold lead over the game</Text>
        <View style={styles.legend}>
          <View style={[styles.swatch, { backgroundColor: BAR_YOU }]} />
          <Text style={styles.legendText}>Ahead</Text>
          <View style={[styles.swatch, { backgroundColor: BAR_ENEMY }]} />
          <Text style={styles.legendText}>Behind</Text>
        </View>
      </View>
      <View onLayout={onLayout}>
        {geom ? (
          <Svg width={width} height={H}>
            {[-geom.yMax, 0, geom.yMax].map((v) => (
              <SvgText key={`y${v}`} x={PAD.left - 6} y={geom.y(v) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
                {v > 0 ? `+${v}` : String(v)}
              </SvgText>
            ))}
            <Line x1={PAD.left} x2={PAD.left + geom.w} y1={geom.y(0)} y2={geom.y(0)} stroke={colors.muted} strokeWidth={1} />
            {curve.map((p) =>
              p.diff === null ? null : (
                <Rect
                  key={p.t}
                  x={geom.x(p.t) - geom.barW / 2}
                  y={Math.min(geom.y(0), geom.y(p.diff))}
                  width={geom.barW}
                  height={Math.max(1, Math.abs(geom.y(p.diff) - geom.y(0)))}
                  rx={1}
                  fill={p.diff >= 0 ? BAR_YOU : BAR_ENEMY}
                />
              ),
            )}
            <SvgText x={PAD.left} y={H - 6} fontSize={10} fill={colors.muted}>0 min</SvgText>
            <SvgText x={PAD.left + geom.w} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="end">{`${Math.round(durationSec / 60)} min`}</SvgText>
          </Svg>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.muted}>Not enough timeline data.</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5, marginLeft: 6 },
  legendText: { color: colors.muted, fontSize: font.caption },
  empty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: font.caption + 1 },
})
