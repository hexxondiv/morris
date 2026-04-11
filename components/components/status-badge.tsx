import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  value: string;
  statusMap: Record<string, string>; // status => Tailwind class
  className?: string;
  formatter?: (value: string) => string;
}

export function StatusBadge({
  value,
  statusMap,
  className = "",
  formatter = (val) => val.charAt(0).toUpperCase() + val.slice(1),
}: StatusBadgeProps) {
  const style = statusMap[value] || "bg-muted text-muted-foreground";

  return (
    <Badge className={`whitespace-nowrap ${style} ${className}`} variant="outline">
      {formatter(value)}
    </Badge>
  );
}
