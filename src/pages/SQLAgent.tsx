import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Sparkles, 
  Clock, 
  ArrowRight,
  Table,
  BarChart3,
  Download,
  Copy,
  Loader2,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";

interface QueryResult {
  sku: string;
  marketplace: string;
  issue: string;
  risk: string;
}

interface QueryResponse {
  success: boolean;
  queryId: string;
  sql: string;
  results: QueryResult[];
  rowCount: number;
  executionTime: string;
}

interface RecentQuery {
  id: string;
  query: string;
  time: string;
  timeRelative: string;
}

export default function SQLAgent() {
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState('india');

  // Fetch example queries
  const { data: examplesData } = useQuery<{ examples: string[] }>({
    queryKey: ["sql-agent", "examples"],
    queryFn: () => apiClient.get<{ examples: string[] }>("/sql-agent/examples"),
  });

  // Fetch recent queries
  const { data: recentQueriesData, isLoading: recentQueriesLoading } = useQuery<{ queries: RecentQuery[] }>({
    queryKey: ["sql-agent", "recent-queries"],
    queryFn: () => apiClient.get<{ queries: RecentQuery[] }>("/sql-agent/recent-queries?limit=10"),
  });

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      return apiClient.post<QueryResponse>("/sql-agent/query", {
        query: queryText,
        market,
      });
    },
    onError: () => {
      toast({
        title: "Query failed",
        description: "Failed to execute query",
        variant: "destructive",
      });
    },
  });

  // Visualize mutation
  const visualizeMutation = useMutation({
    mutationFn: async (queryId: string) => {
      return apiClient.post("/sql-agent/visualize", {
        queryId,
        chartType: "bar",
      });
    },
    onSuccess: () => {
      toast({
        title: "Visualizing",
        description: "Generating chart visualization...",
      });
    },
    onError: () => {
      toast({
        title: "Visualization failed",
        description: "Failed to generate visualization",
        variant: "destructive",
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (queryId: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "https://api.example.com/api/v1"}/sql-agent/export/${queryId}?format=csv`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `query-results-${queryId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export completed",
        description: "Data export downloaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export data",
        variant: "destructive",
      });
    },
  });

  const exampleQueries = examplesData?.examples ?? [
    "Show mismatched SKUs for Amazon.in last 2 days",
    "Which listings failed Takealot compliance?",
    "How much photoshoot cost saved in India this month?",
    "Generate Flipkart-ready content for this image",
    "List SKUs with missing localized content in South Africa"
  ];

  const recentQueries = recentQueriesData?.queries ?? [];
  const queryResult = queryMutation.data;
  const hasResult = !!queryResult;

  const handleSubmit = () => {
    if (query.trim()) {
      queryMutation.mutate(query);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-ai/10 to-ai/5 border border-ai/20">
              <MessageSquare className="w-6 h-6 text-ai" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Text-to-SQL Agent
            </h1>
            <Badge className="bg-gradient-to-r from-ai/10 to-ai/5 text-ai border-ai/20 px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Powered
            </Badge>
            {queryResult && (
              <Badge className="bg-success/10 text-success border-success/20 px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                API Connected
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Ask questions about your content data in natural language. Get instant insights without writing SQL.
          </p>
        </div>

      {/* Enhanced Query Input */}
      <div className="rounded-2xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationFillMode: 'forwards', animationDuration: '500ms' }}>
        <div className="relative">
          <div className="flex items-start gap-3 p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-border/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
            <MessageSquare className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your content data... (e.g., 'Show me all mismatches in Fashion category')"
              className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[80px] text-base"
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Market:</span>
              <Badge variant="outline">India 🇮🇳</Badge>
            </div>
            <Button 
              onClick={handleSubmit}
              className="gap-2 h-11 min-w-[140px] font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={!query.trim() || queryMutation.isPending}
            >
              {queryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Run Query
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Example Queries */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <p className="text-sm text-muted-foreground mb-3">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((eq) => (
              <button
                key={eq}
                onClick={() => setQuery(eq)}
                className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
              >
                {eq}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Results */}
        <div className="lg:col-span-2">
          {hasResult ? (
            <div className="rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
              <div className="p-5 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Table className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground text-lg">Query Results</span>
                  <Badge variant="secondary" className="font-semibold">{queryResult.rowCount} rows</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="gap-1"
                    onClick={() => queryResult && visualizeMutation.mutate(queryResult.queryId)}
                    disabled={visualizeMutation.isPending || !queryResult}
                  >
                    {visualizeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4" />
                    )}
                    Visualize
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="gap-1"
                    onClick={() => queryResult && exportMutation.mutate(queryResult.queryId)}
                    disabled={exportMutation.isPending || !queryResult}
                  >
                    {exportMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">SKU</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Marketplace</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Issue</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Revenue at Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.results.map((row, i) => (
                      <tr key={i} className="border-t border-border/30">
                        <td className="p-3">
                          <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                            {row.sku}
                          </code>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{row.marketplace}</Badge>
                        </td>
                        <td className="p-3 text-sm text-foreground">{row.issue}</td>
                        <td className="p-3 text-sm font-medium text-destructive">{row.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  Generated SQL: <code className="bg-muted px-1 rounded">{queryResult.sql}</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Execution time: {queryResult.executionTime}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-12 lg:p-16 text-center border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '100ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Ask a Question</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Type a question about your content data in natural language and our AI will generate the insights for you.
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Recent Queries */}
        <div className="rounded-xl p-6 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-lg">Recent Queries</h3>
          </div>

          <div className="space-y-3">
            {recentQueriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : recentQueries.length > 0 ? (
              recentQueries.map((rq) => (
                <button
                  key={rq.id}
                  onClick={() => setQuery(rq.query)}
                  className="w-full text-left p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-colors group"
                >
                  <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {rq.query}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{rq.timeRelative || rq.time}</p>
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No recent queries
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border/30">
            <h4 className="text-sm font-medium text-foreground mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => toast({
                  title: "Generating report",
                  description: "Creating daily mismatch report...",
                })}
              >
                <BarChart3 className="w-4 h-4" />
                Daily Mismatch Report
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => toast({
                  title: "Exporting",
                  description: "Exporting all issues...",
                })}
              >
                <Table className="w-4 h-4" />
                Export All Issues
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
