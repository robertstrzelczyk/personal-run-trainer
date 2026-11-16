import { Capacitor } from "@capacitor/core";

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function nativePlatform(): "android" | "ios" | "web" {
  if (!isNativeApp()) return "web";
  return Capacitor.getPlatform() === "ios" ? "ios" : "android";
}
