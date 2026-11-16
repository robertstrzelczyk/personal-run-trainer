import * as SecureStore from "expo-secure-store";

const KEY = "garmin_personal_api_key";

export async function getGarminApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setGarminApiKey(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value.trim());
}

export async function clearGarminApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
