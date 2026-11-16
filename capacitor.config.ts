import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pl.biegowytrener.app",
  appName: "Trener biegowy",
  webDir: "out",
  backgroundColor: "#ffffff",
  android: { backgroundColor: "#ffffff" },
  ios: { contentInset: "never", backgroundColor: "#ffffff" },
  plugins: {
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover" },
  },
};

export default config;
