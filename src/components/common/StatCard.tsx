import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatCardColor = 'cyan' | 'teal' | 'green' | 'yellow' | 'orange' | 'purple';

interface StatCardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: number;
  trendUp?: boolean;
  icon?: React.ReactNode;
  color?: StatCardColor;
  sparklineData?: number[];
}

const colorMap: Record<StatCardColor, {
  from: string;
  to: string;
  text: string;
  bg: string;
  glow: string;
  border: string;
}> = {
  cyan: {
    from: 'from-water-cyan',
    to: 'to-water-teal',
    text: 'text-water-cyan',
    bg: 'bg-water-cyan/15',
    glow: 'shadow-water-cyan/20',
    border: 'from-water-cyan/50',
  },
  teal: {
    from: 'from-water-teal',
    to: 'to-water-green',
    text: 'text-water-teal',
    bg: 'bg-water-teal/15',
    glow: 'shadow-water-teal/20',
    border: 'from-water-teal/50',
  },
  green: {
    from: 'from-water-green',
    to: 'to-water-teal',
    text: 'text-water-green',
    bg: 'bg-water-green/15',
    glow: 'shadow-water-green/20',
    border: 'from-water-green/50',
  },
  yellow: {
    from: 'from-water-yellow',
    to: 'to-water-orange',
    text: 'text-water-yellow',
    bg: 'bg-water-yellow/15',
    glow: 'shadow-water-yellow/20',
    border: 'from-water-yellow/50',
  },
  orange: {
    from: 'from-water-orange',
    to: 'to-water-red',
    text: 'text-water-orange',
    bg: 'bg-water-orange/15',
    glow: 'shadow-water-orange/20',
    border: 'from-water-orange/50',
  },
  purple: {
    from: 'from-water-purple',
    to: 'to-water-cyan',
    text: 'text-water-purple',
    bg: 'bg-water-purple/15',
    glow: 'shadow-water-purple/20',
    border: 'from-water-purple/50',
  },
};

function useCountUp(target: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;
    const startValue = 0;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(startValue + (target - startValue) * easeOutQuart);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return count;
}

function Sparkline({ data, color }: { data: number[]; color: StatCardColor }) {
  if (!data || data.length < 2) return null;

  const width = 100;
  const height = 36;
  const padding = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = [
    `${padding},${height - padding}`,
    ...data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }),
    `${width - padding},${height - padding}`,
  ].join(' ');

  const colors = colorMap[color];
  const gradientId = `spark-gradient-${color}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-9"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className={colors.text}>
        <polygon
          points={areaPoints}
          fill={`url(#${gradientId})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  if (Number.isInteger(num)) {
    return num.toFixed(0);
  }
  return num.toFixed(2);
}

export default function StatCard({
  title,
  value,
  unit,
  trend,
  trendUp,
  icon,
  color = 'cyan',
  sparklineData,
}: StatCardProps) {
  const animatedValue = useCountUp(value);
  const colors = colorMap[color];
  const isTrendingUp = trendUp ?? (trend !== undefined && trend >= 0);

  return (
    <div className="relative group">
      <div
        className={cn(
          'absolute -inset-px rounded-xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 blur-sm',
          'bg-gradient-to-br', colors.from, colors.to,
        )}
      />
      <div className="relative glass-card corner-deco p-5 rounded-xl overflow-hidden">
        <div
          className={cn(
            'absolute -top-0 -right-0 w-32 h-32 rounded-full opacity-10 blur-2xl transition-transform group-hover:scale-150 duration-500',
            'bg-gradient-to-br', colors.from, colors.to,
          )}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                  colors.from, colors.to, colors.glow,
                )}
              >
                {icon}
              </div>
              <div>
                <p className="text-sm text-slate-400">{title}</p>
              </div>
            </div>
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                isTrendingUp
                  ? 'bg-water-green/15 text-water-green'
                  : 'bg-water-red/15 text-water-red',
              )}>
                {isTrendingUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn(
              'data-number text-3xl font-bold tracking-tight',
              colors.text,
              'glow-text',
            )}>
              {formatNumber(animatedValue)}
            </span>
            {unit && (
              <span className="text-sm text-slate-400">{unit}</span>
            )}
          </div>

          {sparklineData && sparklineData.length >= 2 && (
            <div className="mt-3 -mx-1">
              <Sparkline data={sparklineData} color={color} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
