export function Sparkline({
  values,
  color = "#3185D8",
  width = 96,
  height = 30,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const lastY = Number(points[points.length - 1]?.split(",")[1] ?? height / 2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <polyline
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill={color}
        fillOpacity={0.08}
        stroke="none"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r={2} fill={color} />
    </svg>
  );
}
