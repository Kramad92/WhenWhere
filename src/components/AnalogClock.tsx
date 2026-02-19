"use client";

type Props = {
  hour: number;
  minute: number;
  second: number;
  size?: number;
};

export function AnalogClock({ hour, minute, second, size = 80 }: Props) {
  const secAngle = (second / 60) * 360;
  const minAngle = ((minute + second / 60) / 60) * 360;
  const hourAngle = (((hour % 12) + minute / 60) / 12) * 360;

  const cx = 100;
  const cy = 100;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`Analog clock showing ${hour}:${String(minute).padStart(2, "0")}`}
    >
      {/* Face */}
      <circle cx={cx} cy={cy} r={94} className="fill-slate-900/60 dark:fill-slate-900/60 fill-white/60 stroke-slate-200/20 dark:stroke-white/10" strokeWidth={2} />
      {/* Hour ticks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 2 * Math.PI;
        return (
          <line
            key={i}
            x1={cx + Math.sin(a) * 78}
            y1={cy - Math.cos(a) * 78}
            x2={cx + Math.sin(a) * 88}
            y2={cy - Math.cos(a) * 88}
            className="stroke-slate-400 dark:stroke-white/60"
            strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.sin((hourAngle * Math.PI) / 180) * 46}
        y2={cy - Math.cos((hourAngle * Math.PI) / 180) * 46}
        className="stroke-slate-700 dark:stroke-white"
        strokeWidth={5}
        strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.sin((minAngle * Math.PI) / 180) * 62}
        y2={cy - Math.cos((minAngle * Math.PI) / 180) * 62}
        className="stroke-slate-600 dark:stroke-white"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + Math.sin((secAngle * Math.PI) / 180) * 72}
        y2={cy - Math.cos((secAngle * Math.PI) / 180) * 72}
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4} fill="#38bdf8" />
    </svg>
  );
}
