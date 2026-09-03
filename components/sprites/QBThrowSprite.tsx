"use client";

export function QBThrowSprite({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 56" shapeRendering="crispEdges">
      <style>{`
        @keyframes qb-arm-throw {
          0%   { transform: rotate(78deg); }
          35%  { transform: rotate(78deg); }
          55%  { transform: rotate(-25deg); }
          75%  { transform: rotate(-40deg); }
          100% { transform: rotate(78deg); }
        }
        @keyframes qb-ball-fly {
          0%, 54%  { opacity: 0; transform: translate(0, 0); }
          56%      { opacity: 1; transform: translate(0, 0); }
          85%      { opacity: 1; transform: translate(20px, -6px); }
          92%,100% { opacity: 0; transform: translate(24px, -7px); }
        }
        @keyframes qb-legs-shift {
          0%, 45% { transform: translateY(0); }
          55%, 100% { transform: translateY(-1px); }
        }
        .qb-arm { transform-box: fill-box; transform-origin: 50% 0%; animation: qb-arm-throw 1.6s ease-in-out infinite; }
        .qb-ball { animation: qb-ball-fly 1.6s ease-in-out infinite; }
        .qb-legs { animation: qb-legs-shift 1.6s ease-in-out infinite; }
      `}</style>

      {/* Beine */}
      <g className="qb-legs">
        <rect x="16" y="38" width="6" height="14" fill="#111827" />
        <rect x="26" y="38" width="6" height="14" fill="#111827" />
        <rect x="15" y="50" width="8" height="4" fill="#0b0b0f" />
        <rect x="25" y="50" width="8" height="4" fill="#0b0b0f" />
      </g>

      {/* Torso (Trikot) */}
      <rect x="14" y="20" width="20" height="20" fill="#f59e0b" />
      <rect x="14" y="20" width="20" height="4" fill="#d97706" />

      {/* Kopf/Helm */}
      <rect x="17" y="8" width="14" height="12" fill="#fcd34d" />
      <rect x="17" y="8" width="14" height="4" fill="#d97706" />
      <rect x="27" y="12" width="4" height="4" fill="#1c1103" />

      {/* Standarm */}
      <rect x="30" y="24" width="5" height="12" fill="#fcd34d" />

      {/* Wurfarm (rotiert um die Schulter) */}
      <g className="qb-arm" style={{ transformOrigin: "13px 24px" }}>
        <rect x="8" y="22" width="6" height="14" fill="#fcd34d" />
        <rect x="6" y="20" width="6" height="6" fill="#7c3f10" />
      </g>

      {/* Football, fliegt beim Release los */}
      <g className="qb-ball">
        <ellipse cx="10" cy="22" rx="4" ry="2.6" fill="#7c3f10" transform="rotate(-25 10 22)" />
      </g>
    </svg>
  );
}
