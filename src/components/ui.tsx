import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, fonts, radii, space } from "../theme";

export function Screen({ children, style, testID, ...rest }: ViewProps) {
  return (
    <View testID={testID} style={[styles.screen, style]} {...rest}>
      <LinearGradient
        colors={["#12352a", colors.bg, colors.bg]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  accent = false,
  delay = 0,
  animated = true,
  ...rest
}: ViewProps & { accent?: boolean; delay?: number; animated?: boolean }) {
  const body = (
    <View style={[styles.card, accent && styles.cardAccent]} {...rest}>
      {children}
    </View>
  );
  if (!animated) {
    return <View style={style}>{body}</View>;
  }
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18)} style={style}>
      {body}
    </Animated.View>
  );
}

export function HeroCard({ children, style }: ViewProps) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} style={style}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

export function Title({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <Text style={[styles.title, light && { color: "#fff" }]}>{children}</Text>
  );
}

export function Subtitle({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <Text style={[styles.subtitle, light && { color: "rgba(255,255,255,0.92)" }]}>
      {children}
    </Text>
  );
}

export function Muted({ children, light = false }: { children: string; light?: boolean }) {
  return (
    <Text style={[styles.muted, light && { color: "rgba(255,255,255,0.78)" }]}>
      {children}
    </Text>
  );
}

export function Field(props: TextInputProps & { label: string; testID?: string }) {
  const { label, style, testID, ...rest } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  testID,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  testID?: string;
}) {
  return (
    <View style={styles.field} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              testID={testID ? `${testID}-${opt.value}` : undefined}
              accessibilityLabel={opt.label}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onValueChange,
  testID,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID?: string;
}) {
  return (
    <View style={styles.toggleRow} testID={testID}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {detail ? <Text style={styles.muted}>{detail}</Text> : null}
      </View>
      <Switch
        testID={testID ? `${testID}-switch` : undefined}
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryDeep }}
        thumbColor={value ? colors.primary : "#ccc"}
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        (disabled || pressed) && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "ghost" && { color: colors.primary },
          variant === "danger" && { color: colors.danger },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <LinearGradient colors={["#12352a", colors.bg]} style={StyleSheet.absoluteFill} />
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: string;
  tone?: "default" | "good" | "warn" | "bad" | "neutral";
}) {
  const bg =
    tone === "good"
      ? "rgba(155,225,93,0.18)"
      : tone === "warn"
        ? "rgba(253,176,34,0.18)"
        : tone === "bad"
          ? "rgba(255,107,107,0.18)"
          : tone === "neutral"
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.1)";
  const color =
    tone === "good"
      ? colors.good
      : tone === "warn"
        ? colors.warn
        : tone === "bad"
          ? colors.danger
          : colors.text;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: space.md, gap: space.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAccent: {
    borderColor: "rgba(155,225,93,0.35)",
    backgroundColor: colors.cardSoft,
  },
  hero: {
    borderRadius: radii.xl,
    padding: space.lg,
    gap: space.sm,
    overflow: "hidden",
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.muted,
    lineHeight: 20,
  },
  field: { gap: 6 },
  label: {
    fontSize: 12,
    fontFamily: fonts.bodyMed,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.bgElevated,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.muted, fontFamily: fonts.bodyMed, fontSize: 13 },
  chipTextActive: { color: colors.primaryText },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  toggleLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  buttonText: {
    color: colors.primaryText,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontFamily: fonts.bodyMed, fontSize: 12 },
});
