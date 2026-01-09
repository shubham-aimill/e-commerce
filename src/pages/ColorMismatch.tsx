import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Palette,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info,
  X,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  Image as ImageIcon,
  FileText,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  detectColor,
  matchColor,
  detectAndMatch,
  checkColorMismatchHealth,
  type ColorDetectionResult,
  type DetectAndMatchResult,
  type DatasetResponse,
  getColorMismatchDataset,
} from "@/lib/color-mismatch-api";
import ProductImage from "@/components/ProductImage";

export default function ColorMismatch() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expectedColor, setExpectedColor] = useState("");
  const [detectionResult, setDetectionResult] = useState<ColorDetectionResult | null>(null);
  const [matchResult, setMatchResult] = useState<DetectAndMatchResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [verdictFilter, setVerdictFilter] = useState<"All" | "Match" | "Mismatch">("All");
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"test" | "browse">("test");

  // Dataset query
  const {
    data: dataset,
    isLoading: isDatasetLoading,
    isError: isDatasetError,
    error: datasetError,
  } = useQuery<DatasetResponse, Error>({
    queryKey: ["color-mismatch-dataset"],
    queryFn: getColorMismatchDataset,
  });

  const filteredDataset = useMemo(() => {
    if (!dataset) return { rows: [], colorColumn: null as string | null, nameColumn: null as string | null };

    const colorColumn = dataset.color_column;
    const nameColumn = dataset.name_column;

    let rows = dataset.rows;

    if (verdictFilter !== "All") {
      rows = rows.filter((row) => row["Verdict"] === verdictFilter);
    }

    if (colorColumn && colorFilter.length > 0) {
      rows = rows.filter((row) => colorFilter.includes(String(row[colorColumn] ?? "")));
    }

    if (searchText && nameColumn) {
      const search = searchText.toLowerCase();
      rows = rows.filter((row) =>
        String(row[nameColumn] ?? "")
          .toLowerCase()
          .includes(search)
      );
    }

    return { rows, colorColumn, nameColumn };
  }, [dataset, verdictFilter, colorFilter, searchText]);

  // Health check query
  const { data: healthData, refetch: checkHealthStatus, isFetching: isHealthChecking, error: healthError } = useQuery({
    queryKey: ["color-mismatch-health"],
    queryFn: checkColorMismatchHealth,
    enabled: false,
    retry: false,
  });

  useEffect(() => {
    if (healthData) {
      toast({
        title: "Backend Online",
        description: `Status: ${healthData.status}`,
      });
    }
  }, [healthData]);

  useEffect(() => {
    if (healthError) {
      toast({
        title: "Backend Offline",
        description: healthError instanceof Error ? healthError.message : "Connection failed",
        variant: "destructive",
      });
    }
  }, [healthError]);

  // Detect color mutation
  const detectMutation = useMutation({
    mutationFn: (file: File) => detectColor(file),
    onSuccess: (data) => {
      setDetectionResult(data);
      toast({
        title: "Color Detected",
        description: `Detected: ${data.detected_color}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Detection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Detect and match mutation
  const detectAndMatchMutation = useMutation({
    mutationFn: ({ file, expectedColor }: { file: File; expectedColor: string }) =>
      detectAndMatch(file, expectedColor),
    onSuccess: (data) => {
      setMatchResult(data);
      setDetectionResult(data.detection);
      toast({
        title: "Analysis Complete",
        description: `Verdict: ${data.verdict}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    setDetectionResult(null);
    setMatchResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDetectColor = () => {
    if (!uploadedImage) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    detectMutation.mutate(uploadedImage);
  };

  const handleDetectAndMatch = () => {
    if (!uploadedImage) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    if (!expectedColor.trim()) {
      toast({
        title: "Expected color required",
        description: "Please enter the expected/catalog color",
        variant: "destructive",
      });
      return;
    }
    detectAndMatchMutation.mutate({ file: uploadedImage, expectedColor: expectedColor.trim() });
  };

  const handleHealthCheck = async () => {
    try {
      await checkHealthStatus();
    } catch (error) {
      // Error handled by query
    }
  };

  const stats = useMemo(() => {
    if (!dataset) return null;
    const total = dataset.rows.length;
    const matches = dataset.rows.filter((r) => r["Verdict"] === "Match").length;
    const mismatches = dataset.rows.filter((r) => r["Verdict"] === "Mismatch").length;
    return { total, matches, mismatches, matchRate: total > 0 ? ((matches / total) * 100).toFixed(1) : "0" };
  }, [dataset]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-ai/10 border border-ai/20">
                  <Palette className="w-6 h-6 text-ai" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                    Color Mismatch Detection
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    AI-powered color detection and matching for e-commerce products
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-ai/10 text-ai border-ai/20 px-3 py-1">
                <Sparkles className="w-3 h-3 mr-1.5" />
                AI Powered
              </Badge>
              {healthData && (
                <Badge className="bg-success/10 text-success border-success/20 px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1.5" />
                  Online
                </Badge>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-background to-muted/30 border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Total Products</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  </div>
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Matches</p>
                    <p className="text-2xl font-bold text-success">{stats.matches}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-success/50" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Mismatches</p>
                    <p className="text-2xl font-bold text-destructive">{stats.mismatches}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-destructive/50" />
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-ai/5 to-ai/10 border-ai/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Match Rate</p>
                    <p className="text-2xl font-bold text-ai">{stats.matchRate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-ai/50" />
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "test" | "browse")} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="test" className="gap-2">
              <Zap className="w-4 h-4" />
              Live Testing
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-2">
              <FileText className="w-4 h-4" />
              Browse Dataset
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Live Testing */}
          <TabsContent value="test" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Sidebar - Controls */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="p-5 border-border/50 bg-card/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Upload className="w-5 h-5 text-ai" />
                    <h3 className="font-semibold text-foreground">Upload & Test</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        variant="outline"
                        className="w-full h-24 border-2 border-dashed hover:border-ai/50 hover:bg-ai/5 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-sm">Upload Product Image</span>
                        </div>
                      </Button>
                      
                      {imagePreview && (
                        <div className="relative group">
                          <div className="relative rounded-lg overflow-hidden border-2 border-border shadow-lg">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-full h-48 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-8 w-8 bg-background/90 hover:bg-destructive/10 hover:text-destructive"
                              onClick={handleRemoveImage}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Expected Color</label>
                      <Input
                        placeholder="e.g., blue, red, navy blue"
                        value={expectedColor}
                        onChange={(e) => setExpectedColor(e.target.value)}
                        className="h-10"
                      />
                      <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Enter the catalog/expected color for comparison</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        size="lg"
                        onClick={handleDetectColor}
                        disabled={detectMutation.isPending || !uploadedImage}
                        className="w-full bg-ai hover:bg-ai/90"
                      >
                        {detectMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <Palette className="w-4 h-4 mr-2" />
                            Detect
                          </>
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleDetectAndMatch}
                        disabled={detectAndMatchMutation.isPending || !uploadedImage || !expectedColor.trim()}
                        className="w-full border-2"
                      >
                        {detectAndMatchMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Match
                          </>
                        )}
                      </Button>
                    </div>

                    <Separator />

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={handleHealthCheck}
                      disabled={isHealthChecking}
                    >
                      {isHealthChecking ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className={cn("w-4 h-4 mr-2", healthData ? "text-success" : healthError ? "text-destructive" : "text-muted-foreground")} />
                          Backend Status
                        </>
                      )}
                    </Button>
                    {healthError && (
                      <div className="p-3 bg-destructive/10 rounded-lg text-xs space-y-2 border border-destructive/20">
                        <div className="font-medium text-destructive">Backend Offline</div>
                        <div className="text-destructive/80 text-[10px]">
                          {healthError instanceof Error ? healthError.message : "Connection failed"}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Main Results Area */}
              <div className="lg:col-span-2 space-y-4">
                {/* Detection Results */}
                {detectionResult && (
                  <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-5 h-5 text-ai" />
                      <h3 className="text-lg font-semibold text-foreground">Detection Results</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-ai/10 to-ai/5 border border-ai/20">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Detected Color</div>
                          <div className="text-2xl font-bold text-foreground">{detectionResult.detected_color}</div>
                        </div>
                        {detectionResult.detected_confidence !== null && (
                          <div className="p-4 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Confidence</div>
                            <div className="text-2xl font-bold text-foreground">
                              {(detectionResult.detected_confidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>

                      {detectionResult.top_candidates && detectionResult.top_candidates.length > 1 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Top Candidates</div>
                          <div className="grid grid-cols-2 gap-2">
                            {detectionResult.top_candidates.slice(0, 4).map(([color, confidence], idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/30">
                                <span className="text-sm font-medium">{color}</span>
                                {confidence !== null && (
                                  <Badge variant="outline" className="text-xs">
                                    {(confidence * 100).toFixed(1)}%
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Match Results */}
                {matchResult && (
                  <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-ai" />
                      <h3 className="text-lg font-semibold text-foreground">Match Analysis</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={cn(
                          "p-4 rounded-lg border-2",
                          matchResult.verdict === "Match"
                            ? "bg-success/10 border-success/30"
                            : "bg-destructive/10 border-destructive/30"
                        )}>
                          <div className="text-xs font-medium text-muted-foreground mb-2">Expected</div>
                          <div className="text-xl font-bold text-foreground">{matchResult.expected_color}</div>
                        </div>
                        <div className={cn(
                          "p-4 rounded-lg border-2",
                          matchResult.verdict === "Match"
                            ? "bg-success/10 border-success/30"
                            : "bg-destructive/10 border-destructive/30"
                        )}>
                          <div className="text-xs font-medium text-muted-foreground mb-2">Detected</div>
                          <div className="text-xl font-bold text-foreground">{matchResult.detection.detected_color}</div>
                        </div>
                      </div>
                      <div className={cn(
                        "p-5 rounded-lg border-2 flex items-center justify-between",
                        matchResult.verdict === "Match"
                          ? "bg-success/10 border-success/30"
                          : "bg-destructive/10 border-destructive/30"
                      )}>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">Final Verdict</div>
                          <div className="text-2xl font-bold text-foreground">{matchResult.verdict}</div>
                        </div>
                        <Badge
                          variant={matchResult.verdict === "Match" ? "default" : "destructive"}
                          className={cn(
                            "text-lg px-4 py-2",
                            matchResult.verdict === "Match"
                              ? "bg-success text-success-foreground"
                              : "bg-destructive text-destructive-foreground"
                          )}
                        >
                          {matchResult.verdict === "Match" ? "✓ Match" : "✗ Mismatch"}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )}

                {!detectionResult && !matchResult && (
                  <Card className="p-12 border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Test</h3>
                        <p className="text-sm text-muted-foreground">
                          Upload an image and click "Detect" or "Match" to see results
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Browse Dataset */}
          <TabsContent value="browse" className="space-y-6 mt-6">
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-ai" />
                    Processed Dataset Browser
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Explore products, detected colors, and verdicts from the offline pipeline
                  </p>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {filteredDataset.rows.length} products
                </Badge>
              </div>

              {isDatasetLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">Loading dataset...</span>
                </div>
              )}

              {isDatasetError && (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Could not load dataset</span>
                  </div>
                  <div className="text-sm text-destructive/80">
                    {datasetError?.message ?? "Unknown error"}
                  </div>
                </div>
              )}

              {dataset && filteredDataset.rows.length === 0 && !isDatasetLoading && !isDatasetError && (
                <div className="text-center py-12">
                  <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No products match the current filters</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setVerdictFilter("All");
                      setColorFilter([]);
                      setSearchText("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}

              {dataset && filteredDataset.rows.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Filters Sidebar */}
                  <div className="lg:col-span-1 space-y-4">
                    <Card className="p-4 bg-muted/30 border-border/50">
                      <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-semibold text-sm text-foreground">Filters</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Match Status</label>
                          <div className="flex flex-col gap-2">
                            {(["All", "Match", "Mismatch"] as const).map((value) => (
                              <Button
                                key={value}
                                size="sm"
                                variant={verdictFilter === value ? "default" : "outline"}
                                onClick={() => setVerdictFilter(value)}
                                className="w-full justify-start"
                              >
                                {value === "All" && "📊"}
                                {value === "Match" && "✓"}
                                {value === "Mismatch" && "✗"}
                                <span className="ml-2">{value}</span>
                              </Button>
                            ))}
                          </div>
                        </div>

                        {filteredDataset.colorColumn && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Color Filter</label>
                            <select
                              multiple
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                              value={colorFilter}
                              onChange={(e) => {
                                const options = Array.from(e.target.selectedOptions).map((o) => o.value);
                                setColorFilter(options);
                              }}
                            >
                              {Array.from(
                                new Set(
                                  filteredDataset.rows
                                    .map((row) => row[filteredDataset.colorColumn!] as string | null)
                                    .filter((v) => v != null && String(v).trim().length > 0)
                                )
                              )
                                .sort()
                                .map((color) => (
                                  <option key={color as string} value={String(color)}>
                                    {String(color)}
                                  </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-muted-foreground">
                              Hold Cmd/Ctrl to select multiple
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Search</label>
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Product name..."
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="text-xs text-muted-foreground">
                          <div className="font-medium mb-1">Results</div>
                          <div className="text-lg font-bold text-foreground">{filteredDataset.rows.length}</div>
                        </div>

                        {filteredDataset.rows.length > 1 && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              Product {selectedIndex + 1} of {filteredDataset.rows.length}
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={filteredDataset.rows.length - 1}
                              value={selectedIndex}
                              onChange={(e) => setSelectedIndex(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Product Details */}
                  <div className="lg:col-span-3 space-y-4">
                    {filteredDataset.rows[selectedIndex] && (
                      <>
                        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Product Image */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <h4 className="font-semibold text-sm text-foreground">Product Image</h4>
                              </div>
                              <ProductImage
                                productId={String(filteredDataset.rows[selectedIndex]["id"] ?? "")}
                                index={selectedIndex}
                                alt={String(filteredDataset.rows[selectedIndex][dataset?.name_column ?? "productDisplayName"] ?? "Product")}
                                className="w-full h-80 rounded-lg"
                                fallbackClassName="w-full h-80 rounded-lg"
                              />
                            </div>

                            {/* Color Details */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                                  <Palette className="w-4 h-4 text-ai" />
                                  Color Analysis
                                </h4>
                                <div className="space-y-3">
                                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                                    <div className="text-xs text-muted-foreground mb-1">Catalog Color</div>
                                    <div className="text-lg font-semibold text-foreground">
                                      {String(
                                        filteredDataset.colorColumn
                                          ? filteredDataset.rows[selectedIndex][filteredDataset.colorColumn]
                                          : "N/A"
                                      )}
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                                    <div className="text-xs text-muted-foreground mb-1">Detected Color</div>
                                    <div className="text-lg font-semibold text-foreground">
                                      {String(filteredDataset.rows[selectedIndex]["detected_color"] ?? "N/A")}
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "p-3 rounded-lg border-2",
                                    filteredDataset.rows[selectedIndex]["Verdict"] === "Match"
                                      ? "bg-success/10 border-success/30"
                                      : "bg-destructive/10 border-destructive/30"
                                  )}>
                                    <div className="text-xs text-muted-foreground mb-1">Verdict</div>
                                    <div className="flex items-center justify-between">
                                      <div className="text-lg font-bold text-foreground">
                                        {String(filteredDataset.rows[selectedIndex]["Verdict"] ?? "N/A")}
                                      </div>
                                      <Badge
                                        variant={filteredDataset.rows[selectedIndex]["Verdict"] === "Match" ? "default" : "destructive"}
                                        className={cn(
                                          filteredDataset.rows[selectedIndex]["Verdict"] === "Match"
                                            ? "bg-success text-success-foreground"
                                            : "bg-destructive text-destructive-foreground"
                                        )}
                                      >
                                        {filteredDataset.rows[selectedIndex]["Verdict"] === "Match" ? "✓" : "✗"}
                                      </Badge>
                                    </div>
                                  </div>
                                  {filteredDataset.rows[selectedIndex]["detected_confidence"] != null && (
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                                      <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                                      <div className="text-lg font-semibold text-foreground">
                                        {(Number(filteredDataset.rows[selectedIndex]["detected_confidence"]) * 100).toFixed(1)}%
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>

                        {/* Metadata Table */}
                        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <h4 className="font-semibold text-sm text-foreground">Product Metadata</h4>
                          </div>
                          <div className="max-h-96 overflow-auto border rounded-lg p-3 bg-muted/20">
                            <table className="w-full text-sm">
                              <tbody>
                                {Object.entries(filteredDataset.rows[selectedIndex]).map(([key, value]) => {
                                  if (
                                    key === filteredDataset.colorColumn ||
                                    key === "detected_color" ||
                                    key === "detected_confidence" ||
                                    key === "Verdict"
                                  ) {
                                    return null;
                                  }
                                  return (
                                    <tr key={key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                      <td className="py-2 pr-4 font-medium text-muted-foreground align-top w-1/3">
                                        {key}
                                      </td>
                                      <td className="py-2 text-foreground">{String(value ?? "")}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
