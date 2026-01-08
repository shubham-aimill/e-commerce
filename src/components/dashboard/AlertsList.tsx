import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, AlertCircle, Info, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  sku: string;
  message: string;
  marketplace: string;
  timestamp: string;
  timestampRelative: string;
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

const alertConfig = {
  critical: {
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    dot: 'bg-destructive'
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    dot: 'bg-warning'
  },
  info: {
    icon: Info,
    color: 'text-info',
    bg: 'bg-info/10',
    dot: 'bg-info'
  }
};

export function AlertsList() {
  const { data, isLoading, error } = useQuery<AlertsResponse>({
    queryKey: ["dashboard", "alerts"],
    queryFn: () => apiClient.get<AlertsResponse>("/dashboard/alerts?limit=50"),
  });

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-destructive">Failed to load alerts</p>
        </div>
      </div>
    );
  }

  // Fallback dummy data
  const dummyAlerts: Alert[] = [
    {
      id: '1',
      type: 'critical',
      sku: 'SKU-8742',
      message: 'Color mismatch detected: Listed as "Navy Blue", image shows "Black"',
      marketplace: 'Amazon.in',
      timestamp: '2 min ago',
      timestampRelative: '2 min ago'
    },
    {
      id: '2',
      type: 'warning',
      sku: 'SKU-3291',
      message: 'Missing Hindi translation for product description',
      marketplace: 'Flipkart',
      timestamp: '15 min ago',
      timestampRelative: '15 min ago'
    },
    {
      id: '3',
      type: 'critical',
      sku: 'SKU-1056',
      message: 'Image resolution below marketplace requirements (800px min)',
      marketplace: 'Takealot',
      timestamp: '32 min ago',
      timestampRelative: '32 min ago'
    },
    {
      id: '4',
      type: 'info',
      sku: 'SKU-7823',
      message: 'New AI photoshoot completed - pending review',
      marketplace: 'eBay',
      timestamp: '1 hr ago',
      timestampRelative: '1 hr ago'
    },
    {
      id: '5',
      type: 'warning',
      sku: 'SKU-4521',
      message: 'Size attribute mismatch between title and specifications',
      marketplace: 'Amazon.in',
      timestamp: '2 hr ago',
      timestampRelative: '2 hr ago'
    },
  ];

  const alerts = data?.alerts.length ? data.alerts : dummyAlerts;
  const criticalCount = data?.criticalCount ?? alerts.filter(a => a.type === 'critical').length;
  const isUsingDummy = error || (!data && !isLoading);

  return (
    <div className="glass-card rounded-xl p-8 opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-foreground tracking-tight">Real-Time Quality Alerts</h3>
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
          <p className="text-sm text-muted-foreground">Live content issues requiring attention</p>
        </div>
        <Badge variant="secondary" className="gap-2 px-3 py-1.5">
          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span className="font-semibold">{criticalCount} Critical</span>
        </Badge>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No alerts at this time</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          
          return (
            <div 
              key={alert.id}
              className={cn(
                "p-5 rounded-xl border border-border/50 transition-all hover:shadow-md hover:border-opacity-100",
                "opacity-0 animate-slide-up",
                config.bg
              )}
              style={{ animationDelay: `${500 + index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start gap-4">
                <div className={cn("w-3 h-3 rounded-full mt-1.5 flex-shrink-0", config.dot)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-foreground font-semibold">
                      {alert.sku}
                    </code>
                    <Badge variant="outline" className="text-xs font-medium">
                      {alert.marketplace}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-foreground leading-relaxed mb-3">
                    {alert.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-medium">{alert.timestampRelative || alert.timestamp}</span>
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 text-xs gap-1.5 font-medium"
                      onClick={() => toast({
                        title: "View details",
                        description: `Viewing details for ${alert.sku}`,
                      })}
                    >
                      View Details
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
          })
        )}
      </div>
    </div>
  );
}
