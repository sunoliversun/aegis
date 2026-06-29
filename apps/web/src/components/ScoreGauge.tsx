"use client";

const BAND_COLORS = {
  protected: "#22c55e",
  some_risks: "#eab308",
  needs_attention: "#f97316",
  at_risk: "#ef4444",
};

interface Props {
  score: number;
  band: string;
}

export default function ScoreGauge({ score, band }: Props) {
  const color = BAND_COLORS[band as keyof typeof BAND_COLORS] ?? "#22c55e";
  const radius = 80;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Only use the top 75% of circle (270 degrees)
  const arcLength = circumference * 0.75;
  const offset = arcLength - (score / 100) * arcLength;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
        {/* Track */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(135 ${radius} ${radius})`}
        />
        {/* Progress */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(135 ${radius} ${radius})`}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold text-white" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  );
}
