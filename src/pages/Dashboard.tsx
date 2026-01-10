import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  ImageOff,
  Camera,
  ShieldCheck,
  Languages,
  Cpu,
  AlertTriangle,
  Download,
  Share2,
  Calendar,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { QualityRiskRadar } from "@/components/dashboard/QualityRiskRadar";
import { PhotoshootPerformance } from "@/components/dashboard/PhotoshootPerformance";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { ImpactMetrics } from "@/components/dashboard/ImpactMetrics";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DashboardKpiIconName =
  | "ImageOff"
  | "Camera"
  | "ShieldCheck"
  | "Languages"
  | "Cpu"
  | "AlertTriangle";

interface DashboardKpiDto {
  title: string;
  value: string;
  change: number;
  icon: DashboardKpiIconName;
  iconColor: string;
}

interface DashboardKpisResponse {
  kpis: DashboardKpiDto[];
}

const iconMap: Record<DashboardKpiIconName, typeof ImageOff> = {
  ImageOff,
  Camera,
  ShieldCheck,
  Languages,
  Cpu,
  AlertTriangle,
};

export default function Dashboard() {
  const [comparisonMode, setComparisonMode] = useState<"period" | "none">("none");
  const [dateRange, setDateRange] = useState("30d");

  const { data, isLoading, isError } = useQuery<DashboardKpisResponse>({
    queryKey: ["dashboard", "kpis", dateRange],
    queryFn: () => apiClient.get<DashboardKpisResponse>(`/dashboard/kpis?period=${dateRange}`),
  });

  const kpis = data?.kpis ?? [];

  const handleExport = () => {
    toast({
      title: "Exporting dashboard",
      description: "Your dashboard data is being prepared for download.",
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Dashboard link copied to clipboard.",
    });
  };

  // Quick insights based on KPIs
  const quickInsights = [
    {
      type: "success" as const,
      message: "AI Photoshoot savings increased by 28% this month",
      icon: TrendingUp,
      gradient: "from-success/20 to-success/5",
      borderColor: "border-success/30",
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      type: "warning" as const,
      message: "3 critical mismatches detected in Fashion category",
      icon: AlertTriangle,
      gradient: "from-warning/20 to-warning/5",
      borderColor: "border-warning/30",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      type: "info" as const,
      message: "92% SKU coverage achieved - ahead of target",
      icon: Lightbulb,
      gradient: "from-info/20 to-info/5",
      borderColor: "border-info/30",
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Header Section */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                    AI E-Commerce Content Intelligence
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Global Command Center • Real-time content accuracy • AI imagery • Marketplace compliance
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px] h-10 bg-background/50 border-border/50">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setComparisonMode(comparisonMode === "period" ? "none" : "period")}
                className={cn(
                  "h-10 transition-all duration-200",
                  comparisonMode === "period" && "bg-primary/10 border-primary text-primary shadow-sm"
                )}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Compare
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare}
                className="h-10 hover:bg-muted/50 transition-colors"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="h-10 hover:bg-muted/50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Quick Insights Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {quickInsights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={cn(
                  "p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer group",
                  `bg-gradient-to-br ${insight.gradient}`,
                  `border-${insight.borderColor}`,
                  "animate-fade-in"
                )}
                style={{ 
                  animationDelay: `${index * 100}ms`, 
                  animationFillMode: 'forwards',
                  opacity: 0
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                    insight.iconBg
                  )}>
                    <Icon className={cn("w-6 h-6", insight.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      {insight.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <ChevronRight className={cn("w-4 h-4 transition-transform duration-300 group-hover:translate-x-1", insight.iconColor)} />
                      <span className={cn("text-xs font-medium", insight.iconColor)}>Learn more</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced KPI Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Key Performance Indicators</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6 items-stretch">
            {isLoading && !kpis.length && (
              <>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-48 rounded-xl bg-muted/50 animate-pulse border border-border/50"
                  />
                ))}
              </>
            )}
            {!isLoading &&
              !isError &&
              kpis.map((kpi, index) => {
                let statusColor: "success" | "warning" | "danger" | "info" | undefined;
                if (kpi.title.includes("Savings") || kpi.title.includes("Coverage") || kpi.title.includes("Complete")) {
                  statusColor = kpi.change >= 0 ? "success" : "warning";
                } else if (kpi.title.includes("Risk") || kpi.title.includes("Mismatch")) {
                  statusColor = kpi.change >= 0 ? "danger" : "success";
                } else if (kpi.title.includes("Compliance")) {
                  statusColor = "info";
                }

                return (
                  <div
                    key={kpi.title}
                    className="animate-fade-in h-full flex"
                    style={{ 
                      animationDelay: `${index * 50}ms`, 
                      animationFillMode: 'forwards',
                      animationDuration: '400ms'
                    }}
                  >
                    <KPICard
                      title={kpi.title}
                      value={kpi.value}
                      change={kpi.change}
                      icon={iconMap[kpi.icon]}
                      iconColor={kpi.iconColor}
                      delay={index * 50}
                      isFromBackend={!!data}
                      statusColor={statusColor}
                    />
                  </div>
                );
              })}
            {isError && (
              <>
                {[
                  { title: "Image-Description Mismatch", value: "3.2%", change: -12, icon: ImageOff, iconColor: "text-destructive", status: "danger" as const },
                  { title: "AI Photoshoot Savings", value: "₹18.5L", change: 28, icon: Camera, iconColor: "text-success", status: "success" as const },
                  { title: "Compliance Score", value: "94/100", change: 5, icon: ShieldCheck, iconColor: "text-primary", status: "info" as const },
                  { title: "Localization Complete", value: "87%", change: 15, icon: Languages, iconColor: "text-info", status: "success" as const },
                  { title: "SKU AI-Coverage", value: "92%", change: 8, icon: Cpu, iconColor: "text-ai", status: "success" as const },
                  { title: "Revenue at Risk", value: "₹2.3Cr", change: -22, icon: AlertTriangle, iconColor: "text-warning", status: "warning" as const },
                ].map((kpi, index) => (
                  <div
                    key={kpi.title}
                    className="animate-fade-in h-full flex"
                    style={{ 
                      animationDelay: `${index * 50}ms`, 
                      animationFillMode: 'forwards',
                      animationDuration: '400ms'
                    }}
                  >
                    <KPICard
                      title={kpi.title}
                      value={kpi.value}
                      change={kpi.change}
                      icon={kpi.icon}
                      iconColor={kpi.iconColor}
                      delay={index * 50}
                      isFromBackend={false}
                      statusColor={kpi.status}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Enhanced Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div className="animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards', opacity: 0 }}>
            <QualityRiskRadar />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards', opacity: 0 }}>
            <PhotoshootPerformance />
          </div>
        </div>

        {/* Enhanced Bottom Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <div className="animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'forwards', opacity: 0 }}>
            <AlertsList />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'forwards', opacity: 0 }}>
            <ImpactMetrics />
          </div>
        </div>
      </div>
    </div>
  );
}
