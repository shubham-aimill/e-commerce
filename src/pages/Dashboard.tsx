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
    // In a real app, this would trigger a download
  };

  const handleShare = () => {
    toast({
      title: "Share dashboard",
      description: "Dashboard link copied to clipboard.",
    });
    // In a real app, this would copy a shareable link
  };

  // Quick insights based on KPIs
  const quickInsights = [
    {
      type: "success" as const,
      message: "AI Photoshoot savings increased by 28% this month",
      icon: TrendingUp,
    },
    {
      type: "warning" as const,
      message: "3 critical mismatches detected in Fashion category",
      icon: AlertTriangle,
    },
    {
      type: "info" as const,
      message: "92% SKU coverage achieved - ahead of target",
      icon: Lightbulb,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section with Better Spacing */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                AI E-Commerce Content Intelligence
              </h1>
              <p className="text-base text-muted-foreground">
                Global Command Center • Real-time content accuracy • AI imagery • Marketplace compliance
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
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
                  comparisonMode === "period" && "bg-primary/10 border-primary text-primary"
                )}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Compare
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* Quick Insights Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickInsights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-xl border transition-all hover:shadow-md",
                  "opacity-0 animate-fade-in",
                  insight.type === "success" && "bg-success/5 border-success/20",
                  insight.type === "warning" && "bg-warning/5 border-warning/20",
                  insight.type === "info" && "bg-info/5 border-info/20"
                )}
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      insight.type === "success" && "bg-success/10",
                      insight.type === "warning" && "bg-warning/10",
                      insight.type === "info" && "bg-info/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        insight.type === "success" && "text-success",
                        insight.type === "warning" && "text-warning",
                        insight.type === "info" && "text-info"
                      )}
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{insight.message}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* KPI Grid - 12 Column System */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {isLoading && !kpis.length && (
            <>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="metric-card animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-muted" />
                    <div className="h-6 w-16 rounded-full bg-muted" />
                  </div>
                  <div className="h-8 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-12 w-full bg-muted rounded" />
                </div>
              ))}
            </>
          )}
          {!isLoading &&
            !isError &&
            kpis.map((kpi, index) => {
              // Determine status color based on metric
              let statusColor: "success" | "warning" | "danger" | "info" | undefined;
              if (kpi.title.includes("Savings") || kpi.title.includes("Coverage") || kpi.title.includes("Complete")) {
                statusColor = kpi.change >= 0 ? "success" : "warning";
              } else if (kpi.title.includes("Risk") || kpi.title.includes("Mismatch")) {
                statusColor = kpi.change >= 0 ? "danger" : "success";
              } else if (kpi.title.includes("Compliance")) {
                statusColor = "info";
              }

              return (
                <KPICard
                  key={kpi.title}
                  title={kpi.title}
                  value={kpi.value}
                  change={kpi.change}
                  icon={iconMap[kpi.icon]}
                  iconColor={kpi.iconColor}
                  delay={index * 50}
                  isFromBackend={!!data}
                  statusColor={statusColor}
                />
              );
            })}
          {isError && (
            <>
              {/* Show dummy data when API fails */}
              {[
                { title: "Image-Description Mismatch", value: "3.2%", change: -12, icon: ImageOff, iconColor: "text-destructive", status: "danger" as const },
                { title: "AI Photoshoot Savings", value: "₹18.5L", change: 28, icon: Camera, iconColor: "text-success", status: "success" as const },
                { title: "Compliance Score", value: "94/100", change: 5, icon: ShieldCheck, iconColor: "text-primary", status: "info" as const },
                { title: "Localization Complete", value: "87%", change: 15, icon: Languages, iconColor: "text-info", status: "success" as const },
                { title: "SKU AI-Coverage", value: "92%", change: 8, icon: Cpu, iconColor: "text-ai", status: "success" as const },
                { title: "Revenue at Risk", value: "₹2.3Cr", change: -22, icon: AlertTriangle, iconColor: "text-warning", status: "warning" as const },
              ].map((kpi, index) => (
                <KPICard
                  key={kpi.title}
                  title={kpi.title}
                  value={kpi.value}
                  change={kpi.change}
                  icon={kpi.icon}
                  iconColor={kpi.iconColor}
                  delay={index * 50}
                  isFromBackend={false}
                  statusColor={kpi.status}
                />
              ))}
            </>
          )}
        </div>

        {/* Main Content Grid - Better Spacing */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <QualityRiskRadar />
          <PhotoshootPerformance />
        </div>

        {/* Bottom Section - Better Spacing */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <AlertsList />
          <ImpactMetrics />
        </div>
      </div>
    </div>
  );
}
