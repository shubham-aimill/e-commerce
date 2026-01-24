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
import {
  generateDescription,
  uploadImage,
  getTranslations,
  getKPIs,
  approveTranslations,
  type GenerateDescriptionResponse,
  type UploadImageResponse,
  type TranslationsResponse,
  type KPIsResponse,
  type Translation,
} from "@/lib/image-to-text-api";

interface ImageToTextKPI {
  label: string;
  value: string;
  icon: string;
  change: number;
}

interface GenerateResponse {
  success?: boolean;
  jobId?: string;
  title: string;
  shortDescription: string;
  longDescription?: string;
  bulletPoints: string[];
  attributes: Array<{
    name: string;
    value: string;
    confidence: number;
  }> | Record<string, string>;
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generatedData, setGeneratedData] = useState<GenerateResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch KPIs
  const { data: kpisData, isLoading: kpisLoading } = useQuery<KPIsResponse>({
    queryKey: ["image-to-text", "kpis"],
    queryFn: () => getKPIs(),
  });

  // Fetch translations
  const { data: translationsData, isLoading: translationsLoading } = useQuery<TranslationsResponse>({
    queryKey: ["image-to-text", "translations", uploadedImageId],
    queryFn: () => getTranslations(uploadedImageId!),
    enabled: !!uploadedImageId,
  });

  // Upload mutation - runs in background, doesn't block UI
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return uploadImage(file);
    },
    onSuccess: (data) => {
      setUploadedImageId(data.imageId);
      // Don't overwrite the preview - keep the FileReader data URL for immediate display
      // Only update filename if not already set
      if (!uploadedFileName) {
      setUploadedFileName(data.filename);
      }
      // Silent success - don't show toast to avoid interrupting user flow
      // toast({
      //   title: "Image uploaded",
      //   description: `Successfully uploaded ${data.filename}`,
      // });
    },
    onError: (error: Error) => {
      // Only show error if it's critical, otherwise fail silently
      console.error("Upload error:", error);
      // toast({
      //   title: "Upload error",
      //   description: error.message || "Failed to upload image",
      //   variant: "destructive",
      // });
    },
    // Don't retry on error - user can still generate description without upload
    retry: false,
  });

  // Generate mutation - uses /generate-description endpoint directly like Streamlit
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!uploadedFile) throw new Error("No image uploaded");
      
      // Use the direct generate-description endpoint like Streamlit
      const response = await generateDescription(uploadedFile, activeLanguage);
      
      // Transform response to match component interface
      const attributesArray = Object.entries(response.attributes || {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value,
        confidence: 95, // Default confidence since backend doesn't provide it
      }));
      
      return {
        title: response.title || "",
        shortDescription: response.short_description || "",
        longDescription: response.long_description || "",
        bulletPoints: response.bullet_points || [],
        attributes: attributesArray,
      } as GenerateResponse;
    },
    onSuccess: async (data) => {
      setGeneratedData(data);
      
      // Upload file in background after generation (for translations/quality checks)
      // Only if we haven't uploaded yet
      if (!uploadedImageId && uploadedFile) {
        try {
          const uploadResult = await uploadImage(uploadedFile);
          setUploadedImageId(uploadResult.imageId);
          // Invalidate queries now that we have imageId
          queryClient.invalidateQueries({ queryKey: ["image-to-text", "translations", uploadResult.imageId] });
        } catch (error) {
          // Silent fail - translations/quality checks just won't be available
          console.error("Background upload failed:", error);
        }
      } else if (uploadedImageId) {
        // Invalidate queries for translations and quality checks if imageId exists
      queryClient.invalidateQueries({ queryKey: ["image-to-text", "translations", uploadedImageId] });
      }
      
      toast({
        title: "Description generated",
        description: "AI has analyzed your image and generated content",
      });
    },
    onError: (error: Error) => {
      // Extract more helpful error message
      let errorMessage = error.message || "Failed to generate description";
      
      // Provide specific guidance for common errors
      if (error.message.includes("Not Found") || error.message.includes("404")) {
        errorMessage = "Backend server not found. Please ensure the FastAPI backend is running on port 8010. Start it with: uvicorn app.main:app --reload --port 8010";
      } else if (error.message.includes("Cannot connect") || error.message.includes("fetch")) {
        errorMessage = "Cannot connect to backend. Please ensure the FastAPI server is running on port 8010.";
      } else if (error.message.includes("timeout") || error.message.includes("timed out")) {
        errorMessage = "Request timed out. The backend may be processing slowly. Please try again.";
      }
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show longer for important errors
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (languages?: string[]) => {
      if (!uploadedImageId) throw new Error("No image uploaded");
      return approveTranslations({
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
  // Handle attributes - can be Array or Record, always convert to Array
  const attributes: Array<{ name: string; value: string; confidence: number }> = 
    Array.isArray(generatedData?.attributes) 
      ? generatedData.attributes 
      : generatedData?.attributes && typeof generatedData.attributes === 'object' && !Array.isArray(generatedData.attributes)
      ? Object.entries(generatedData.attributes).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: String(value),
          confidence: 95,
        }))
      : [];

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

      // Store file for generation
      setUploadedFile(file);
      
      // Create preview immediately (synchronously if possible, or show file name)
      setUploadedFileName(file.name);
      
      // Create preview using FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          setUploadedImage(result);
        }
      };
      reader.onerror = () => {
        console.error("FileReader error");
        // Still try to show something
        setUploadedImage(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);

      // Don't upload immediately - upload is only needed for translations/quality checks
      // We'll upload lazily when user requests those features or after generation
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

      // Store file for generation
      setUploadedFile(file);
      
      // Set filename immediately
      setUploadedFileName(file.name);
      
      // Create preview using FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result) {
          setUploadedImage(result);
        }
      };
      reader.onerror = () => {
        console.error("FileReader error");
        // Fallback to object URL
        setUploadedImage(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);

      // Don't upload immediately - upload is only needed for translations/quality checks
      // We'll upload lazily when user requests those features or after generation
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
    setUploadedFile(null);
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
    if (!uploadedFile) {
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
    approveMutation.mutate(undefined);
  };

  const handleEditSelected = () => {
    toast({
      title: "Edit mode",
      description: "Select translations to edit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-6 max-w-[1920px] mx-auto">
        {/* Enhanced Header with better styling */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 shadow-lg shadow-primary/5">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent tracking-tight">
                  Image-to-Text Auto Generation
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  Transform product images into marketplace-ready descriptions with AI-powered multi-language support
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-gradient-to-w from-primary/10 via-primary/5 to-primary/10 text-primary border-primary/20 px-4 py-2 shadow-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Powered
              </Badge>
              {kpisData && (
                <Badge className="bg-gradient-to- from-success/10 via-success/5 to-success/10 text-success border-success/20 px-4 py-2 shadow-sm">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  API Connected
                </Badge>
              )}
            </div>
          </div>
        </div>

      {/* Enhanced KPI Row with better design */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Performance Metrics</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpisLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse border border-border/30 shadow-sm" />
            ))
          ) : (
            kpis.map((kpi, index) => {
              const Icon = iconMap[kpi.icon] || Languages;
              return (
                <div 
                  key={kpi.label}
                  className={cn(
                    "group rounded-2xl p-6 border transition-all duration-300",
                    "bg-gradient-to-br from-card via-card/95 to-card/90",
                    "border-border/40 hover:border-primary/30",
                    "shadow-sm hover:shadow-xl hover:shadow-primary/5",
                    "hover:-translate-y-1",
                    "backdrop-blur-sm",
                    "animate-fade-in"
                  )}
                  style={{ 
                    animationDelay: `${index * 50}ms`, 
                    animationFillMode: 'forwards',
                    animationDuration: '400ms'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs font-semibold px-2 py-0.5",
                        kpi.change > 0 
                          ? "bg-success/10 text-success border-success/20" 
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
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
        <div 
          className="rounded-2xl p-6 lg:p-8 border border-border/40 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-xl shadow-primary/5 animate-fade-in" 
          style={{ 
            animationDelay: '200ms', 
            animationFillMode: 'forwards', 
            animationDuration: '500ms' 
          }}
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/30">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
            <h3 className="text-lg font-semibold text-foreground">AI Description Builder</h3>
              <p className="text-xs text-muted-foreground">Upload an image to generate product descriptions</p>
            </div>
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
            className="aspect-video bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 rounded-2xl mb-6 flex items-center justify-center border-2 border-dashed border-border/40 relative overflow-hidden cursor-pointer hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg transition-all duration-300 group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={!uploadedImage ? handleBrowse : undefined}
          >
            {uploadedImage ? (
              uploadMutation.isPending ? (
                <div className="relative w-full h-full group">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded product" 
                    className="w-full h-full object-cover rounded-2xl opacity-70"
                    onError={(e) => {
                      console.error("Image preview error:", e);
                      toast({
                        title: "Preview error",
                        description: "Could not load image preview",
                        variant: "destructive",
                      });
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
                    <div className="flex flex-col items-center gap-2 bg-background/90 px-4 py-2 rounded-lg">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-sm text-foreground font-medium">Uploading...</span>
              </div>
                  </div>
                </div>
              ) : (
              <div className="relative w-full h-full group">
                <img 
                  src={uploadedImage} 
                  alt="Uploaded product" 
                  className="w-full h-full object-cover rounded-2xl"
                  onError={(e) => {
                    console.error("Image preview error:", e);
                    toast({
                      title: "Preview error",
                      description: "Could not load image preview",
                      variant: "destructive",
                    });
                  }}
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
              )
            ) : (
              <div className="text-center p-8">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Upload product image</p>
                <p className="text-xs text-muted-foreground mb-4">Drag and drop or click to browse</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={(e) => { e.stopPropagation(); handleBrowse(); }}>
                  Browse Files
                </Button>
              </div>
            )}
          </div>

          {/* Language Selector - like Streamlit app */}
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Languages className="w-4 h-4 text-muted-foreground" />
              Output Language
            </label>
            <Select value={activeLanguage} onValueChange={setActiveLanguage}>
              <SelectTrigger className="w-full h-11 border-border/40 hover:border-primary/40 transition-colors">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="hi">🇮🇳 Hindi</SelectItem>
                <SelectItem value="ta">🇮🇳 Tamil</SelectItem>
                <SelectItem value="kn">🇮🇳 Kannada</SelectItem>
                <SelectItem value="af">🇿🇦 Afrikaans</SelectItem>
                <SelectItem value="zu">🇿🇦 Zulu</SelectItem>
                <SelectItem value="xh">🇿🇦 Xhosa</SelectItem>
                <SelectItem value="ar">🌍 Arabic</SelectItem>
                <SelectItem value="es">🌍 Spanish</SelectItem>
                <SelectItem value="fr">🌍 French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full gap-2 mb-6 h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" 
            size="lg" 
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !uploadedFile}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Description...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Description
              </>
            )}
          </Button>

          {/* Generated Content */}
          {generatedData ? (
            <div className="space-y-5 pt-4 border-t border-border/30">
              <div className="rounded-xl p-4 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Title
                  </label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                    className="h-8 gap-1.5 text-xs hover:bg-primary/10"
                  onClick={() => handleCopy(generatedData?.title || "", "Title")}
                >
                    <Copy className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>
                <div className="p-3.5 bg-background/50 rounded-lg text-sm font-medium text-foreground border border-border/30">
                  {generatedData?.title || "No title generated"}
              </div>
            </div>

              <div className="rounded-xl p-4 bg-gradient-to-br from-muted/30 via-muted/20 to-transparent border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Short Description
                  </label>
                <Button 
                  size="sm" 
                  variant="ghost" 
                    className="h-8 gap-1.5 text-xs hover:bg-muted"
                  onClick={() => handleCopy(generatedData?.shortDescription || "", "Short description")}
                >
                    <Copy className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>
              <Textarea 
                  className="min-h-[100px] resize-none bg-background/50 border-border/30 text-sm"
                value={generatedData?.shortDescription || ""}
                readOnly
              />
            </div>

              <div className="rounded-xl p-4 bg-gradient-to-br from-muted/30 via-muted/20 to-transparent border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Long Description
                  </label>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 gap-1.5 text-xs hover:bg-muted"
                    onClick={() => handleCopy(generatedData?.longDescription || "", "Long description")}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </Button>
              </div>
                <Textarea 
                  className="min-h-[150px] resize-none bg-background/50 border-border/30 text-sm"
                  value={generatedData?.longDescription || ""}
                  readOnly
                  placeholder="Long description will appear here..."
                />
              </div>

              <div className="rounded-xl p-4 bg-gradient-to-br from-muted/30 via-muted/20 to-transparent border border-border/30">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                    Key Features
                  </label>
                </div>
                <ul className="space-y-2.5">
                  {(generatedData?.bulletPoints || []).length > 0 ? (
                    generatedData.bulletPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm p-2.5 rounded-lg bg-background/50 border border-border/20 hover:border-primary/20 transition-colors">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span className="text-foreground flex-1">{point}</span>
                  </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground italic p-2.5">No features generated</li>
                  )}
              </ul>
            </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-border/30">
              <div className="text-center py-12 rounded-xl bg-muted/20 border border-dashed border-border/30">
                <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Generated content will appear here</p>
              </div>
            </div>
          )}

            {/* Language Tabs */}
            {languages.length > 0 && (
            <div className="pt-4 border-t border-border/30">
                <label className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  Available Translations
              </label>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLanguage(lang.code)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        "border",
                      activeLanguage === lang.code
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted border-border/40 hover:border-primary/30"
                    )}
                  >
                      <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {lang.status === 'complete' && (
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                    )}
                    {lang.status === 'error' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Enhanced Attribute Confidence Matrix */}
          <div 
            className="rounded-2xl p-6 lg:p-8 border border-border/40 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-xl shadow-primary/5 animate-fade-in" 
            style={{ 
              animationDelay: '300ms', 
              animationFillMode: 'forwards', 
              animationDuration: '500ms' 
            }}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                <h3 className="text-lg font-semibold text-foreground">Attribute Confidence Matrix</h3>
                  <p className="text-xs text-muted-foreground">AI-detected product attributes</p>
                </div>
              </div>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-[160px] h-10 border-border/40">
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
                attributes.map((attr, index) => (
                  <div 
                    key={attr.name}
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/20 via-muted/10 to-transparent rounded-xl border border-border/30 hover:border-primary/20 hover:shadow-md transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground mb-1">{attr.name}</div>
                      <div className="text-sm text-muted-foreground">{attr.value}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2.5 bg-muted/50 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            attr.confidence >= 90 ? "bg-gradient-to-r from-success to-success/80" :
                            attr.confidence >= 80 ? "bg-gradient-to-r from-warning to-warning/80" : 
                            "bg-gradient-to-r from-destructive to-destructive/80"
                          )}
                          style={{ width: `${String(attr.confidence)}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-bold w-12 text-right tabular-nums",
                        attr.confidence >= 90 ? "text-success" :
                        attr.confidence >= 80 ? "text-warning" : "text-destructive"
                      )}>
                        {attr.confidence}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 rounded-xl bg-muted/10 border border-dashed border-border/30">
                  <Target className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Generate description to see attributes</p>
                </div>
              )}
            </div>
          </div>
                </div>
              </div>
    </div>
  );
}
