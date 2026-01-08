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
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import { VirtualTryOnForm } from "@/components/vto/VirtualTryOnForm";

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

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            AI Image Generation
          </h1>
          <Badge className="bg-ai/10 text-ai border-ai/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
          {kpisData ? (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-success/20 text-success border-success/30">
              API
            </Badge>
          ) : kpisLoading ? null : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted">
              Demo
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Generate professional product imagery and virtual try-ons with AI
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="photoshoot" className="space-y-6">
        <TabsList className="w-full grid grid-cols-2 max-w-md">
          <TabsTrigger value="photoshoot">AI Photoshoot</TabsTrigger>
          <TabsTrigger value="tryon">Virtual Try-On</TabsTrigger>
        </TabsList>

        <TabsContent value="photoshoot" className="space-y-6 mt-0">
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
          kpis.map((kpi, index) => {
            const Icon = iconMap[kpi.icon] || Camera;
          return (
            <div 
              key={kpi.label}
              className="glass-card rounded-xl p-4 opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">{kpi.value}</span>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      kpi.change > 0 ? "text-success" : "text-destructive"
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
            </div>
          );
          })
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selector */}
        <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Model Style Selection</h3>
          
          <Tabs value={activeRegion} onValueChange={setActiveRegion}>
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="indian">🇮🇳 Indian</TabsTrigger>
              <TabsTrigger value="southAfrican">🇿🇦 South African</TabsTrigger>
              <TabsTrigger value="global">🌍 Global</TabsTrigger>
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
                        "p-4 rounded-xl border-2 cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-muted/50",
                        selectedTemplate === template.id 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50"
                      )}
                    >
                      <div className="aspect-square bg-gradient-to-br from-sand-100 to-sand-200 rounded-lg mb-3 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-sand-400" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">{template.image}</p>
                        <Badge variant="secondary" className="text-xs">
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

        {/* Before/After Viewer */}
        <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Image Preview</h3>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div 
            className="aspect-[4/3] bg-gradient-to-br from-sand-50 to-sand-100 rounded-xl mb-4 flex items-center justify-center border-2 border-dashed border-border relative overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
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

      {/* Cost Efficiency Panel */}
      <div className="glass-card rounded-xl p-6 opacity-0 animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Cost & Efficiency Analysis</h3>
        
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
          <VirtualTryOnForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
