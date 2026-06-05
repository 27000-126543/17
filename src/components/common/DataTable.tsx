import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: keyof T | string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: keyof T | ((row: T) => string);
  emptyText?: string;
  className?: string;
  headerClassName?: string;
  rowClassName?: ((row: T, index: number) => string) | string;
  onRowClick?: (row: T, index: number) => void;
  striped?: boolean;
  hoverable?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  emptyText = '暂无数据',
  className,
  headerClassName,
  rowClassName,
  onRowClick,
  striped = true,
  hoverable = true,
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(row);
    }
    if (rowKey && row[rowKey] !== undefined) {
      return String(row[rowKey]);
    }
    return String(index);
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  const resolveRowClassName = (row: T, index: number): string => {
    if (typeof rowClassName === 'function') {
      return rowClassName(row, index);
    }
    return rowClassName ?? '';
  };

  return (
    <div className={cn('relative glass-card corner-deco rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={cn(
              'relative',
              headerClassName,
            )}>
              <th
                colSpan={columns.length}
                className="p-0 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-water-cyan/40 to-transparent pointer-events-none"
              />
              {columns.map((col, colIndex) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider',
                    'text-water-cyan/90 bg-water-cyan/5',
                    'border-b border-water-cyan/15',
                    getAlignClass(col.align),
                  )}
                  style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    {colIndex === 0 && (
                      <span className="w-1 h-1 rounded-full bg-water-cyan/60" />
                    )}
                    {col.title}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-slate-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-water-cyan/5 flex items-center justify-center">
                      <svg className="w-6 h-6 text-water-cyan/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span className="text-sm">{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={cn(
                    'transition-all duration-150',
                    striped && rowIndex % 2 === 1 ? 'bg-white/[0.015]' : '',
                    hoverable ? 'hover:bg-water-cyan/5 cursor-pointer' : '',
                    onRowClick && 'cursor-pointer',
                    resolveRowClassName(row, rowIndex),
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((col) => {
                    const value = typeof col.key === 'string' ? row[col.key] : undefined;
                    const displayValue = col.render
                      ? col.render(value, row, rowIndex)
                      : (value !== undefined && value !== null ? String(value) : '-');
                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'px-4 py-3 text-sm text-slate-300',
                          'border-b border-water-cyan/5',
                          getAlignClass(col.align),
                        )}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-water-cyan/20 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
