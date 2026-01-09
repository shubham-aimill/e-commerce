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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { generateTryOn, checkHealth, type GenerateTryOnParams } from "@/lib/vto-api";

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

  // Health check query
  const { data: healthData, refetch: checkHealthStatus, isFetching: isHealthChecking, error: healthError } = useQuery({
    queryKey: ["vto-health"],
    queryFn: checkHealth,
    enabled: false, // Only run when manually triggered
    retry: false,
    onSuccess: (data) => {
      toast({
        title: "Backend Online",
        description: `Gemini: ${data.gemini_enabled ? "Enabled" : "Disabled"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backend Offline",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate try-on mutation
  const generateMutation = useMutation({
    mutationFn: (params: GenerateTryOnParams) => generateTryOn(params),
    onSuccess: (data) => {
      // Create object URL from blob
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
      // Validate file type
      if (!file.type.startsWith("image/")) {
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
      // The toast will be shown via the query's onSuccess if we refetch successfully
    } catch (error) {
      // Error will be handled by the query
    }
  };

  // Cleanup object URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (generatedImageUrl) {
        URL.revokeObjectURL(generatedImageUrl);
      }
    };
  }, [generatedImageUrl]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Virtual Try-On
          </h1>
          <Badge className="bg-ai/10 text-ai border-ai/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Gemini 3 VTO: FastAPI Integration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Step 1: Identity */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">1</span>
              </div>
              <h3 className="font-semibold text-foreground">Identity</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Gender
                </label>
                <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Profile Image
                </label>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="profile-upload"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                  {imagePreview && (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full rounded-lg border border-border"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={handleRemoveImage}
                      >
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {!uploadedImage && (
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>Using default model image from backend</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Step 2: Product Selection */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">2</span>
              </div>
              <h3 className="font-semibold text-foreground">Product Selection</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Category
                </label>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Current Brand
                </label>
                <Select value={currentBrand} onValueChange={(v) => setCurrentBrand(v as typeof currentBrand)}>
                  <SelectTrigger>
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
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Current Size
                </label>
                <Input
                  placeholder="e.g., M, 44, 8"
                  value={currentSize}
                  onChange={(e) => setCurrentSize(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Target Brand
                </label>
                <Select value={targetBrand} onValueChange={(v) => setTargetBrand(v as typeof targetBrand)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nike">Nike</SelectItem>
                    <SelectItem value="Adidas">Adidas</SelectItem>
                    <SelectItem value="Zara">Zara</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Mapped Size Display */}
          {mappedSize && (
            <Card className="p-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Target Mapped Size
                </div>
                <div className="text-2xl font-bold text-foreground">{mappedSize}</div>
              </div>
            </Card>
          )}

          {/* Health Check */}
          <Card className="p-4">
            <Button
              variant="outline"
              className="w-full"
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
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Backend Health
                </>
              )}
            </Button>
            {healthData && (
              <div className="mt-3 p-2 bg-success/10 rounded-lg text-xs">
                <div className="font-medium text-success">Status: {healthData.status}</div>
                <div className="text-muted-foreground">Gemini: {healthData.gemini_enabled ? "Enabled" : "Disabled"}</div>
              </div>
            )}
            {healthError && (
              <div className="mt-3 p-2 bg-destructive/10 rounded-lg text-xs">
                <div className="font-medium text-destructive">Backend Offline</div>
                <div className="text-muted-foreground mt-1">
                  {healthError instanceof Error ? healthError.message : "Connection failed"}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Virtual Try-On Execution
              </h2>
              <p className="text-sm text-muted-foreground">
                Generate a realistic virtual try-on using AI
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !currentSize.trim()}
                className="min-w-[200px]"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Generate Real Try-On
                  </>
                )}
              </Button>
            </div>

            {/* Generated Image Display */}
            {generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Sending request to FastAPI Backend...</p>
              </div>
            )}

            {generatedImageUrl && !generateMutation.isPending && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Try-On Generated via Backend!</span>
                </div>
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img
                    src={generatedImageUrl}
                    alt="Generated Try-On"
                    className="w-full h-auto"
                  />
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Final Result from Gemini 3
                </div>
              </div>
            )}

            {generateMutation.isError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Backend Error</span>
                </div>
                <p className="text-sm text-destructive/80">
                  {generateMutation.error instanceof Error
                    ? generateMutation.error.message
                    : "Unknown error occurred"}
                </p>
                {generateMutation.error instanceof Error && 
                 generateMutation.error.message.includes("Could not connect") && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                    <p className="text-sm font-medium text-foreground mb-2">To start the backend:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Navigate to the VTryon_Updated/VTryon_Updated directory</li>
                      <li>Install dependencies: <code className="bg-muted px-1 rounded">pip install -r requirements.txt</code></li>
                      <li>Set your GEMINI_API_KEY in a .env file</li>
                      <li>Run the server: <code className="bg-muted px-1 rounded">uvicorn app:app --reload</code></li>
                      <li>Ensure the server is running on <code className="bg-muted px-1 rounded">http://127.0.0.1:8000</code></li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

