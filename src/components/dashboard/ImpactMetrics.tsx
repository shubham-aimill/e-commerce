import { useQuery } from "@tanstack/react-query";
import { Clock, DollarSign, Zap, ShieldCheck, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface Metric {
  icon: string;
  value: string;
  unit: string;
  label: string;
  description: string;
  gradient: string;
}

interface ImpactMetricsResponse {
  metrics: Metric[];
  roi: {
    percentage: number;
    period: string;
    targetAchievement: number;
  };
}

const iconMap: Record<string, LucideIcon> = {
  Clock,
  DollarSign,
  Zap,
  ShieldCheck,
};

export function ImpactMetrics() {
  const { data, isLoading, error } = useQuery<ImpactMetricsResponse>({
    queryKey: ["dashboard", "impact-metrics"],
    queryFn: () => apiClient.get<ImpactMetricsResponse>("/dashboard/impact-metrics?period=month"),
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-destructive">Failed to load metrics</p>
        </div>
      </div>
    );
  }

  // Fallback dummy data
  const dummyMetrics = [
    {
      icon: "Clock",
      value: "2,847",
      unit: "hrs",
      label: "Time Saved",
      description: "This month",
      gradient: "from-sand-400/20 to-sand-500/20"
    },
    {
      icon: "DollarSign",
      value: "₹18.5L",
      unit: "",
      label: "Cost Avoided",
      description: "Photography expenses",
      gradient: "from-success/10 to-success/20"
    },
    {
      icon: "Zap",
      value: "+47%",
      unit: "",
      label: "SKU Throughput",
      description: "vs manual process",
      gradient: "from-warning/10 to-warning/20"
    },
    {
      icon: "ShieldCheck",
      value: "89%",
      unit: "",
      label: "Error Reduction",
      description: "Listing rejections",
      gradient: "from-info/10 to-info/20"
    }
  ];
  const dummyRoi = {
    percentage: 312,
    period: "quarter",
    targetAchievement: 78
  };

  const metrics = data?.metrics.length ? data.metrics : dummyMetrics;
  const roi = data?.roi || dummyRoi;
  const isUsingDummy = error || (!data && !isLoading);
  return (
    <div className="glass-card rounded-xl p-8 opacity-0 animate-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'forwards' }}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-foreground tracking-tight">AI Business Impact</h3>
          {data ? (
            <Badge variant="default" className="text-[10px] px-2 py-0.5 bg-success/20 text-success border-success/30 font-medium">
              Live
            </Badge>
          ) : isUsingDummy ? (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground border-muted font-medium">
              Demo
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Measurable outcomes from automation</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => {
          const Icon = iconMap[metric.icon] || Clock;
          return (
            <div 
              key={metric.label}
              className={cn(
                "p-5 rounded-xl border border-border/50 bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-md",
                "opacity-0 animate-scale-in",
                metric.gradient
              )}
              style={{ animationDelay: `${600 + index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-card/80 flex items-center justify-center border border-border/50">
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground tracking-tight">{metric.value}</span>
                  {metric.unit && (
                    <span className="text-sm text-muted-foreground font-medium">{metric.unit}</span>
                  )}
                </div>
                <div className="text-sm font-semibold text-foreground">{metric.label}</div>
                <div className="text-xs text-muted-foreground">{metric.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {roi && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">ROI This {roi.period.charAt(0).toUpperCase() + roi.period.slice(1)}</span>
            <span className="text-lg font-bold text-success">+{roi.percentage}%</span>
          </div>
          <div className="progress-bar h-3">
            <div 
              className="progress-fill bg-gradient-to-r from-primary to-primary-700 rounded-full transition-all duration-1000"
              style={{ width: `${roi.targetAchievement}%` }}
              aria-valuenow={roi.targetAchievement}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">{roi.targetAchievement}% of annual target achieved</p>
        </div>
      )}
    </div>
  );
}
