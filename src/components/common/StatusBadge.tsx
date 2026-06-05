import { cn } from '@/lib/utils';

export type StatusType =
  | 'normal'
  | 'warning'
  | 'alarm'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'offline'
  | 'success';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, {
  label: string;
  bg: string;
  text: string;
  dot: string;
  border: string;
}> = {
  normal: {
    label: '正常',
    bg: 'bg-water-green/15',
    text: 'text-water-green',
    dot: 'bg-water-green',
    border: 'border-water-green/30',
  },
  warning: {
    label: '警告',
    bg: 'bg-water-yellow/15',
    text: 'text-water-yellow',
    dot: 'bg-water-yellow',
    border: 'border-water-yellow/30',
  },
  alarm: {
    label: '报警',
    bg: 'bg-water-red/15',
    text: 'text-water-red',
    dot: 'bg-water-red',
    border: 'border-water-red/30',
  },
  pending: {
    label: '待处理',
    bg: 'bg-water-orange/15',
    text: 'text-water-orange',
    dot: 'bg-water-orange',
    border: 'border-water-orange/30',
  },
  processing: {
    label: '进行中',
    bg: 'bg-water-cyan/15',
    text: 'text-water-cyan',
    dot: 'bg-water-cyan',
    border: 'border-water-cyan/30',
  },
  completed: {
    label: '已完成',
    bg: 'bg-water-teal/15',
    text: 'text-water-teal',
    dot: 'bg-water-teal',
    border: 'border-water-teal/30',
  },
  offline: {
    label: '离线',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
    border: 'border-slate-500/30',
  },
  success: {
    label: '成功',
    bg: 'bg-water-green/15',
    text: 'text-water-green',
    dot: 'bg-water-green',
    border: 'border-water-green/30',
  },
};

export default function StatusBadge({
  status,
  text,
  showDot = true,
  pulse = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayText = text ?? config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border',
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      {showDot && (
        <span
          className={cn(
            'relative w-1.5 h-1.5 rounded-full',
            config.dot,
            pulse && 'animate-pulse',
          )}
        >
          {pulse && (
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-75',
                config.dot,
              )}
            />
          )}
        </span>
      )}
      {displayText}
    </span>
  );
}
