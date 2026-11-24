import { useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { colors, fonts, radii, space } from "../theme";
import { Muted } from "./ui";

export type ChartRange = 7 | 28 | 90;

const RANGES: Array<{ id: ChartRange; label: string }> = [
  { id: 7, label: "7 dni" },
  { id: 28, label: "28 dni" },
  { id: 90, label: "90 dni" },
];

export function ChartRangePicker({
  value,
  onChange,
  testID,
}: {
  value: ChartRange;
  onChange: (v: ChartRange) => void;
  testID?: string;
}) {
  return (
    <View style={styles.ranges} testID={testID}>
      {RANGES.map((r) => {
        const active = r.id === value;
        return (
          <Pressable
            key={r.id}
            testID={testID ? `${testID}-${r.id}` : undefined}
            accessibilityLabel={r.label}
            onPress={() => onChange(r.id)}
            style={[styles.rangeChip, active && styles.rangeChipActive]}
          >
            <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{ color: string; label: string }>;
}) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function chartWidth() {
  return Math.max(280, Dimensions.get("window").width - space.md * 4);
}

export function MultiLineChart({
  series,
  emptyLabel = "Za mało danych do wykresu",
}: {
  series: Array<{
    data: Array<{ value: number; label?: string; date?: string }>;
    color: string;
    label: string;
  }>;
  emptyLabel?: string;
}) {
  const width = chartWidth();
  const primary = series[0]?.data ?? [];
  const hasData = primary.some((p) => p.value !== 0) || primary.length > 1;

  const spacing = useMemo(() => {
    const n = Math.max(primary.length, 2);
    return Math.max(8, Math.min(28, (width - 40) / n));
  }, [primary.length, width]);

  if (!hasData || primary.length < 2) {
    return <Muted>{emptyLabel}</Muted>;
  }

  const showEvery = Math.max(1, Math.ceil(primary.length / 6));
  const labeled = primary.map((p, i) => ({
    ...p,
    label: i % showEvery === 0 ? shortDate(p.date ?? p.label) : undefined,
  }));

  const extra: Record<string, unknown> = {};
  if (series[1]) {
    extra.data2 = series[1].data;
    extra.color2 = series[1].color;
    extra.thickness2 = 2;
    extra.hideDataPoints2 = true;
  }
  if (series[2]) {
    extra.data3 = series[2].data;
    extra.color3 = series[2].color;
    extra.thickness3 = 2;
    extra.hideDataPoints3 = true;
  }

  return (
    <View>
      <ChartLegend items={series.map((s) => ({ color: s.color, label: s.label }))} />
      <LineChart
        data={labeled}
        color={series[0]?.color}
        thickness={2}
        hideDataPoints
        curved
        areaChart={false}
        width={width}
        height={180}
        spacing={spacing}
        initialSpacing={8}
        endSpacing={8}
        noOfSections={4}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        yAxisTextStyle={styles.axis}
        xAxisLabelTextStyle={styles.axis}
        rulesColor={colors.border}
        rulesType="solid"
        backgroundColor="transparent"
        isAnimated={false}
        {...extra}
      />
    </View>
  );
}

export function SimpleBarChart({
  data,
  color = colors.primary,
  emptyLabel = "Brak aktywności w tym okresie",
  formatY,
}: {
  data: Array<{ value: number; label?: string; frontColor?: string }>;
  color?: string;
  emptyLabel?: string;
  formatY?: (v: number) => string;
}) {
  const width = chartWidth();
  if (!data.length || data.every((d) => d.value <= 0)) {
    return <Muted>{emptyLabel}</Muted>;
  }

  const spacing = Math.max(10, Math.min(36, (width - 40) / Math.max(data.length, 1)));
  const showEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <BarChart
      data={data.map((d, i) => ({
        ...d,
        frontColor: d.frontColor ?? color,
        label: i % showEvery === 0 ? d.label : "",
      }))}
      width={width}
      height={160}
      barWidth={Math.min(18, spacing * 0.55)}
      spacing={spacing * 0.35}
      initialSpacing={6}
      noOfSections={4}
      yAxisColor={colors.border}
      xAxisColor={colors.border}
      yAxisTextStyle={styles.axis}
      xAxisLabelTextStyle={styles.axis}
      rulesColor={colors.border}
      backgroundColor="transparent"
      isAnimated={false}
      formatYLabel={formatY ? (v) => formatY(Number(v)) : undefined}
    />
  );
}

export function useChartWindow<T extends { date: string }>(
  points: T[],
  range: ChartRange,
): T[] {
  return useMemo(() => {
    if (!points.length) return [];
    const last = points[points.length - 1];
    const end = new Date(last.date);
    const start = new Date(end);
    start.setDate(start.getDate() - (range - 1));
    const startKey = dayKey(start);
    return points.filter((p) => p.date >= startKey);
  }, [points, range]);
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(raw?: string) {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [, m, d] = raw.slice(0, 10).split("-");
    return `${Number(d)}.${Number(m)}`;
  }
  return raw;
}

/** Hook state helper for range picker on screens */
export function useChartRange(initial: ChartRange = 28) {
  return useState<ChartRange>(initial);
}

const styles = StyleSheet.create({
  ranges: { flexDirection: "row", gap: 8 },
  rangeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeText: { fontFamily: fonts.bodyMed, fontSize: 12, color: colors.muted },
  rangeTextActive: { color: colors.primaryText, fontFamily: fonts.bodyBold },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: radii.sm },
  legendLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  axis: { color: colors.muted, fontSize: 10, fontFamily: fonts.body },
});
