import { View } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import type { TrackPoint } from "@/src/lib/types";
import { colors } from "@/src/theme";
import { Muted } from "./ui";

export function TrackMap({ track, height = 180 }: { track: TrackPoint[]; height?: number }) {
  if (track.length < 2) {
    return <Muted>Brak punktów GPS do mapy.</Muted>;
  }

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
    return `${x},${y}`;
  };
  const points = track.map(toXY).join(" ");
  const start = track[0]!;
  const end = track[track.length - 1]!;
  const [sx, sy] = toXY(start).split(",").map(Number);
  const [ex, ey] = toXY(end).split(",").map(Number);

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: colors.bgElevated }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2.5} />
        <Circle cx={sx} cy={sy} r={4} fill={colors.good} />
        <Circle cx={ex} cy={ey} r={4} fill={colors.accent} />
      </Svg>
    </View>
  );
}
