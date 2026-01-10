import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Languages, 
  Target, 
  Zap, 
  Clock,
  Upload,
  Copy,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  X,
  Loader2,
  LucideIcon,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

interface ImageToTextKPI {
  label: string;
  value: string;
  icon: string;
  change: number;
}

interface Translation {
  code: string;
  name: string;
  flag: string;
  status: "complete" | "pending" | "error";
  title?: string | null;
  description?: string | null;
  bulletPoints?: string[] | null;
}

interface TranslationsResponse {
  imageId: string;
  translations: Translation[];
}

interface QualityCheck {
  code: string;
  name: string;
  flag: string;
  status: "complete" | "pending" | "error";
  checks: {
    grammar: boolean;
    keywords: number;
    cultural: number;
    forbidden: boolean;
  };
}

interface QualityCheckResponse {
  imageId: string;
  qualityChecks: QualityCheck[];
}

interface GenerateResponse {
  success: boolean;
  jobId: string;
  title: string;
  shortDescription: string;
  bulletPoints: string[];
  attributes: Array<{
    name: string;
    value: string;
    confidence: number;
  }>;
}

interface UploadResponse {
  success: boolean;
  imageId: string;
  url: string;
  filename: string;
}

const iconMap: Record<string, LucideIcon> = {
  Languages,
  Target,
  Zap,
  CheckCircle,
  Clock,
};

const mockLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧', status: 'complete' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', status: 'complete' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', status: 'pending' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳', status: 'pending' },
  { code: 'bn', name: 'Bengali', flag: '🇮🇳', status: 'complete' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦', status: 'complete' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦', status: 'error' },
  { code: 'xh', name: 'Xhosa', flag: '🇿🇦', status: 'complete' },
  { code: 'es', name: 'Spanish', flag: '🌍', status: 'complete' },
  { code: 'fr', name: 'French', flag: '🌍', status: 'complete' },
  { code: 'ar', name: 'Arabic', flag: '🌍', status: 'pending' },
];

const mockAttributes = [
  { name: 'Color', value: 'Navy Blue', confidence: 98 },
  { name: 'Material', value: 'Cotton Blend', confidence: 92 },
  { name: 'Gender', value: 'Unisex', confidence: 88 },
  { name: 'Size Range', value: 'S-XXL', confidence: 95 },
  { name: 'Pattern', value: 'Solid', confidence: 99 },
  { name: 'Fit Type', value: 'Regular', confidence: 85 },
  { name: 'Occasion', value: 'Casual', confidence: 78 },
  { name: 'Care', value: 'Machine Wash', confidence: 91 },
];

export default function ImageToText() {
  const queryClient = useQueryClient();
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [region, setRegion] = useState('india');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GenerateResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch KPIs
  const { data: kpisData, isLoading: kpisLoading } = useQuery<{ kpis: ImageToTextKPI[] }>({
    queryKey: ["image-to-text", "kpis"],
    queryFn: () => apiClient.get<{ kpis: ImageToTextKPI[] }>("/image-to-text/kpis"),
  });

  // Fetch translations
  const { data: translationsData, isLoading: translationsLoading } = useQuery<TranslationsResponse>({
    queryKey: ["image-to-text", "translations", uploadedImageId],
    queryFn: () => apiClient.get<TranslationsResponse>(`/image-to-text/translations/${uploadedImageId}`),
    enabled: !!uploadedImageId,
  });

  // Fetch quality check
  const { data: qualityCheckData, isLoading: qualityCheckLoading } = useQuery<QualityCheckResponse>({
    queryKey: ["image-to-text", "quality-check", uploadedImageId],
    queryFn: () => apiClient.get<QualityCheckResponse>(`/image-to-text/quality-check/${uploadedImageId}`),
    enabled: !!uploadedImageId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post<UploadResponse>("/image-to-text/upload", formData);
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
      if (!uploadedImageId) throw new Error("No image uploaded");
      return apiClient.post<GenerateResponse>("/image-to-text/generate", {
        imageId: uploadedImageId,
        region,
        language: activeLanguage,
        marketplace: region === "india" ? "Amazon.in" : region === "south_africa" ? "Takealot" : "Amazon.com",
      });
    },
    onSuccess: (data) => {
      setGeneratedData(data);
      queryClient.invalidateQueries({ queryKey: ["image-to-text", "translations", uploadedImageId] });
      queryClient.invalidateQueries({ queryKey: ["image-to-text", "quality-check", uploadedImageId] });
      toast({
        title: "Description generated",
        description: "AI has analyzed your image and generated content",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate description",
        variant: "destructive",
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (languages?: string[]) => {
      if (!uploadedImageId) throw new Error("No image uploaded");
      return apiClient.post<{ success: boolean; approved: number; message: string }>("/image-to-text/approve", {
        imageId: uploadedImageId,
        languages,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Approved",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["image-to-text"] });
    },
    onError: () => {
      toast({
        title: "Approval failed",
        description: "Failed to approve translations",
        variant: "destructive",
      });
    },
  });

  // Fallback dummy KPIs
  const dummyKpis: ImageToTextKPI[] = [
    { label: "Language Completeness", value: "87%", icon: "Languages", change: 12 },
    { label: "Marketplace Readiness", value: "94/100", icon: "Target", change: 5 },
    { label: "SEO Quality Score", value: "91/100", icon: "Zap", change: 8 },
    { label: "Attribute Accuracy", value: "96%", icon: "CheckCircle", change: 3 },
    { label: "Time Saved/Listing", value: "4.2min", icon: "Clock", change: -22 },
  ];

  const kpis = kpisData?.kpis.length ? kpisData.kpis : dummyKpis;
  const languages = translationsData?.translations || [];
  const attributes = generatedData?.attributes || [];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleBrowse = () => {
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
    setGeneratedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Image removed",
      description: "Upload a new image to continue",
    });
  };

  const handleGenerate = () => {
    if (!uploadedImageId) {
      toast({
        title: "Upload image",
        description: "Please upload a product image first",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const handleApproveAll = () => {
    approveMutation.mutate();
  };

  const handleEditSelected = () => {
    toast({
      title: "Edit mode",
      description: "Select translations to edit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1920px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-ai/10 to-ai/5 border border-ai/20">
                <FileText className="w-6 h-6 text-ai" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  Image-to-Text Auto Generation
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate marketplace-ready product descriptions from images with multi-language support
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-ai/10 to-ai/5 text-ai border-ai/20 px-3 py-1.5">
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
              const Icon = iconMap[kpi.icon] || Languages;
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
              );
            })
          )}
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Enhanced AI Description Builder */}
        <div className="rounded-xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-ai/10">
              <FileText className="w-5 h-5 text-ai" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">AI Description Builder</h3>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Enhanced Image Upload */}
          <div 
            className="aspect-video bg-gradient-to-br from-sand-50 to-sand-100 rounded-xl mb-6 flex items-center justify-center border-2 border-dashed border-border/50 relative overflow-hidden cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={!uploadedImage ? handleBrowse : undefined}
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Uploading...</span>
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
                <Upload className="w-10 h-10 text-sand-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Upload product image</p>
                <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={handleBrowse}>
                  Browse
                </Button>
              </div>
            )}
          </div>

          <Button 
            className="w-full gap-2 mb-6" 
            size="lg" 
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !uploadedImageId}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Description
              </>
            )}
          </Button>

          {/* Generated Content */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 gap-1 text-xs"
                  onClick={() => handleCopy(generatedData?.title || "", "Title")}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground">
                {generatedData?.title || ""}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Short Description</label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 gap-1 text-xs"
                  onClick={() => handleCopy(generatedData?.shortDescription || "", "Short description")}
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
              </div>
              <Textarea 
                className="min-h-[80px] resize-none bg-muted/50"
                value={generatedData?.shortDescription || ""}
                readOnly
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Features</label>
              </div>
              <ul className="space-y-2">
                {(generatedData?.bulletPoints || []).map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Language Tabs */}
            <div className="pt-4 border-t border-border/30">
              <label className="text-sm font-medium text-foreground mb-3 block">
                Translations
              </label>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLanguage(lang.code)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      activeLanguage === lang.code
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {lang.status === 'complete' && (
                      <CheckCircle className="w-3 h-3 text-success" />
                    )}
                    {lang.status === 'error' && (
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Attribute Confidence Matrix */}
        <div className="space-y-6">
          <div className="rounded-xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in" style={{ animationDelay: '300ms', animationFillMode: 'forwards', animationDuration: '500ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Attribute Confidence Matrix</h3>
              </div>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="india">🇮🇳 India</SelectItem>
                  <SelectItem value="south_africa">🇿🇦 South Africa</SelectItem>
                  <SelectItem value="global">🌍 Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              {attributes.length > 0 ? (
                attributes.map((attr) => (
                  <div 
                    key={attr.name}
                    className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{attr.name}</div>
                      <div className="text-sm text-muted-foreground">{attr.value}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            attr.confidence >= 90 ? "bg-success" :
                            attr.confidence >= 80 ? "bg-warning" : "bg-destructive"
                          )}
                          style={{ width: `${attr.confidence}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-medium w-10 text-right",
                        attr.confidence >= 90 ? "text-success" :
                        attr.confidence >= 80 ? "text-warning" : "text-destructive"
                      )}>
                        {attr.confidence}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Generate description to see attributes
                </div>
              )}
            </div>
          </div>

            {/* Enhanced Localization QA */}
            <div
              className="rounded-xl p-6 lg:p-8 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg animate-fade-in"
              style={{ animationDelay: '400ms', animationFillMode: 'forwards', animationDuration: '500ms' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-info/10">
                  <Languages className="w-5 h-5 text-info" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Localization Quality Check
                </h3>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {/* Scroll container */}

                {translationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : languages.length > 0 ? (
                  languages.map((lang) => {
                    // get backend QA data for this language
                    const qc = qualityCheckData?.qualityChecks.find(
                      (q) => q.code === lang.code
                    );

                    return (
                      <div
                        key={lang.code}
                        className="p-4 bg-muted/30 rounded-lg"
                      >
                        

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span className="font-medium text-foreground">
                              {lang.name}
                            </span>
                          </div>

                          <Badge
                            variant={lang.status === 'complete' ? 'default' : 'secondary'}
                            className={cn(
                              lang.status === 'complete' && "bg-success/10 text-success",
                              lang.status === 'pending' && "bg-warning/10 text-warning",
                              lang.status === 'error' && "bg-destructive/10 text-destructive"
                            )}
                          >
                            {lang.status === 'complete' && 'Complete'}
                            {lang.status === 'pending' && 'Pending'}
                            {lang.status === 'error' && 'Issues Found'}
                          </Badge>
                        </div>
                        

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          

                          {/* Grammar */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Grammar</span>
                            {qc?.checks.grammar ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <X className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          

                          {/* Keywords */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Keywords</span>
                            <span className="font-medium">
                              {qc ? `${qc.checks.keywords}%` : "--"}
                            </span>
                          </div>
                          

                          {/* Cultural */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Cultural</span>
                            <span className="font-medium">
                              {qc ? `${qc.checks.cultural}%` : "--"}
                            </span>
                          </div>
                          

                          {/* Forbidden */}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Forbidden</span>
                            {qc?.checks.forbidden ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <X className="w-4 h-4 text-destructive" />
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Generate description to see quality checks
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  className="flex-1" 
                  onClick={handleApproveAll}
                  disabled={approveMutation.isPending || !uploadedImageId}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Approve All"
                  )}
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleEditSelected}>Edit Selected</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
