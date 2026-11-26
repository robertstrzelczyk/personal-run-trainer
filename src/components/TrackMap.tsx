import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import type { TrackPoint } from "@/src/lib/types";
import { colors } from "@/src/theme";
import { Muted } from "./ui";

export function TrackMap({ track, height = 180 }: { track: TrackPoint[]; height?: number }) {
  const projected = useMemo(() => {
    if (track.length < 2) return null;
    const lats = track.map((p) => p.lat);
    const lons = track.map((p) => p.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const pad = 0.08;
    const latSpan = Math.max(maxLat - minLat, 0.0001);
    const lonSpan = Math.max(maxLon - minLon, 0.0001);
    const width = 320;
    const toXY = (p: TrackPoint) => {
      const x = ((p.lon - minLon) / lonSpan) * (1 - 2 * pad) * width + pad * width;
      const y = (1 - (p.lat - minLat) / latSpan) * (1 - 2 * pad) * height + pad * height;
      return { x, y, s: `${x},${y}` };
    };
    const coords = track.map(toXY);
    return {
      width,
      points: coords.map((c) => c.s).join(" "),
      start: coords[0]!,
      end: coords[coords.length - 1]!,
    };
  }, [track, height]);

  if (!projected) {
    return <Muted>Brak punktów GPS do mapy.</Muted>;
  }

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: colors.bgElevated }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${projected.width} ${height}`}>
        <Polyline points={projected.points} fill="none" stroke={colors.primary} strokeWidth={2.5} />
        <Circle cx={projected.start.x} cy={projected.start.y} r={4} fill={colors.good} />
        <Circle cx={projected.end.x} cy={projected.end.y} r={4} fill={colors.accent} />
      </Svg>
    </View>
  );
}
