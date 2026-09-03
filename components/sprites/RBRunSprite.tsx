"use client";

export function RBRunSprite({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 56" shapeRendering="crispEdges">
      <style>{`
        @keyframes rb-bob {
          0%, 100% { transform: translateY(0); }
          25%      { transform: translateY(-2px); }
          50%      { transform: translateY(0); }
          75%      { transform: translateY(-2px); }
        }
        @keyframes rb-leg-front {
          0%   { transform: rotate(35deg); }
          50%  { transform: rotate(-35deg); }
          100% { transform: rotate(35deg); }
        }
        @keyframes rb-leg-back {
          0%   { transform: rotate(-35deg); }
          50%  { transform: rotate(35deg); }
          100% { transform: rotate(-35deg); }
        }
        @keyframes rb-arm-front {
          0%   { transform: rotate(-30deg); }
          50%  { transform: rotate(30deg); }
          100% { transform: rotate(-30deg); }
        }
        @keyframes rb-arm-back {
          0%   { transform: rotate(30deg); }
          50%  { transform: rotate(-30deg); }
          100% { transform: rotate(30deg); }
        }
        .rb-body { animation: rb-bob 0.7s ease-in-out infinite; }
        .rb-leg-a { transform-box: fill-box; transform-origin: 50% 0%; animation: rb-leg-front 0.7s ease-in-out infinite; }
        .rb-leg-b { transform-box: fill-box; transform-origin: 50% 0%; animation: rb-leg-back 0.7s ease-in-out infinite; }
        .rb-arm-a { transform-box: fill-box; transform-origin: 50% 0%; animation: rb-arm-front 0.7s ease-in-out infinite; }
        .rb-arm-b { transform-box: fill-box; transform-origin: 50% 0%; animation: rb-arm-back 0.7s ease-in-out infinite; }
      `}</style>

      <g className="rb-body">
        {/* Hinteres Bein */}
        <g className="rb-leg-b" style={{ transformOrigin: "20px 38px" }}>
          <rect x="17" y="38" width="6" height="14" fill="#1f2937" />
        </g>
        {/* Vorderes Bein */}
        <g className="rb-leg-a" style={{ transformOrigin: "28px 38px" }}>
          <rect x="25" y="38" width="6" height="14" fill="#111827" />
        </g>

        {/* Torso */}
        <rect x="15" y="20" width="18" height="20" fill="#8b5cf6" />
        <rect x="15" y="20" width="18" height="4" fill="#6d28d9" />

        {/* Kopf/Helm */}
        <rect x="17" y="8" width="14" height="12" fill="#fcd34d" />
        <rect x="17" y="8" width="14" height="4" fill="#d97706" />

        {/* Hinterer Arm */}
        <g className="rb-arm-b" style={{ transformOrigin: "16px 24px" }}>
          <rect x="13" y="24" width="5" height="12" fill="#fcd34d" />
        </g>
        {/* Vorderer Arm (hält den Ball) */}
        <g className="rb-arm-a" style={{ transformOrigin: "32px 24px" }}>
          <rect x="30" y="24" width="5" height="12" fill="#fcd34d" />
          <ellipse cx="35" cy="28" rx="3.5" ry="2.4" fill="#7c3f10" />
        </g>
      </g>
    </svg>
  );
}
