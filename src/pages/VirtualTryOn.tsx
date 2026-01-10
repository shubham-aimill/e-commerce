import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Info,
  X,
  Download,
  RefreshCw,
  Zap,
  User,
  Shirt,
  ArrowRight,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { generateTryOn, checkHealth, type GenerateTryOnParams, type VtoHealthResponse } from "@/lib/vto-api";

export default function VirtualTryOn() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [category, setCategory] = useState<"tshirts" | "pants" | "jackets" | "shoes">("tshirts");
  const [currentBrand, setCurrentBrand] = useState<"Nike" | "Adidas" | "Zara">("Nike");
  const [currentSize, setCurrentSize] = useState("M");
  const [targetBrand, setTargetBrand] = useState<"Nike" | "Adidas" | "Zara">("Adidas");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mappedSize, setMappedSize] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Health check query
  const { data: healthData, refetch: checkHealthStatus, isFetching: isHealthChecking, error: healthError } = useQuery<VtoHealthResponse>({
    queryKey: ["vto-health"],
    queryFn: checkHealth,
    enabled: false,
    retry: false,
  });

  // Handle health check success/error
  useEffect(() => {
    if (healthData) {
      toast({
        title: "Backend Online",
        description: `Gemini: ${healthData.gemini_enabled ? "Enabled" : "Disabled"}`,
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

  // Generate try-on mutation
  const generateMutation = useMutation({
    mutationFn: (params: GenerateTryOnParams) => generateTryOn(params),
    onSuccess: (data) => {
      const url = URL.createObjectURL(data.image);
      setGeneratedImageUrl(url);
      if (data.mappedSize) {
        setMappedSize(data.mappedSize);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
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
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = () => {
    if (!currentSize.trim()) {
      toast({
        title: "Size required",
        description: "Please enter a size",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      gender,
      category,
      current_brand: currentBrand,
      current_size: currentSize,
      target_brand: targetBrand,
      user_image: uploadedImage ?? undefined,
    });
  };

  const handleHealthCheck = async () => {
    try {
      await checkHealthStatus();
    } catch (error) {
      // Error handled by query
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = `tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Downloaded",
      description: "Image saved successfully",
    });
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (generatedImageUrl) {
        URL.revokeObjectURL(generatedImageUrl);
      }
    };
  }, [generatedImageUrl]);

  const isReady = currentSize.trim() && !generateMutation.isPending;
  const hasResult = !!generatedImageUrl && !generateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1920px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                  Virtual Try-On
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-ai/10 to-ai/5 text-ai border-ai/20 px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Powered
              </Badge>
              {healthData && (
                <Badge variant="outline" className="border-success/30 text-success bg-success/5">
                  <Activity className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              )}
            </div>
          </div>
        </div>

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
                  <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
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
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative group">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-border shadow-md">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-3 right-3 h-9 w-9 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                        onClick={handleRemoveImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "aspect-[3/4] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                        isDragging
                          ? "border-primary bg-primary/5 scale-[1.02]"
                          : "border-border/50 bg-muted/30 hover:border-primary/50 hover:bg-primary/5"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
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
                  {!uploadedImage && (
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
                    <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
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
                    <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
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
                  <Select value={currentBrand} onValueChange={(v) => setCurrentBrand(v as typeof currentBrand)}>
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
                    value={currentSize}
                    onChange={(e) => setCurrentSize(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Target Brand
                  </label>
                  <Select value={targetBrand} onValueChange={(v) => setTargetBrand(v as typeof targetBrand)}>
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
                {mappedSize && (
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Target Mapped Size
                        </div>
                        <div className="text-2xl font-bold text-primary">{mappedSize}</div>
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
                    <Activity className="w-4 h-4 mr-2" />
                    Check Backend Health
                  </>
                )}
              </Button>
              {healthData && (
                <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <div className="font-medium text-success text-sm">Status: {healthData.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Gemini: {healthData.gemini_enabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
              )}
              {healthError && (
                <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <div className="font-medium text-destructive text-sm">Backend Offline</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {healthError instanceof Error ? healthError.message : "Connection failed"}
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
                  onClick={handleGenerate}
                  disabled={!isReady}
                  className={cn(
                    "min-w-[280px] h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300",
                    isReady && "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                  )}
                >
                  {generateMutation.isPending ? (
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
              {generateMutation.isPending && (
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
              {hasResult && (
                <div className="flex-1 space-y-6 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg border border-success/20">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="font-semibold text-success">Try-On Generated Successfully!</span>
                  </div>
                  <div className="relative group rounded-2xl overflow-hidden border-2 border-border bg-muted/20 shadow-2xl">
                    <img
                      src={generatedImageUrl}
                      alt="Generated Try-On"
                      className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Final Result from Gemini 3</p>
                      {mappedSize && (
                        <p className="text-xs text-muted-foreground">
                          Mapped size: <span className="font-semibold text-primary">{mappedSize}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerate}
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
              {!hasResult && !generateMutation.isPending && (
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
              {generateMutation.isError && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-md p-6 bg-destructive/10 border-2 border-destructive/20 rounded-xl space-y-4">
                    <div className="flex items-center gap-3 text-destructive">
                      <div className="p-2 rounded-lg bg-destructive/20">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Generation Failed</div>
                        <div className="text-sm text-destructive/80">
                          {generateMutation.error instanceof Error
                            ? generateMutation.error.message
                            : "Unknown error occurred"}
                        </div>
                      </div>
                    </div>
                    {generateMutation.error instanceof Error &&
                     generateMutation.error.message.includes("Could not connect") && (
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
                      onClick={handleGenerate}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
