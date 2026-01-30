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
  Loader2,
  BarChart3,
  Languages,
  Pencil,
  Check,
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
  /** Listing title - editable inline */
  title?: string;
  /** Short description - editable inline */
  description?: string;
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
    impactScore: 4.5,
    title: "Men's Blue Cotton T-Shirt",
    description: "Classic fit cotton tee. Listed as Navy but image shows Sky Blue.",
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
    impactScore: 3.2,
    title: "Wooden Side Table",
    description: "Solid wood side table. Material listed as Oak, image suggests Teak.",
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
    impactScore: 4.9,
    title: "Women's Floral Dress",
    description: "Midi dress. Color/size mismatch between listing and image.",
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
    impactScore: 2.1,
    title: "Wireless Bluetooth Earbuds",
    description: "No Tamil translation for product description.",
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
    impactScore: 3.8,
    title: "Bookshelf 5-Tier",
    description: "Dimensions in listing do not match image specifications.",
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
  // Default to mismatches only to streamline workflow and reduce data load
  const [viewMode, setViewMode] = useState<"mismatches" | "all">("mismatches");
  // Inline editing and bulk update
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ sku: string; field: "title" | "description" } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [localEdits, setLocalEdits] = useState<Record<string, { title?: string; description?: string }>>({});
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkTitle, setBulkTitle] = useState("");

  // Build query params
  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("search", searchQuery);
  if (category !== "all") queryParams.set("category", category);
  if (brand !== "all") queryParams.set("brand", brand);
  if (marketplace !== "all") queryParams.set("marketplace", marketplace);
  if (language !== "all") queryParams.set("language", language);
  if (region !== "all") queryParams.set("region", region);
  if (issueType !== "all") queryParams.set("issueType", issueType);
  if (viewMode === "mismatches") queryParams.set("mismatchesOnly", "true");
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

  // Inline / bulk description update mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async (payload: { sku: string; title?: string; description?: string } | { skus: string[]; title?: string; description?: string }) => {
      if ("skus" in payload) {
        return apiClient.post<{ success: boolean; updated: number }>("/mismatch/bulk-update", payload);
      }
      return apiClient.put<{ success: boolean }>(`/mismatch/sku/${payload.sku}/description`, { title: payload.title, description: payload.description });
    },
    onSuccess: (_, variables) => {
      if ("skus" in variables) {
        variables.skus.forEach((sku) => {
          setLocalEdits((prev) => ({
            ...prev,
            [sku]: {
              ...prev[sku],
              ...(variables.title !== undefined && { title: variables.title }),
              ...(variables.description !== undefined && { description: variables.description }),
            },
          }));
        });
        setSelectedRowIds(new Set());
        setBulkTitle("");
        setBulkDescription("");
        toast({ title: "Bulk update applied", description: `${variables.skus.length} listing(s) updated.` });
      } else {
        setLocalEdits((prev) => ({
          ...prev,
          [variables.sku]: {
            ...prev[variables.sku],
            ...(variables.title !== undefined && { title: variables.title }),
            ...(variables.description !== undefined && { description: variables.description }),
          },
        }));
        setEditingCell(null);
        toast({ title: "Updated", description: "Listing updated successfully." });
      }
      queryClient.invalidateQueries({ queryKey: ["mismatch"] });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Backend may not support this endpoint. Try again or check API.", variant: "destructive" });
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

  const getDisplayValue = (row: MismatchRow, field: "title" | "description") =>
    localEdits[row.sku]?.[field] ?? row[field] ?? "";

  const startEdit = (sku: string, field: "title" | "description") => {
    const row = filteredData.find((r) => r.sku === sku);
    if (!row) return;
    setEditingCell({ sku, field });
    setEditingValue(getDisplayValue(row, field));
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const value = editingValue.trim();
    setLocalEdits((prev) => ({
      ...prev,
      [editingCell.sku]: { ...prev[editingCell.sku], [editingCell.field]: value || undefined },
    }));
    updateDescriptionMutation.mutate({
      sku: editingCell.sku,
      ...(editingCell.field === "title" && { title: value || undefined }),
      ...(editingCell.field === "description" && { description: value || undefined }),
    });
    setEditingCell(null);
    setEditingValue("");
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const toggleSelect = (sku: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedRowIds.size === filteredData.length) setSelectedRowIds(new Set());
    else setSelectedRowIds(new Set(filteredData.map((r) => r.sku)));
  };

  const handleBulkApply = () => {
    const skus = Array.from(selectedRowIds);
    if (skus.length === 0) return;
    const title = bulkTitle.trim() || undefined;
    const description = bulkDescription.trim() || undefined;
    if (!title && !description) {
      toast({ title: "Enter title or description", variant: "destructive" });
      return;
    }
    skus.forEach((sku) => {
      setLocalEdits((prev) => ({
        ...prev,
        [sku]: {
          ...prev[sku],
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
        },
      }));
    });
    updateDescriptionMutation.mutate({ skus, title, description });
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
  // Client-side filter for mismatches only when viewMode is "mismatches" (reduces load if backend doesn't support mismatchesOnly)
  const filteredData =
    viewMode === "mismatches"
      ? tableData.filter(
          (row) =>
            row.mismatchScore > 0 ||
            (row.attributeErrors?.length ?? 0) > 0 ||
            (row.localMissing?.length ?? 0) > 0
        )
      : tableData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1920px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  Image-Description Mismatch Engine
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Detect and resolve content quality issues across marketplaces
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mismatchData ? (
                <Badge className="bg-success/10 text-success border-success/20 px-3 py-1.5">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  API Connected
                </Badge>
              ) : mismatchError ? (
                <Badge variant="outline" className="border-muted text-muted-foreground px-3 py-1.5">
                  Demo Mode
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

      {/* Enhanced Filters Bar */}
      <div className="rounded-xl p-5 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationFillMode: 'forwards', animationDuration: '400ms' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[250px] bg-background/50 rounded-lg border border-border/50 px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKUs, products, issues..." 
              className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
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
            <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
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
            <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
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
            <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
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
            <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
              <SelectValue placeholder="Country/Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="india">India</SelectItem>
              <SelectItem value="south_africa">South Africa</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "mismatches" | "all")}>
            <SelectTrigger className="w-[160px] h-10 bg-background/50 border-border/50">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mismatches">Mismatches only</SelectItem>
              <SelectItem value="all">All (incl. matches)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={issueType} onValueChange={setIssueType}>
            <SelectTrigger className="w-[140px] h-10 bg-background/50 border-border/50">
              <SelectValue placeholder="Issue Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="color">Color Mismatch</SelectItem>
              <SelectItem value="size">Size Mismatch</SelectItem>
              <SelectItem value="local">Localization</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 h-10 hover:bg-muted/50 transition-colors" 
            onClick={handleMoreFilters}
          >
            <Filter className="w-4 h-4" />
            More Filters
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground h-10 hover:text-foreground hover:bg-muted/50 transition-colors" 
            onClick={handleClearFilters}
          >
            Clear all
          </Button>
        </div>
      </div>

      {/* Enhanced KPI Row */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Performance Metrics</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {kpisLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse border border-border/50" />
            ))
          ) : (
            kpis.map((kpi, index) => (
              <div 
                key={kpi.label}
                className={cn(
                  "rounded-xl p-5 border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
                  "bg-gradient-to-br from-card/50 to-card/30 border-border/50 backdrop-blur-sm",
                  "animate-fade-in"
                )}
                style={{ 
                  animationDelay: `${index * 50}ms`, 
                  animationFillMode: 'forwards',
                  animationDuration: '400ms'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs font-semibold",
                        kpi.change < 0 ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                      )}
                    >
                      {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    </Badge>
                    {kpisData && (
                      <Badge className="text-[8px] px-1.5 py-0.5 bg-success/20 text-success border-success/30">
                        API
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Image-Description Audit Table with inline and bulk editing */}
      <div className="rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in">
        <div className="p-5 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Image-Description Audit Table
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">
              {selectedRowIds.size === filteredData.length ? "Deselect all" : "Select all"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {filteredData.length} row{filteredData.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Bulk update bar */}
        {selectedRowIds.size > 0 && (
          <div className="p-4 bg-primary/5 border-b border-border/50 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">{selectedRowIds.size} selected</span>
            <Input
              placeholder="Bulk title..."
              className="max-w-[220px] h-9 text-sm"
              value={bulkTitle}
              onChange={(e) => setBulkTitle(e.target.value)}
            />
            <Input
              placeholder="Bulk description..."
              className="max-w-[280px] h-9 text-sm"
              value={bulkDescription}
              onChange={(e) => setBulkDescription(e.target.value)}
            />
            <Button size="sm" onClick={handleBulkApply} disabled={updateDescriptionMutation.isPending}>
              {updateDescriptionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Apply to selected
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRowIds(new Set())}>
              Clear selection
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border/50">
                <th className="text-left font-medium text-muted-foreground p-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredData.length > 0 && selectedRowIds.size === filteredData.length}
                    onChange={selectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left font-medium text-muted-foreground p-3">SKU</th>
                <th className="text-left font-medium text-muted-foreground p-3">Marketplace</th>
                <th className="text-left font-medium text-muted-foreground p-3 min-w-[180px]">Title</th>
                <th className="text-left font-medium text-muted-foreground p-3 min-w-[220px]">Description</th>
                <th className="text-left font-medium text-muted-foreground p-3">Score</th>
                <th className="text-left font-medium text-muted-foreground p-3">Issue</th>
                <th className="text-left font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mismatchLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr
                    key={row.sku}
                    className={cn(
                      "border-t border-border/30 hover:bg-muted/20 transition-colors",
                      selectedRowIds.has(row.sku) && "bg-primary/5"
                    )}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.has(row.sku)}
                        onChange={() => toggleSelect(row.sku)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs">{row.sku}</td>
                    <td className="p-3 text-muted-foreground">{row.marketplace}</td>
                    <td className="p-3">
                      {editingCell?.sku === row.sku && editingCell?.field === "title" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            onBlur={saveEdit}
                            className="h-8 text-xs min-w-[160px]"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                            <Check className="w-3.5 h-3.5 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row.sku, "title")}
                          className="text-left w-full flex items-center gap-1.5 group hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[32px]"
                        >
                          <span className="text-foreground truncate max-w-[200px]">
                            {getDisplayValue(row, "title") || "—"}
                          </span>
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 text-muted-foreground shrink-0" />
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      {editingCell?.sku === row.sku && editingCell?.field === "description" ? (
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            onBlur={saveEdit}
                            className="h-8 text-xs min-w-[200px]"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={saveEdit}>
                            <Check className="w-3.5 h-3.5 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row.sku, "description")}
                          className="text-left w-full flex items-center gap-1.5 group hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 min-h-[32px]"
                        >
                          <span className="text-muted-foreground truncate max-w-[240px]">
                            {getDisplayValue(row, "description") || "—"}
                          </span>
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 text-muted-foreground shrink-0" />
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={row.mismatchScore >= 70 ? "destructive" : row.mismatchScore >= 40 ? "secondary" : "outline"}>
                        {row.mismatchScore}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{row.issueType}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleViewDetails(row.sku)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Details
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleFix(row.sku)}>
                          Fix
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color Mismatch CSV Section */}
        <div className="lg:col-span-2">
          <div className="rounded-xl overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
            <div className="p-5 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Color Mismatch CSV (offline pipeline)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Snapshot of the processed CSV used by the Product Color Mismatch detector.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                CSV
              </Badge>
            </div>

            {isColorCsvLoading && (
              <div className="p-8 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading CSV snapshot from backend...</span>
                </div>
              </div>
            )}

            {isColorCsvError && (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                  <p className="text-sm text-destructive">{colorCsvError?.message ?? "Failed to load CSV data"}</p>
                </div>
              </div>
            )}

            {colorCsv && !isColorCsvLoading && !isColorCsvError && (
              <div className="overflow-x-auto p-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border/50">
                      <th className="text-left font-medium text-muted-foreground p-3 uppercase tracking-wider">Image</th>
                      <th className="text-left font-medium text-muted-foreground p-3 uppercase tracking-wider">ID</th>
                      <th className="text-left font-medium text-muted-foreground p-3 uppercase tracking-wider">Product</th>
                      <th className="text-left font-medium text-muted-foreground p-3 uppercase tracking-wider">Catalog Color</th>
                      <th className="text-left font-medium text-muted-foreground p-3 uppercase tracking-wider">Detected Color</th>
                      <th className="text-left font-medium text-muted-foreground p-3 uppercase tracking-wider">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colorCsv.rows.slice(0, 20).map((row, idx) => (
                      <tr
                        key={(row["id"] as string | number | undefined) ?? idx}
                        className="border-t border-border/30 hover:bg-muted/30 transition-all duration-200"
                      >
                        <td className="p-3">
                          <ProductImage
                            productId={String(row["id"] ?? "")}
                            index={idx}
                            alt={String(row["productDisplayName"] ?? "Product")}
                            className="w-16 h-16"
                            fallbackClassName="w-16 h-16"
                          />
                        </td>
                        <td className="p-3 font-mono text-sm">
                          {String(row["id"] ?? "-")}
                        </td>
                        <td className="p-3 text-sm">
                          {String(row["productDisplayName"] ?? "")}
                        </td>
                        <td className="p-3 text-sm">
                          {String(
                            row[colorCsv.color_column ?? "baseColour"] ?? ""
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {String(row["detected_color"] ?? "")}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              row["Verdict"] === "Match" ? "outline" : "destructive"
                            }
                            className="text-xs"
                          >
                            {String(row["Verdict"] ?? "")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs text-muted-foreground text-center">
                  Showing first 20 rows from{" "}
                  <code className="bg-muted px-1.5 py-0.5 rounded">hf_products_with_verdict.csv</code>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Right Panels */}
        <div className="space-y-6">
          {/* Panel A: Attribute Mismatch Visualizer */}
          <div className="rounded-xl p-6 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Attribute Mismatch Visualizer</h3>
            </div>
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
          <div className="rounded-xl p-6 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-info/10">
                <Languages className="w-4 h-4 text-info" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Localization Panel</h3>
            </div>
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
    </div>
  );
}
