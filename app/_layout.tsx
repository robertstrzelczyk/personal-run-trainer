import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from "@expo-google-fonts/barlow-condensed";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/src/lib/auth-context";
import { Loading } from "@/src/components/ui";
import { colors } from "@/src/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { ready, onboardingDone, runs, lastSync } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    // Pomiń onboarding, jeśli user już ma dane (upgrade z wcześniejszej wersji)
    const skip = onboardingDone || runs.length > 0 || Boolean(lastSync);
    const onOnboarding = segments[0] === "onboarding";
    if (!skip && !onOnboarding) {
      router.replace("/onboarding");
    } else if (skip && onOnboarding) {
      router.replace("/(tabs)");
    }
  }, [ready, onboardingDone, runs.length, lastSync, segments, router]);

  return <>{children}</>;
}

function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth();
  const [fontsLoaded] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) return <Loading />;
  return <OnboardingGate>{children}</OnboardingGate>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <ReadyGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen
            name="run/[id]"
            options={{
              headerShown: true,
              title: "Szczegóły biegu",
              headerStyle: { backgroundColor: colors.bgElevated },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="workout/[when]"
            options={{
              headerShown: true,
              title: "Szczegóły treningu",
              headerStyle: { backgroundColor: colors.bgElevated },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="races/index"
            options={{
              headerShown: true,
              title: "Starty",
              headerStyle: { backgroundColor: colors.bgElevated },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="races/edit"
            options={{
              headerShown: true,
              title: "Start",
              headerStyle: { backgroundColor: colors.bgElevated },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="plan/index"
            options={{
              headerShown: true,
              title: "Plan do startu",
              headerStyle: { backgroundColor: colors.bgElevated },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </Stack>
      </ReadyGate>
    </AuthProvider>
  );
}
