import { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  threshold?: number;
  unit?: string;
  label?: string;
  className?: string;
}

export default function GaugeChart({
  value,
  min = 0,
  max = 100,
  threshold,
  unit = '',
  label,
  className,
}: GaugeChartProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);
  const isWarning = threshold !== undefined && value > threshold;

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();
    const startValue = previousValueRef.current;
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const next = startValue + (value - startValue) * easeOutCubic;
      setDisplayValue(next);
      previousValueRef.current = next;
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  const normalColor = '#00D4FF';
  const warningColor = '#FF4D4F';
  const trackColor = 'rgba(0, 212, 255, 0.1)';
  const progressColor = isWarning ? warningColor : normalColor;

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min,
        max,
        center: ['50%', '60%'],
        radius: '85%',
        splitNumber: 10,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: progressColor },
              { offset: 1, color: isWarning ? '#FF7A45' : '#00E5CC' },
            ],
          },
          shadowColor: progressColor,
          shadowBlur: 20,
        },
        progress: {
          show: true,
          width: 14,
          roundCap: true,
        },
        pointer: { show: false },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [[1, trackColor]],
          },
          roundCap: true,
        },
        axisTick: { show: false },
        splitLine: {
          distance: -20,
          length: 8,
          lineStyle: {
            color: 'rgba(0, 212, 255, 0.3)',
            width: 1,
          },
        },
        axisLabel: {
          distance: -8,
          color: 'rgba(148, 163, 184, 0.5)',
          fontSize: 10,
          fontFamily: '"JetBrains Mono", "SF Mono", Menlo, monospace',
        },
        anchor: { show: false },
        title: { show: false },
        detail: { show: false },
      },
    ],
  };

  return (
    <div className={cn('relative glass-card corner-deco rounded-xl p-5 overflow-hidden', className)}>
      <div
        className={cn(
          'absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 blur-3xl',
          isWarning ? 'bg-water-red' : 'bg-water-cyan',
        )}
      />
      <div className="relative z-10">
        {label && (
          <div className="text-sm text-slate-400 text-center mb-2">{label}</div>
        )}
        <div className="relative h-44">
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={cn(
                'data-number text-4xl font-bold tracking-tight',
                isWarning ? 'text-water-red' : 'text-water-cyan',
                'glow-text',
              )}
            >
              {displayValue.toFixed(max >= 10 ? 1 : 2)}
            </span>
            {unit && (
              <span className="text-sm text-slate-400 mt-1">{unit}</span>
            )}
          </div>
        </div>
        {threshold !== undefined && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs">
            <span className="text-slate-500">阈值:</span>
            <span className="data-number text-water-yellow">{threshold}</span>
            {isWarning && (
              <span className="flex items-center gap-1 text-water-red ml-2 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-water-red" />
                超标
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
