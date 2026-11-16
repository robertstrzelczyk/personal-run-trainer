import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNativeApp } from "./platform";

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** W aplikacji otwiera systemowe okno udostępniania pliku, w przeglądarce pobiera plik. */
export async function deliverFile(name: string, bytes: Uint8Array): Promise<"shared" | "downloaded"> {
  if (isNativeApp()) {
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: toBase64(bytes),
      directory: Directory.Cache,
    });
    await Share.share({ title: name, files: [uri], dialogTitle: "Wyślij plik treningu" });
    return "shared";
  }
  const blob = new Blob([bytes as BlobPart], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!isNativeApp()) return false;
    try {
      await Share.share({ text });
      return true;
    } catch {
      return false;
    }
  }
}
