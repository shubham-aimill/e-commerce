import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

interface CostDataPoint {
  month: string;
  saved: number;
}

interface RejectionDataPoint {
  name: string;
  value: number;
  color: string;
}

interface StyleCard {
  name: string;
  count: number;
  trend: string;
}

interface PhotoshootPerformanceResponse {
  costData: CostDataPoint[];
  rejectionData: RejectionDataPoint[];
  styleCards: StyleCard[];
}

export function PhotoshootPerformance() {
  const { data, isLoading, isError } = useQuery<PhotoshootPerformanceResponse>({
    queryKey: ["dashboard", "photoshoot-performance"],
    queryFn: () => apiClient.get<PhotoshootPerformanceResponse>("/dashboard/photoshoot-performance"),
  });

  // Fallback dummy data with modern colors
  const dummyCostData = [
    { month: 'Jan', saved: 125000 },
    { month: 'Feb', saved: 185000 },
    { month: 'Mar', saved: 220000 },
    { month: 'Apr', saved: 190000 },
    { month: 'May', saved: 275000 },
    { month: 'Jun', saved: 310000 },
  ];
  const dummyRejectionData = [
    { name: 'Amazon', value: 12, color: 'hsl(var(--primary))' },
    { name: 'Flipkart', value: 8, color: 'hsl(var(--info))' },
    { name: 'Takealot', value: 5, color: 'hsl(var(--success))' },
    { name: 'eBay', value: 15, color: 'hsl(var(--warning))' },
  ];
  const dummyStyleCards = [
    { name: 'Lifestyle', count: 1247, trend: '+15%' },
    { name: 'Studio', count: 892, trend: '+8%' },
    { name: 'Flat Lay', count: 634, trend: '+22%' },
  ];

  const costData = data?.costData.length ? data.costData : dummyCostData;
  const rejectionData = data?.rejectionData.length ? data.rejectionData : dummyRejectionData;
  const styleCards = data?.styleCards.length ? data.styleCards : dummyStyleCards;
  const isUsingDummy = isError || (!data && !isLoading);

  // Calculate total for donut chart center
  const totalRejections = rejectionData.reduce((sum, item) => sum + item.value, 0);
  const avgRejection = Math.round(totalRejections / rejectionData.length);

  return (
    <div className="glass-card rounded-xl p-8 opacity-0 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-foreground tracking-tight">AI Photoshoot Performance</h3>
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
        <p className="text-sm text-muted-foreground mt-1">Cost savings and efficiency metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Savings Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-foreground">Monthly Cost Savings</h4>
            <span className="text-xs text-muted-foreground font-medium">₹ in thousands</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary-700))" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.3}
                  vertical={false}
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₹${value / 1000}K`}
                  width={60}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '8px 12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Saved']}
                  labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  cursor={{ fill: 'hsl(var(--primary))', fillOpacity: 0.1 }}
                />
                <Bar 
                  dataKey="saved" 
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rejection Rate Donut */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-foreground">Rejection Rate by Marketplace</h4>
            <span className="text-xs text-muted-foreground font-medium">% rejected</span>
          </div>
          <div className="h-64 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {rejectionData.map((entry, index) => (
                    <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={rejectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {rejectionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#gradient-${index})`}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '8px 12px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Rejection Rate']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{avgRejection}%</div>
                <div className="text-xs text-muted-foreground font-medium">Avg Rate</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {rejectionData.map((item) => (
              <div 
                key={item.name} 
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.value}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Style Distribution */}
      <div className="mt-8 pt-8 border-t border-border/50">
        <h4 className="text-base font-semibold text-foreground mb-4">Style Distribution</h4>
        <div className="grid grid-cols-3 gap-4">
          {styleCards.map((style) => (
            <div 
              key={style.name}
              className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50 hover:border-border hover:shadow-md transition-all group"
            >
              <div className="text-2xl font-bold text-foreground mb-1">{style.count.toLocaleString()}</div>
              <div className="text-sm font-medium text-muted-foreground mb-2">{style.name}</div>
              <div className="flex items-center gap-1 text-xs font-semibold text-success">
                <span>↑</span>
                <span>{style.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
