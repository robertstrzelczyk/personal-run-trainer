"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/platform";

export function ServiceWorker() {
  useEffect(() => {
    if (isNativeApp()) {
      document.documentElement.classList.add("native-app");
      return;
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
