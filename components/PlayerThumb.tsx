"use client";

export function PlayerThumb({ photo, size = 32 }: { photo?: string | null; size?: number }) {
  if (!photo) {
    return (
      <span
        className="shrink-0 rounded-full"
        style={{ width: size, height: size, background: "rgba(255,255,255,0.06)" }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ background: "rgba(255,255,255,0.06)" }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}
