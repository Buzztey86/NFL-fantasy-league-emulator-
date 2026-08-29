function polarPoint(cx: number, cy: number, r: number, index: number, n: number): [number, number] {
  const angle = ((360 / n) * index - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

export function RadarChart({
  axes,
  values,
  tips,
  color,
  size = 140,
}: {
  axes: string[];
  values: number[];
  tips?: string[];
  color: string;
  size?: number;
}) {
  const n = axes.length;
  const CX = size / 2;
  const CY = size * 0.486;
  const R = size * 0.371;
  const labelFontSize = size * 0.054;
  const [cr, cg, cb] = hexToRgb(color);

  const rings = [1, 2, 3, 4].map((ring) => {
    const d =
      Array.from({ length: n }, (_, i) => polarPoint(CX, CY, (R * ring) / 4, i, n))
        .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ") + "Z";
    return <path key={ring} d={d} fill="none" stroke="#1F2937" strokeWidth={0.8} />;
  });

  const spokes = Array.from({ length: n }, (_, i) => {
    const [x, y] = polarPoint(CX, CY, R, i, n);
    return <line key={i} x1={CX} y1={CY} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="#1F2937" strokeWidth={0.8} />;
  });

  const polygonD =
    values.map((v, i) => polarPoint(CX, CY, (R * v) / 100, i, n)).map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + "Z";

  const dots = values.map((v, i) => {
    const [x, y] = polarPoint(CX, CY, (R * v) / 100, i, n);
    const tip = tips?.[i] ? `${axes[i]}: ${v}/100\n${tips[i]}` : `${axes[i]}: ${v}/100`;
    return (
      <g key={i}>
        <title>{tip}</title>
        <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={3} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
      </g>
    );
  });

  const labels = axes.map((axis, i) => {
    const [x, y] = polarPoint(CX, CY, R + 13, i, n);
    const anchor = x < CX - 4 ? "end" : x > CX + 4 ? "start" : "middle";
    return (
      <g key={axis} style={{ cursor: "help" }}>
        {tips?.[i] && <title>{`${axis}: ${tips[i]}`}</title>}
        <text x={x.toFixed(1)} y={(y + 3).toFixed(1)} textAnchor={anchor} fontSize={labelFontSize} fill="#9CA3AF" fontFamily="'Source Serif 4', serif">
          {axis}
        </text>
      </g>
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {rings}
      {spokes}
      <path d={polygonD} fill={`rgba(${cr},${cg},${cb},0.18)`} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {dots}
      {labels}
    </svg>
  );
}
