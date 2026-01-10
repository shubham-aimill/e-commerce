import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Camera, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  Users,
  Upload,
  Download,
  RefreshCw,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
  LucideIcon,
  BarChart3,
  Info,
  AlertCircle,
  Activity,
  Zap,
  User,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { generateTryOn, checkHealth, type GenerateTryOnParams, type VtoHealthResponse } from "@/lib/vto-api";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface PhotoshootKPI {
  label: string;
  value: string;
  icon: string;
  change: number;
}

interface PhotoshootTemplate {
  id: number;
  name: string;
  uses: number;
  image: string;
  previewUrl?: string;
}

interface PhotoshootTemplatesResponse {
  indian: PhotoshootTemplate[];
  southAfrican: PhotoshootTemplate[];
  global: PhotoshootTemplate[];
}

interface UploadResponse {
  success: boolean;
  imageId: string;
  url: string;
  filename: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

interface GenerateResponse {
  success: boolean;
  jobId: string;
  estimatedTime: string;
  statusUrl: string;
}

interface PhotoshootStatus {
  jobId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  result?: {
    generatedImages: Array<{
      id: string;
      url: string;
      template: string;
      marketplace: string;
    }>;
  };
  error?: string | null;
}

interface CostAnalysisResponse {
  regionSavings: Array<{
    region: string;
    saved: string;
    amount: number;
    percent: number;
  }>;
  timeToPublish: {
    before: number;
    after: number;
    unit: string;
  };
  categoryBreakdown: Array<{
    cat: string;
    percent: number;
    color: string;
  }>;
}

const iconMap: Record<string, LucideIcon> = {
  Camera,
  Clock,
  DollarSign,
  CheckCircle,
  Users,
};

const mockTemplates = {
  indian: [
    { id: 1, name: "Saree Elegance", uses: 4521, image: "Traditional saree pose" },
    { id: 2, name: "Kurta Classic", uses: 3892, image: "Modern kurta style" },
    { id: 3, name: "Festival Vibes", uses: 2847, image: "Festive background" },
    { id: 4, name: "Ethnic Fusion", uses: 2156, image: "Indo-western blend" },
  ],
  southAfrican: [
    { id: 5, name: "Ubuntu Spirit", uses: 1892, image: "Multi-ethnic models" },
    { id: 6, name: "Safari Chic", uses: 1567, image: "Outdoor lifestyle" },
    { id: 7, name: "Modern Afro", uses: 1234, image: "Contemporary African" },
    { id: 8, name: "Cape Town Cool", uses: 987, image: "Urban backdrop" },
  ],
  global: [
    { id: 9, name: "Studio Pro", uses: 8934, image: "White background" },
    { id: 10, name: "Urban Edge", uses: 6721, image: "City lifestyle" },
    { id: 11, name: "Minimalist", uses: 5432, image: "Clean aesthetic" },
    { id: 12, name: "High Fashion", uses: 4123, image: "Runway style" },
  ]
};

export default function AIPhotoshoot() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [activeRegion, setActiveRegion] = useState<"indian" | "southAfrican" | "global">("indian");
  const [selectedSkinTone, setSelectedSkinTone] = useState<string | null>(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState<Set<string>>(new Set());
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Virtual Try-On states
  const vtoFileInputRef = useRef<HTMLInputElement>(null);
  const [vtoGender, setVtoGender] = useState<"male" | "female">("male");
  const [vtoCategory, setVtoCategory] = useState<"tshirts" | "pants" | "jackets" | "shoes">("tshirts");
  const [vtoCurrentBrand, setVtoCurrentBrand] = useState<"Nike" | "Adidas" | "Zara">("Nike");
  const [vtoCurrentSize, setVtoCurrentSize] = useState("M");
  const [vtoTargetBrand, setVtoTargetBrand] = useState<"Nike" | "Adidas" | "Zara">("Adidas");
  const [vtoUploadedImage, setVtoUploadedImage] = useState<File | null>(null);
  const [vtoImagePreview, setVtoImagePreview] = useState<string | null>(null);
  const [vtoMappedSize, setVtoMappedSize] = useState<string | null>(null);
  const [vtoGeneratedImageUrl, setVtoGeneratedImageUrl] = useState<string | null>(null);
  const [vtoIsDragging, setVtoIsDragging] = useState(false);

  // Fetch KPIs
  const { data: kpisData, isLoading: kpisLoading } = useQuery<{ kpis: PhotoshootKPI[] }>({
    queryKey: ["photoshoot", "kpis"],
    queryFn: () => apiClient.get<{ kpis: PhotoshootKPI[] }>("/photoshoot/kpis"),
  });

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery<PhotoshootTemplatesResponse>({
    queryKey: ["photoshoot", "templates", activeRegion],
    queryFn: () => apiClient.get<PhotoshootTemplatesResponse>(`/photoshoot/templates?region=${activeRegion}`),
  });

  // Fetch cost analysis
  const { data: costAnalysisData, isLoading: costAnalysisLoading } = useQuery<CostAnalysisResponse>({
    queryKey: ["photoshoot", "cost-analysis"],
    queryFn: () => apiClient.get<CostAnalysisResponse>("/photoshoot/cost-analysis?period=month"),
  });

  // Poll for photoshoot status
  const { data: statusData } = useQuery<PhotoshootStatus>({
    queryKey: ["photoshoot", "status", currentJobId],
    queryFn: () => apiClient.get<PhotoshootStatus>(`/photoshoot/status/${currentJobId}`),
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      if (data?.status === "processing") return 2000; // Poll every 2 seconds
      return false;
    },
  });

  // Update generated image when status completes
  useEffect(() => {
    if (statusData?.status === "completed" && statusData.result?.generatedImages?.[0]) {
      setGeneratedImageUrl(statusData.result.generatedImages[0].url);
    }
  }, [statusData]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<UploadResponse>("/photoshoot/upload", formData);
    },
    onSuccess: (data) => {
      setUploadedImageId(data.imageId);
      setUploadedImage(data.url);
      setUploadedFileName(data.filename);
      toast({
        title: "Image uploaded",
        description: `Successfully uploaded ${data.filename}`,
      });
    },
    onError: () => {
      toast({
        title: "Upload error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedImageId || !selectedTemplate) throw new Error("Missing required fields");
      return apiClient.post<GenerateResponse>("/photoshoot/generate", {
        imageId: uploadedImageId,
        templateId: selectedTemplate,
        skinTone: selectedSkinTone,
        region: activeRegion,
        marketplaces: Array.from(selectedMarketplace),
      });
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast({
        title: "Generating photoshoot",
        description: `AI is creating your product photoshoot... Estimated time: ${data.estimatedTime}`,
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to start photoshoot generation",
        variant: "destructive",
      });
    },
  });

  // Regenerate mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedImageId || !selectedTemplate) throw new Error("Missing required fields");
      return apiClient.post<GenerateResponse>("/photoshoot/regenerate", {
        imageId: uploadedImageId,
        templateId: selectedTemplate,
        skinTone: selectedSkinTone,
        previousJobId: currentJobId,
      });
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast({
        title: "Regenerating",
        description: "Creating a new variation...",
      });
    },
    onError: () => {
      toast({
        title: "Regeneration failed",
        description: "Failed to regenerate photoshoot",
        variant: "destructive",
      });
    },
  });

  // Virtual Try-On health check
  const { data: vtoHealthData, refetch: checkVtoHealthStatus, isFetching: isVtoHealthChecking, error: vtoHealthError } = useQuery<VtoHealthResponse>({
    queryKey: ["vto-health"],
    queryFn: checkHealth,
    enabled: false,
    retry: false,
  });

  // Handle VTO health check
  useEffect(() => {
    if (vtoHealthData) {
      toast({
        title: "Backend Online",
        description: `Gemini: ${vtoHealthData.gemini_enabled ? "Enabled" : "Disabled"}`,
      });
    }
  }, [vtoHealthData]);

  useEffect(() => {
    if (vtoHealthError) {
      toast({
        title: "Backend Offline",
        description: vtoHealthError instanceof Error ? vtoHealthError.message : "Connection failed",
        variant: "destructive",
      });
    }
  }, [vtoHealthError]);

  // Virtual Try-On generate mutation
  const vtoGenerateMutation = useMutation({
    mutationFn: (params: GenerateTryOnParams) => generateTryOn(params),
    onSuccess: (data) => {
      const url = URL.createObjectURL(data.image);
      setVtoGeneratedImageUrl(url);
      if (data.mappedSize) {
        setVtoMappedSize(data.mappedSize);
      }
      toast({
        title: "Try-On Generated!",
        description: "Virtual try-on image generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fallback dummy KPIs
  const dummyKpis: PhotoshootKPI[] = [
    { label: "Photos Generated Today", value: "1,847", icon: "Camera", change: 12 },
    { label: "Avg Rendering Time", value: "4.2s", icon: "Clock", change: -18 },
    { label: "Cost Saved Today", value: "₹2.8L", icon: "DollarSign", change: 24 },
    { label: "Approval Rate", value: "94%", icon: "CheckCircle", change: 3 },
    { label: "Diversity Score", value: "87/100", icon: "Users", change: 5 },
  ];

  const kpis = kpisData?.kpis.length ? kpisData.kpis : dummyKpis;
  const templates = templatesData && Object.keys(templatesData).length > 0 ? templatesData : mockTemplates;

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setUploadedFileName(file.name);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      uploadMutation.mutate(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setUploadedFileName(file.name);
      };
      reader.readAsDataURL(file);

      // Upload to backend
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please drop an image file",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadedFileName(null);
    setUploadedImageId(null);
    setGeneratedImageUrl(null);
    setCurrentJobId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Image removed",
      description: "Upload a new image to continue",
    });
  };

  const handleGeneratePhotoshoot = () => {
    if (!uploadedImageId) {
      toast({
        title: "Upload image",
        description: "Please upload a product image first",
        variant: "destructive",
      });
      return;
    }
    if (!selectedTemplate) {
      toast({
        title: "Select template",
        description: "Please select a template style first",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const handleRegenerate = () => {
    if (!uploadedImageId) {
      toast({
        title: "Upload image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }
    regenerateMutation.mutate();
  };

  const handleDownload = async () => {
    if (!generatedImageUrl && !uploadedImage) {
      toast({
        title: "No image to download",
        description: "Please generate or upload an image first",
        variant: "destructive",
      });
      return;
    }
    
    const imageUrl = generatedImageUrl || uploadedImage;
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = uploadedFileName || 'photoshoot-image.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Downloading",
        description: "Image download started",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const toggleMarketplace = (mp: string) => {
    const newSet = new Set(selectedMarketplace);
    if (newSet.has(mp)) {
      newSet.delete(mp);
    } else {
      newSet.add(mp);
    }
    setSelectedMarketplace(newSet);
  };

  // Virtual Try-On handlers
  const handleVtoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processVtoFile(file);
    }
  };

  const processVtoFile = (file: File) => {
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

    setVtoUploadedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setVtoImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVtoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setVtoIsDragging(true);
  };

  const handleVtoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setVtoIsDragging(false);
  };

  const handleVtoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVtoIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processVtoFile(file);
    }
  };

  const handleVtoRemoveImage = () => {
    setVtoUploadedImage(null);
    setVtoImagePreview(null);
    if (vtoFileInputRef.current) {
      vtoFileInputRef.current.value = "";
    }
  };

  const handleVtoGenerate = () => {
    if (!vtoCurrentSize.trim()) {
      toast({
        title: "Size required",
        description: "Please enter a size",
        variant: "destructive",
      });
      return;
    }

    vtoGenerateMutation.mutate({
      gender: vtoGender,
      category: vtoCategory,
      current_brand: vtoCurrentBrand,
      current_size: vtoCurrentSize,
      target_brand: vtoTargetBrand,
      user_image: vtoUploadedImage ?? undefined,
    });
  };

  const handleVtoHealthCheck = async () => {
    try {
      await checkVtoHealthStatus();
    } catch (error) {
      // Error handled by query
    }
  };

  const handleVtoDownload = () => {
    if (!vtoGeneratedImageUrl) return;
    const link = document.createElement("a");
    link.href = vtoGeneratedImageUrl;
    link.download = `tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Downloaded",
      description: "Image saved successfully",
    });
  };

  const handleVtoRegenerate = () => {
    handleVtoGenerate();
  };

  // Cleanup VTO object URL
  useEffect(() => {
    return () => {
      if (vtoGeneratedImageUrl) {
        URL.revokeObjectURL(vtoGeneratedImageUrl);
      }
    };
  }, [vtoGeneratedImageUrl]);

  const vtoIsReady = vtoCurrentSize.trim() && !vtoGenerateMutation.isPending;
  const vtoHasResult = !!vtoGeneratedImageUrl && !vtoGenerateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1920px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-ai/10 to-ai/5 border border-ai/20">
                <Camera className="w-6 h-6 text-ai" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  AI Image Generation
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate professional product imagery and virtual try-ons with AI
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-w from-ai/10 to-ai/5 text-ai border-ai/20 px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Powered
              </Badge>
              {kpisData && (
                <Badge className="bg-success/10 text-success border-success/20 px-3 py-1.5">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  API Connected
                </Badge>
              )}
            </div>
          </div>
        </div>

      {/* Enhanced Main Tabs */}
      <Tabs defaultValue="photoshoot" className="space-y-8">
        <TabsList className="w-full grid grid-cols-2 max-w-md h-12 bg-muted/50 border border-border/50">
          <TabsTrigger value="photoshoot" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">AI Photoshoot</TabsTrigger>
          <TabsTrigger value="tryon" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Virtual Try-On</TabsTrigger>
        </TabsList>

        <TabsContent value="photoshoot" className="space-y-8 mt-0">
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
                kpis.map((kpi, index) => {
                  const Icon = iconMap[kpi.icon] || Camera;
                  return (
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
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs font-semibold",
                              kpi.change > 0 ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                            )}
                          >
                            {kpi.change > 0 ? '+' : ''}{kpi.change}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

      {/* Enhanced Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Enhanced Template Selector */}
        <div className="rounded-xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Model Style Selection</h3>
          </div>
          
          <Tabs value={activeRegion} onValueChange={setActiveRegion}>
            <TabsList className="w-full grid grid-cols-3 mb-6 h-11 bg-muted/50 border border-border/50">
              <TabsTrigger value="indian" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">🇮🇳 Indian</TabsTrigger>
              <TabsTrigger value="southAfrican" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">🇿🇦 South African</TabsTrigger>
              <TabsTrigger value="global" className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">🌍 Global</TabsTrigger>
            </TabsList>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              Object.entries(templates).map(([region, items]) => (
                <TabsContent key={region} value={region} className="mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group",
                        "hover:border-primary/50 hover:bg-primary/5 hover:shadow-md",
                        selectedTemplate === template.id 
                          ? "border-primary bg-primary/10 shadow-md scale-[1.02]" 
                          : "border-border/50 hover:scale-[1.01]"
                      )}
                    >
                      <div className="aspect-square bg-gradient-to-br from-sand-100 to-sand-200 rounded-lg mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <Camera className="w-8 h-8 text-sand-400" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-semibold text-foreground text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">{template.image}</p>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {template.uses.toLocaleString()} uses
                        </Badge>
                      </div>
                    </div>
                    ))}
                  </div>
                </TabsContent>
              ))
            )}
          </Tabs>

          {/* Skin Tone Selector */}
          <div className="mt-6 pt-4 border-t border-border/30">
            <h4 className="text-sm font-medium text-foreground mb-3">Skin Tone</h4>
            <div className="flex gap-2">
              {['#f5d0c5', '#e8b89a', '#d4a574', '#c68642', '#8d5524', '#5c3c24'].map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedSkinTone(color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-colors",
                    selectedSkinTone === color 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-border hover:border-primary"
                  )}
                  style={{ backgroundColor: color }}
                  title={`Skin tone ${color}`}
                />
              ))}
            </div>
            {selectedSkinTone && (
              <p className="text-xs text-muted-foreground mt-2">Selected skin tone</p>
            )}
          </div>
        </div>

        {/* Enhanced Before/After Viewer */}
        <div className="rounded-xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Image Preview</h3>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div 
            className="aspect-[4/3] bg-gradient-to-br from-sand-50 to-sand-100 rounded-xl mb-4 flex items-center justify-center border-2 border-dashed border-border/50 relative overflow-hidden cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={!uploadedImage ? handleBrowseFiles : undefined}
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
              </div>
            ) : generatedImageUrl ? (
              <div className="relative w-full h-full group">
                <img 
                  src={generatedImageUrl} 
                  alt="Generated photoshoot" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {uploadedFileName && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
                      {uploadedFileName}
                    </div>
                  </div>
                )}
              </div>
            ) : uploadedImage ? (
              <div className="relative w-full h-full group">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded product" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {uploadedFileName && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded truncate">
                      {uploadedFileName}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-12 h-12 text-sand-400 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Upload product image</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleBrowseFiles}>
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Original</span>
              <ArrowRight className="w-4 h-4" />
              <span className="text-foreground font-medium">AI Generated</span>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="gap-1" 
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending || !uploadedImageId}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerate
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 gap-2" 
              onClick={handleGeneratePhotoshoot}
              disabled={generateMutation.isPending || !uploadedImageId || !selectedTemplate}
            >
              {generateMutation.isPending || (statusData?.status === "processing") ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusData?.progress ? `Generating ${statusData.progress}%` : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Photoshoot
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleDownload}
              disabled={!generatedImageUrl && !uploadedImage}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* Export Options */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Export for:</p>
            <div className="flex flex-wrap gap-2">
              {['Amazon', 'Flipkart', 'Takealot', 'eBay', 'Shopify'].map((mp) => (
                <Badge 
                  key={mp} 
                  variant={selectedMarketplace.has(mp) ? "default" : "outline"} 
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => toggleMarketplace(mp)}
                >
                  {mp}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Cost Efficiency Panel */}
      <div className="rounded-xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-success/10">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Cost & Efficiency Analysis</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-success/5 rounded-xl">
            <h4 className="text-sm font-medium text-foreground mb-2">Cost Savings by Region</h4>
            <div className="space-y-3">
              {costAnalysisLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : costAnalysisData ? (
                costAnalysisData.regionSavings.map((item) => (
                <div key={item.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{item.region}</span>
                    <span className="font-medium text-foreground">{item.saved}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
                ))
              ) : null}
            </div>
          </div>

          <div className="p-4 bg-info/5 rounded-xl">
            <h4 className="text-sm font-medium text-foreground mb-2">Time to Publish</h4>
            {costAnalysisData ? (
              <div className="flex items-end gap-4 h-32">
                <div className="flex-1 flex flex-col items-center">
                  <div className="flex-1 w-full bg-muted rounded-t-lg relative">
                    <div 
                      className="absolute bottom-0 w-full bg-muted-foreground/30 rounded-t-lg"
                      style={{ height: '80%' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">Before</span>
                  <span className="text-sm font-medium">{costAnalysisData.timeToPublish.before} {costAnalysisData.timeToPublish.unit}</span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div className="flex-1 w-full bg-muted rounded-t-lg relative">
                    <div 
                      className="absolute bottom-0 w-full bg-info rounded-t-lg"
                      style={{ height: `${(costAnalysisData.timeToPublish.after / costAnalysisData.timeToPublish.before) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-2">After AI</span>
                  <span className="text-sm font-medium text-info">{costAnalysisData.timeToPublish.after} {costAnalysisData.timeToPublish.unit}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="p-4 bg-primary/5 rounded-xl">
            <h4 className="text-sm font-medium text-foreground mb-2">Category Breakdown</h4>
            <div className="space-y-2">
              {costAnalysisData ? (
                costAnalysisData.categoryBreakdown.map((item) => (
                <div key={item.cat} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded", item.color)} />
                  <span className="text-sm text-muted-foreground flex-1">{item.cat}</span>
                  <span className="text-sm font-medium">{item.percent}%</span>
                </div>
                ))
              ) : (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="tryon" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Sidebar - Configuration (4 columns) */}
            <div className="xl:col-span-4 space-y-6">
              {/* Step 1: Identity Card */}
              <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                    <span className="text-base font-bold text-primary-foreground">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Identity Setup</h3>
                    <p className="text-xs text-muted-foreground">Configure your profile</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2.5 block">
                      Gender
                    </label>
                    <Select value={vtoGender} onValueChange={(v) => setVtoGender(v as "male" | "female")}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2.5 block">
                      Profile Image
                    </label>
                    <input
                      ref={vtoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleVtoFileChange}
                      className="hidden"
                    />
                    {vtoImagePreview ? (
                      <div className="relative group">
                        <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-border shadow-md">
                          <img
                            src={vtoImagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-3 right-3 h-9 w-9 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                          onClick={handleVtoRemoveImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "aspect-[3/4] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                          vtoIsDragging
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-primary/5"
                        )}
                        onDragOver={handleVtoDragOver}
                        onDragLeave={handleVtoDragLeave}
                        onDrop={handleVtoDrop}
                        onClick={() => vtoFileInputRef.current?.click()}
                      >
                        <div className="p-4 rounded-full bg-primary/10 mb-3">
                          <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">Click or drag to upload</p>
                        <p className="text-xs text-muted-foreground text-center px-4">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    )}
                    {!vtoUploadedImage && (
                      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg mt-3 border border-border/50">
                        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Optional: Upload your photo or use default model image
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Step 2: Product Selection Card */}
              <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                    <span className="text-base font-bold text-primary-foreground">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Product Selection</h3>
                    <p className="text-xs text-muted-foreground">Choose your product details</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">
                        Category
                      </label>
                      <Select value={vtoCategory} onValueChange={(v) => setVtoCategory(v as typeof vtoCategory)}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tshirts">T-Shirts</SelectItem>
                          <SelectItem value="pants">Pants</SelectItem>
                          <SelectItem value="jackets">Jackets</SelectItem>
                          <SelectItem value="shoes">Shoes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">
                        Gender
                      </label>
                      <Select value={vtoGender} onValueChange={(v) => setVtoGender(v as "male" | "female")}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2.5 block flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Current Brand
                    </label>
                    <Select value={vtoCurrentBrand} onValueChange={(v) => setVtoCurrentBrand(v as typeof vtoCurrentBrand)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nike">Nike</SelectItem>
                        <SelectItem value="Adidas">Adidas</SelectItem>
                        <SelectItem value="Zara">Zara</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2.5 block">
                      Current Size
                    </label>
                    <Input
                      placeholder="e.g., M, 44, 8"
                      value={vtoCurrentSize}
                      onChange={(e) => setVtoCurrentSize(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2.5 block flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      Target Brand
                    </label>
                    <Select value={vtoTargetBrand} onValueChange={(v) => setVtoTargetBrand(v as typeof vtoTargetBrand)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nike">Nike</SelectItem>
                        <SelectItem value="Adidas">Adidas</SelectItem>
                        <SelectItem value="Zara">Zara</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mapped Size Display */}
                  {vtoMappedSize && (
                    <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Target Mapped Size
                          </div>
                          <div className="text-2xl font-bold text-primary">{vtoMappedSize}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Health Check Card */}
              <Card className="p-4 border-border/50 bg-card/50 backdrop-blur-sm">
                <Button
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleVtoHealthCheck}
                  disabled={isVtoHealthChecking}
                >
                  {isVtoHealthChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Check Backend Health
                    </>
                  )}
                </Button>
                {vtoHealthData && (
                  <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <div className="font-medium text-success text-sm">Status: {vtoHealthData.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Gemini: {vtoHealthData.gemini_enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                )}
                {vtoHealthError && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <div className="font-medium text-destructive text-sm">Backend Offline</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {vtoHealthError instanceof Error ? vtoHealthError.message : "Connection failed"}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Main Content Area - Preview & Results (8 columns) */}
            <div className="xl:col-span-8">
              <Card className="p-8 lg:p-10 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg min-h-[600px] flex flex-col">
                {/* Header Section */}
                <div className="text-center space-y-3 mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI Generation</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                    Virtual Try-On Preview
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Generate a photorealistic virtual try-on using advanced AI technology
                  </p>
                </div>

                {/* Generate Button */}
                <div className="flex justify-center mb-8">
                  <Button
                    size="lg"
                    onClick={handleVtoGenerate}
                    disabled={!vtoIsReady}
                    className={cn(
                      "min-w-[280px] h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300",
                      vtoIsReady && "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                    )}
                  >
                    {vtoGenerateMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Generate Virtual Try-On
                      </>
                    )}
                  </Button>
                </div>

                {/* Loading State */}
                {vtoGenerateMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-12">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    </div>
                    <div className="text-center space-y-2 max-w-sm">
                      <p className="text-lg font-semibold text-foreground">Processing Your Request</p>
                      <p className="text-sm text-muted-foreground">
                        Our AI is creating your virtual try-on. This may take 10-30 seconds.
                      </p>
                      <div className="pt-4 w-full max-w-xs mx-auto">
                        <Progress value={undefined} className="h-2" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated Image Display */}
                {vtoHasResult && (
                  <div className="flex-1 space-y-6 animate-fade-in">
                    <div className="flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="font-semibold text-success">Try-On Generated Successfully!</span>
                    </div>
                    <div className="relative group rounded-2xl overflow-hidden border-2 border-border bg-muted/20 shadow-2xl">
                      <img
                        src={vtoGeneratedImageUrl}
                        alt="Generated Try-On"
                        className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">Final Result from Gemini 3</p>
                        {vtoMappedSize && (
                          <p className="text-xs text-muted-foreground">
                            Mapped size: <span className="font-semibold text-primary">{vtoMappedSize}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleVtoDownload}
                          className="gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleVtoRegenerate}
                          className="gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!vtoHasResult && !vtoGenerateMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-16">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20">
                        <Camera className="w-16 h-16 text-primary/60" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                      <p className="text-xl font-semibold text-foreground">Ready to Generate</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Configure your settings on the left and click generate to create your virtual try-on experience
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {vtoGenerateMutation.isError && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-md p-6 bg-destructive/10 border-2 border-destructive/20 rounded-xl space-y-4">
                      <div className="flex items-center gap-3 text-destructive">
                        <div className="p-2 rounded-lg bg-destructive/20">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">Generation Failed</div>
                          <div className="text-sm text-destructive/80">
                            {vtoGenerateMutation.error instanceof Error
                              ? vtoGenerateMutation.error.message
                              : "Unknown error occurred"}
                          </div>
                        </div>
                      </div>
                      {vtoGenerateMutation.error instanceof Error &&
                       vtoGenerateMutation.error.message.includes("Could not connect") && (
                        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-2">
                          <p className="text-sm font-medium text-foreground">Backend Setup Required:</p>
                          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Navigate to the VTryon_Updated directory</li>
                            <li>Install dependencies: <code className="bg-muted px-1 rounded">pip install -r requirements.txt</code></li>
                            <li>Set your GEMINI_API_KEY in a .env file</li>
                            <li>Run the server: <code className="bg-muted px-1 rounded">uvicorn app:app --reload</code></li>
                          </ol>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleVtoGenerate}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
