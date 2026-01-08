import { LucideIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  changeLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
  isFromBackend?: boolean;
  sparklineData?: number[];
  statusColor?: "success" | "warning" | "danger" | "info";
}

// Generate mock sparkline data if not provided
function generateSparklineData(change: number): number[] {
  const base = 50;
  const points = 12;
  const trend = change > 0 ? 1 : -1;
  return Array.from({ length: points }, (_, i) => {
    const variation = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, base + (i * trend * 2) + variation));
  });
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeLabel = "vs last period",
  icon: Icon,
  iconColor = "text-primary",
  delay = 0,
  isFromBackend = false,
  sparklineData,
  statusColor
}: KPICardProps) {
  const isPositive = change >= 0;
  const sparkData = sparklineData || generateSparklineData(change);
  const maxValue = Math.max(...sparkData);
  const minValue = Math.min(...sparkData);
  const range = maxValue - minValue || 1;
  
  // Determine status color based on metric type
  const getStatusColor = () => {
    if (statusColor) {
      if (statusColor === "success") return "border-l-success";
      if (statusColor === "warning") return "border-l-warning";
      if (statusColor === "danger") return "border-l-destructive";
      if (statusColor === "info") return "border-l-info";
    }
    return isPositive ? "border-l-success" : "border-l-destructive";
  };

  const getIconBg = () => {
    if (statusColor) {
      if (statusColor === "success") return "bg-success/10";
      if (statusColor === "warning") return "bg-warning/10";
      if (statusColor === "danger") return "bg-destructive/10";
      if (statusColor === "info") return "bg-info/10";
    }
    return "bg-primary/10";
  };

  const getChangeColor = () => {
    if (statusColor === "danger" && isPositive) return "text-destructive";
    if (statusColor === "success" && !isPositive) return "text-success";
    return isPositive ? "text-success" : "text-destructive";
  };
  
  return (
    <div 
      className={cn(
        "metric-card border-l-4",
        getStatusColor(),
        "opacity-0 animate-fade-in group"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      role="region"
      aria-label={`${title}: ${value}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
          "group-hover:scale-110",
          getIconBg()
        )}>
          <Icon className={cn("w-6 h-6", iconColor || "text-primary")} aria-hidden="true" />
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
          isPositive 
            ? "bg-success/10 text-success" 
            : "bg-destructive/10 text-destructive"
        )}>
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="font-bold">{Math.abs(change)}%</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <h3 className="text-3xl font-bold text-foreground mb-1 tracking-tight" aria-label={`Value: ${value}`}>
            {value}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>

        {/* Sparkline Chart */}
        <div className="relative h-12 w-full -mx-1">
          <svg 
            className="w-full h-full" 
            viewBox="0 0 100 40" 
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M ${sparkData.map((val, i) => {
                const x = (i / (sparkData.length - 1)) * 100;
                const y = 40 - ((val - minValue) / range) * 35;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}`}
              fill="none"
              stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`M ${sparkData.map((val, i) => {
                const x = (i / (sparkData.length - 1)) * 100;
                const y = 40 - ((val - minValue) / range) * 35;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')} L 100 40 L 0 40 Z`}
              fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
            />
          </svg>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{changeLabel}</p>
          {isFromBackend ? (
            <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success border-success/30 font-medium">
              Live
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground border-muted font-medium">
              Demo
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
