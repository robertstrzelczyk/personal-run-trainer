import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/src/lib/auth-context";
import { Loading } from "@/src/components/ui";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function ReadyGate({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <Loading />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ReadyGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </ReadyGate>
    </AuthProvider>
  );
}
