import { ImageResponse } from "next/og";

/** Ikona aplikacji: zielone tło i linia tętna. `maskable` zostawia margines bezpieczny dla Androida. */
export function renderIcon(size: number, maskable = false) {
  const inner = maskable ? size * 0.56 : size * 0.7;
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d9468",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={inner} height={inner} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
