interface StatusBadgeProps {
  value: string;
  statusMap: Record<string, string>;
  formatter?: (value: string) => string;
}

export function StatusBadge({ value, statusMap, formatter }: StatusBadgeProps) {
  const displayValue = formatter ? formatter(value) : value;
  const className = statusMap?.[value] ?? "bg-gray-100 text-gray-800";
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {displayValue}
    </span>
  );
}