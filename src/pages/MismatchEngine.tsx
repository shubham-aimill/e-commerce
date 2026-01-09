import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Filter, 
  Download, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  Search,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { getColorMismatchDataset, type DatasetResponse } from "@/lib/color-mismatch-api";
import ProductImage from "@/components/ProductImage";

interface MismatchKPI {
  label: string;
  value: string;
  change: number;
  status: "success" | "warning" | "error";
}

interface MismatchRow {
  sku: string;
  marketplace: string;
  mismatchScore: number;
  attributeErrors: string[];
  localMissing: string[];
  category: string;
  issueType: string;
  listingProb: number;
  impactScore: number;
}

interface MismatchListResponse {
  data: MismatchRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
    marketplaces: string[];
    regions: string[];
  };
}

interface AttributeComparison {
  attribute: string;
  aiDetected: string;
  marketplaceListing: string;
  match: boolean;
  confidence: number;
}

interface AttributeComparisonResponse {
  sku: string;
  comparison: AttributeComparison[];
}

interface LocalizationStatus {
  [region: string]: {
    [lang: string]: {
      status: "complete" | "missing" | "pending";
      completeness: number;
    };
  };
}

interface LocalizationResponse {
  sku: string;
  localization: LocalizationStatus;
  missingTranslations: number;
  incorrectTranslations: number;
  nonCompliantKeywords: number;
}

const mockTableData: MismatchRow[] = [
  {
    sku: "SKU-8742",
    marketplace: "Amazon.in",
    mismatchScore: 85,
    attributeErrors: ["Color", "Size"],
    localMissing: ["hi", "ta"],
    category: "Fashion",
    issueType: "Color Mismatch",
    listingProb: 45,
    impactScore: 4.5
  },
  {
    sku: "SKU-3291",
    marketplace: "Flipkart",
    mismatchScore: 42,
    attributeErrors: ["Material"],
    localMissing: ["hi"],
    category: "Home",
    issueType: "Attribute Error",
    listingProb: 72,
    impactScore: 3.2
  },
  {
    sku: "SKU-1056",
    marketplace: "Takealot",
    mismatchScore: 95,
    attributeErrors: ["Color", "Pattern", "Size"],
    localMissing: ["zu", "af"],
    category: "Fashion",
    issueType: "Multiple Issues",
    listingProb: 15,
    impactScore: 4.9
  },
  {
    sku: "SKU-7823",
    marketplace: "Amazon.in",
    mismatchScore: 28,
    attributeErrors: [],
    localMissing: ["ta"],
    category: "Electronics",
    issueType: "Localization",
    listingProb: 88,
    impactScore: 2.1
  },
  {
    sku: "SKU-4521",
    marketplace: "eBay",
    mismatchScore: 67,
    attributeErrors: ["Size", "Dimensions"],
    localMissing: [],
    category: "Home",
    issueType: "Size Mismatch",
    listingProb: 55,
    impactScore: 3.8
  },
];

const flagEmojis: Record<string, string> = {
  hi: "🇮🇳",
  ta: "🇮🇳",
  te: "🇮🇳",
  bn: "🇮🇳",
  zu: "🇿🇦",
  af: "🇿🇦",
  xh: "🇿🇦",
  en: "🌍",
  es: "🌍",
  fr: "🌍",
  ar: "🌍"
};

export default function MismatchEngine() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [marketplace, setMarketplace] = useState("all");
  const [language, setLanguage] = useState("all");
  const [region, setRegion] = useState("all");
  const [issueType, setIssueType] = useState("all");
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Build query params
  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("search", searchQuery);
  if (category !== "all") queryParams.set("category", category);
  if (brand !== "all") queryParams.set("brand", brand);
  if (marketplace !== "all") queryParams.set("marketplace", marketplace);
  if (language !== "all") queryParams.set("language", language);
  if (region !== "all") queryParams.set("region", region);
  if (issueType !== "all") queryParams.set("issueType", issueType);
  queryParams.set("page", page.toString());
  queryParams.set("limit", "50");

  // Fetch KPIs
  const { data: kpisData, isLoading: kpisLoading } = useQuery<{ kpis: MismatchKPI[] }>({
    queryKey: ["mismatch", "kpis"],
    queryFn: () => apiClient.get<{ kpis: MismatchKPI[] }>("/mismatch/kpis"),
  });

  // Fetch mismatch list
  const { data: mismatchData, isLoading: mismatchLoading, error: mismatchError } = useQuery<MismatchListResponse>({
    queryKey: ["mismatch", "list", queryParams.toString()],
    queryFn: () => apiClient.get<MismatchListResponse>(`/mismatch/list?${queryParams.toString()}`),
  });

  // Fetch attribute comparison for selected SKU
  const { data: attributeData, isLoading: attributeLoading } = useQuery<AttributeComparisonResponse>({
    queryKey: ["mismatch", "attributes", selectedSku],
    queryFn: () => apiClient.get<AttributeComparisonResponse>(`/mismatch/sku/${selectedSku}/attributes`),
    enabled: !!selectedSku,
  });

  // Fetch localization for selected SKU
  const { data: localizationData, isLoading: localizationLoading } = useQuery<LocalizationResponse>({
    queryKey: ["mismatch", "localization", selectedSku],
    queryFn: () => apiClient.get<LocalizationResponse>(`/mismatch/sku/${selectedSku}/localization`),
    enabled: !!selectedSku,
  });

  // Load color-mismatch CSV to surface it under the Image-Description Audit Table
  const {
    data: colorCsv,
    isLoading: isColorCsvLoading,
    isError: isColorCsvError,
    error: colorCsvError,
  } = useQuery<DatasetResponse, Error>({
    queryKey: ["color-mismatch-dataset-summary"],
    queryFn: getColorMismatchDataset,
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "https://api.example.com/api/v1"}/mismatch/export?${queryParams.toString()}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mismatch-export-${new Date().toISOString()}.csv`;
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

  // Fix mutation
  const fixMutation = useMutation({
    mutationFn: async (data: { sku: string; action: string; parameters?: Record<string, unknown> }) => {
      return apiClient.post<{ success: boolean; message: string; jobId: string; estimatedTime: string }>("/mismatch/fix", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Fix process started",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["mismatch"] });
    },
    onError: () => {
      toast({
        title: "Fix failed",
        description: "Failed to start fix process",
        variant: "destructive",
      });
    },
  });

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategory("all");
    setBrand("all");
    setMarketplace("all");
    setLanguage("all");
    setRegion("all");
    setIssueType("all");
    toast({
      title: "Filters cleared",
      description: "All filters have been reset.",
    });
  };

  const handleMoreFilters = () => {
    toast({
      title: "More filters",
      description: "Additional filter options coming soon.",
    });
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleViewDetails = (sku: string) => {
    setSelectedSku(sku);
  };

  const handleFix = (sku: string) => {
    fixMutation.mutate({
      sku,
      action: "update_attributes",
      parameters: {
        marketplace: mismatchData?.data.find((r) => r.sku === sku)?.marketplace,
      },
    });
  };

  // Fallback dummy KPIs
  const dummyKpis: MismatchKPI[] = [
    { label: "Mismatch Rate", value: "3.2%", change: -12, status: "success" },
    { label: "Attribute Errors", value: "1,247", change: 8, status: "warning" },
    { label: "Localization Coverage", value: "87%", change: 15, status: "success" },
    { label: "Rejection Rate", value: "2.1%", change: -5, status: "success" },
    { label: "Revenue at Risk", value: "₹2.3Cr", change: -22, status: "warning" },
  ];

  const kpis = kpisData?.kpis.length ? kpisData.kpis : dummyKpis;
  const tableData = mismatchData?.data.length ? mismatchData.data : mockTableData;
  const filteredData = tableData; // Backend handles filtering when API is available

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Image-Description Mismatch Engine
          </h1>
          {mismatchData ? (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-success/20 text-success border-success/30">
              API
            </Badge>
          ) : mismatchError ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted">
              Demo
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          Detect and resolve content quality issues across marketplaces
        </p>
      </div>

      {/* Filters Bar */}
      <div className="glass-card rounded-xl p-4 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKUs..." 
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="fashion">Fashion</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="grocery">Grocery</SelectItem>
            </SelectContent>
          </Select>

          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              <SelectItem value="brand1">Brand A</SelectItem>
              <SelectItem value="brand2">Brand B</SelectItem>
              <SelectItem value="brand3">Brand C</SelectItem>
            </SelectContent>
          </Select>

          <Select value={marketplace} onValueChange={setMarketplace}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue placeholder="Marketplace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="amazon">Amazon.in</SelectItem>
              <SelectItem value="amazon-com">Amazon.com</SelectItem>
              <SelectItem value="flipkart">Flipkart</SelectItem>
              <SelectItem value="myntra">Myntra</SelectItem>
              <SelectItem value="takealot">Takealot</SelectItem>
              <SelectItem value="checkers">Checkers</SelectItem>
              <SelectItem value="woolworths">Woolworths</SelectItem>
              <SelectItem value="makro">Makro</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="magento">Magento</SelectItem>
              <SelectItem value="woocommerce">WooCommerce</SelectItem>
              <SelectItem value="ebay">eBay</SelectItem>
              <SelectItem value="walmart">Walmart</SelectItem>
            </SelectContent>
          </Select>

          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="ta">Tamil</SelectItem>
              <SelectItem value="te">Telugu</SelectItem>
              <SelectItem value="bn">Bengali</SelectItem>
              <SelectItem value="zu">Zulu</SelectItem>
              <SelectItem value="af">Afrikaans</SelectItem>
              <SelectItem value="xh">Xhosa</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
            </SelectContent>
          </Select>

          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue placeholder="Country/Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="south_africa">South Africa</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>

          <Select value={issueType} onValueChange={setIssueType}>
            <SelectTrigger className="w-[140px] bg-muted/50">
              <SelectValue placeholder="Issue Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="color">Color Mismatch</SelectItem>
              <SelectItem value="size">Size Mismatch</SelectItem>
              <SelectItem value="local">Localization</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="gap-2" onClick={handleMoreFilters}>
            <Filter className="w-4 h-4" />
            More Filters
          </Button>

          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleClearFilters}>
            Clear all
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpisLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          ))
        ) : (
          kpis.map((kpi, index) => (
            <div 
              key={kpi.label}
              className="glass-card rounded-xl p-4 opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      kpi.change < 0 ? "text-success" : "text-warning"
                    )}
                  >
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                  </Badge>
                  {kpisData ? (
                    <Badge variant="default" className="text-[8px] px-1 py-0 bg-success/20 text-success border-success/30">
                      API
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 text-muted-foreground border-muted">
                      Demo
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-xl font-bold text-foreground">{kpi.value}</div>
            </div>
          ))
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Table */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl overflow-hidden opacity-0 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Image-Description Audit Table</h3>
                <p className="text-sm text-muted-foreground">
                  {mismatchLoading ? "Loading..." : `Showing ${filteredData.length} of ${mismatchData?.pagination.total ?? 0} items with issues`}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2" 
                onClick={handleExport}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">SKU</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Marketplace</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Mismatch Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Attribute Errors</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Local Missing</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Category</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Issue Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Listing %</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Impact</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mismatchLoading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Loading data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : mismatchError ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertTriangle className="w-8 h-8 text-destructive" />
                          <p className="text-sm text-destructive">Failed to load data</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((row, index) => (
                      <tr 
                        key={row.sku}
                        className="border-t border-border/30 hover:bg-muted/20 transition-colors"
                      >
                      <td className="p-4">
                        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                          {row.sku}
                        </code>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">{row.marketplace}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                row.mismatchScore >= 70 ? "bg-destructive" :
                                row.mismatchScore >= 40 ? "bg-warning" : "bg-success"
                              )}
                              style={{ width: `${row.mismatchScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{row.mismatchScore}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {row.attributeErrors.length > 0 ? (
                            row.attributeErrors.map(err => (
                              <Badge key={err} variant="secondary" className="text-xs bg-destructive/10 text-destructive">
                                {err}
                              </Badge>
                            ))
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {row.localMissing.length > 0 ? (
                            row.localMissing.map(lang => (
                              <span key={lang} title={lang}>
                                {flagEmojis[lang]}
                              </span>
                            ))
                          ) : (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground">{row.category}</td>
                      <td className="p-4">
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            row.issueType === "Multiple Issues" && "bg-destructive/10 text-destructive"
                          )}
                        >
                          {row.issueType}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-sm font-medium",
                          row.listingProb >= 70 ? "text-success" :
                          row.listingProb >= 40 ? "text-warning" : "text-destructive"
                        )}>
                          {row.listingProb}%
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span 
                              key={i}
                              className={cn(
                                "text-xs",
                                i < Math.floor(row.impactScore) ? "text-warning" : "text-muted"
                              )}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={() => handleViewDetails(row.sku)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="h-8 text-xs"
                            onClick={() => handleFix(row.sku)}
                            disabled={fixMutation.isPending}
                          >
                            {fixMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Fix"
                            )}
                          </Button>
                        </div>
                      </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No items found matching your filters</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleClearFilters}
                            className="mt-2"
                          >
                            Clear filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Color mismatch CSV snapshot from Product_Color_Mismatch_Detection */}
            <div className="border-t border-border/40 bg-muted/10">
              <div className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Color Mismatch CSV (offline pipeline)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Snapshot of the processed CSV used by the Product Color Mismatch detector.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  CSV
                </Badge>
              </div>

              {isColorCsvLoading && (
                <div className="px-4 pb-4 text-xs text-muted-foreground">
                  Loading CSV snapshot from backend...
                </div>
              )}

              {isColorCsvError && (
                <div className="px-4 pb-4 text-xs text-destructive">
                  {colorCsvError?.message ?? "Failed to load CSV data"}
                </div>
              )}

              {colorCsv && !isColorCsvLoading && !isColorCsvError && (
                <div className="overflow-x-auto px-4 pb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="text-left font-medium text-muted-foreground p-2">
                          Image
                        </th>
                        <th className="text-left font-medium text-muted-foreground p-2">
                          ID
                        </th>
                        <th className="text-left font-medium text-muted-foreground p-2">
                          Product
                        </th>
                        <th className="text-left font-medium text-muted-foreground p-2">
                          Catalog Color
                        </th>
                        <th className="text-left font-medium text-muted-foreground p-2">
                          Detected Color
                        </th>
                        <th className="text-left font-medium text-muted-foreground p-2">
                          Verdict
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {colorCsv.rows.slice(0, 20).map((row, idx) => (
                        <tr
                          key={(row["id"] as string | number | undefined) ?? idx}
                          className="border-t border-border/20"
                        >
                          <td className="p-2">
                            <ProductImage
                              productId={row["id"] ?? ""}
                              index={idx}
                              alt={String(row["productDisplayName"] ?? "Product")}
                              className="w-16 h-16"
                              fallbackClassName="w-16 h-16"
                            />
                          </td>
                          <td className="p-2 font-mono">
                            {row["id"] ?? "-"}
                          </td>
                          <td className="p-2">
                            {String(row["productDisplayName"] ?? "")}
                          </td>
                          <td className="p-2">
                            {String(
                              row[colorCsv.color_column ?? "baseColour"] ?? ""
                            )}
                          </td>
                          <td className="p-2">
                            {String(row["detected_color"] ?? "")}
                          </td>
                          <td className="p-2">
                            <Badge
                              variant={
                                row["Verdict"] === "Match" ? "outline" : "destructive"
                              }
                              className="text-[10px]"
                            >
                              {String(row["Verdict"] ?? "")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Showing first 20 rows from{" "}
                    <code>hf_products_with_verdict.csv</code>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panels */}
        <div className="space-y-6">
          {/* Panel A: Attribute Mismatch Visualizer */}
          <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Attribute Mismatch Visualizer</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {selectedSku ? `Side-by-side comparison for ${selectedSku}` : "Select a SKU to view attribute comparison"}
            </p>
            
            {!selectedSku ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Click "View Details" on a SKU to see attribute comparison</p>
              </div>
            ) : attributeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : attributeData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="font-medium text-muted-foreground">AI-Detected</div>
                  <div className="font-medium text-muted-foreground">Marketplace Listing</div>
                </div>
                
                {attributeData.comparison.map((attr) => (
                  <div key={attr.attribute} className="p-3 bg-muted/30 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{attr.attribute}</div>
                        <div className="text-sm font-medium text-foreground">{attr.aiDetected}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{attr.attribute}</div>
                        <div className={cn(
                          "text-sm font-medium",
                          attr.match ? "text-foreground" : "text-destructive"
                        )}>
                          {attr.marketplaceListing}
                        </div>
                        {attr.match ? (
                          <CheckCircle className="w-3 h-3 text-success mt-1" />
                        ) : (
                          <XCircle className="w-3 h-3 text-destructive mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No attribute data available</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border/30">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => toast({
                  title: "View comparison",
                  description: "Opening full attribute comparison...",
                })}
              >
                <Eye className="w-4 h-4" />
                View Full Comparison
              </Button>
            </div>
          </div>

          {/* Panel B: Localization Panel */}
          <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Localization Panel</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {selectedSku ? `Localization status for ${selectedSku}` : "Select a SKU to view localization"}
            </p>
            
            {!selectedSku ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Click "View Details" on a SKU to see localization status</p>
              </div>
            ) : localizationLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : localizationData ? (
              <>
                <div className="space-y-4">
                  {Object.entries(localizationData.localization).map(([region, langs]) => {
                    const regionEmojis: Record<string, string> = {
                      india: "🇮🇳",
                      south_africa: "🇿🇦",
                      global: "🌍",
                    };
                    const regionNames: Record<string, string> = {
                      india: "India",
                      south_africa: "South Africa",
                      global: "Global",
                    };
                    const langNames: Record<string, string> = {
                      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali',
                      zu: 'Zulu', af: 'Afrikaans', xh: 'Xhosa',
                      es: 'Spanish', fr: 'French', ar: 'Arabic'
                    };
                    
                    return (
                      <div key={region}>
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <span>{regionEmojis[region] || "🌍"}</span> {regionNames[region] || region}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(langs).map(([lang, status]) => {
                            const isMissing = status.status === "missing";
                            const isPending = status.status === "pending";
                            return (
                              <Badge
                                key={lang}
                                variant={isMissing ? "destructive" : isPending ? "secondary" : "default"}
                                className={cn(
                                  "text-xs",
                                  isMissing && "bg-destructive/10 text-destructive",
                                  isPending && "bg-warning/10 text-warning"
                                )}
                              >
                                {langNames[lang] || lang}
                                {isMissing && <XCircle className="w-3 h-3 ml-1" />}
                                {!isMissing && !isPending && <CheckCircle className="w-3 h-3 ml-1 text-success" />}
                                {isPending && <AlertTriangle className="w-3 h-3 ml-1" />}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Missing Translations</span>
                    <Badge variant="destructive" className="text-xs">{localizationData.missingTranslations}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Incorrect Translations</span>
                    <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">{localizationData.incorrectTranslations}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Non-compliant Keywords</span>
                    <Badge variant="secondary" className="text-xs bg-success/10 text-success">{localizationData.nonCompliantKeywords}</Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No localization data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
