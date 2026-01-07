import { useState, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  detectColor,
  matchColor,
  detectAndMatch,
  checkColorMismatchHealth,
  type ColorDetectionResult,
  type DetectAndMatchResult,
} from "@/lib/color-mismatch-api";

export default function ColorMismatch() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expectedColor, setExpectedColor] = useState("");
  const [detectionResult, setDetectionResult] = useState<ColorDetectionResult | null>(null);
  const [matchResult, setMatchResult] = useState<DetectAndMatchResult | null>(null);

  // Health check query
  const { data: healthData, refetch: checkHealthStatus, isFetching: isHealthChecking, error: healthError } = useQuery({
    queryKey: ["color-mismatch-health"],
    queryFn: checkColorMismatchHealth,
    enabled: false,
    retry: false,
    onSuccess: (data) => {
      toast({
        title: "Backend Online",
        description: `Status: ${data.status}`,
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

  // Match color mutation
  const matchMutation = useMutation({
    mutationFn: ({ expected, detected }: { expected: string; detected: string }) =>
      matchColor(expected, detected),
    onSuccess: (data) => {
      toast({
        title: "Match Result",
        description: `Verdict: ${data.verdict}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Match Failed",
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

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Product Color Mismatch Detection
          </h1>
          <Badge className="bg-ai/10 text-ai border-ai/20">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Powered
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Detect product colors using CLIP and match with catalog colors using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Image Upload & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Upload Product Image</h3>
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
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-foreground">Expected Color</h3>
            <Input
              placeholder="e.g., blue, red, navy blue"
              value={expectedColor}
              onChange={(e) => setExpectedColor(e.target.value)}
            />
            <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Enter the catalog/expected color for comparison</span>
            </div>
          </Card>

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
              </div>
            )}
            {healthError && (
              <div className="mt-3 p-2 bg-destructive/10 rounded-lg text-xs space-y-2">
                <div className="font-medium text-destructive">Backend Offline</div>
                <div className="text-muted-foreground">
                  {healthError instanceof Error ? healthError.message : "Connection failed"}
                </div>
                <div className="mt-2 p-2 bg-muted/50 rounded border border-border">
                  <p className="text-xs font-medium text-foreground mb-1">If backend is starting:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>CLIP model loading can take 1-2 minutes on first run</li>
                    <li>Check backend terminal for loading progress</li>
                    <li>Ensure OPENAI_API_KEY is set in .env file</li>
                    <li>Backend should be running on port 8020</li>
                  </ul>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Buttons */}
          <Card className="p-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Test Color Detection via FastAPI
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  size="lg"
                  onClick={handleDetectColor}
                  disabled={detectMutation.isPending || !uploadedImage}
                  className="w-full"
                >
                  {detectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Palette className="w-4 h-4 mr-2" />
                      Detect Color
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDetectAndMatch}
                  disabled={detectAndMatchMutation.isPending || !uploadedImage || !expectedColor.trim()}
                  className="w-full"
                >
                  {detectAndMatchMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Detect and Match
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Detection Results */}
          {detectionResult && (
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Color Detection Results</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Detected Color:</span>
                  <span className="text-lg font-bold text-foreground">{detectionResult.detected_color}</span>
                </div>
                {detectionResult.detected_confidence !== null && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Confidence:</span>
                    <span className="text-lg font-semibold text-foreground">
                      {(detectionResult.detected_confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {detectionResult.fallback_model && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-muted-foreground">Model Used:</span>
                    <Badge variant="outline">{detectionResult.fallback_model.toUpperCase()}</Badge>
                  </div>
                )}
                {detectionResult.top_candidates && detectionResult.top_candidates.length > 1 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Top Candidates:</span>
                    <div className="space-y-1">
                      {detectionResult.top_candidates.slice(0, 5).map(([color, confidence], idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                          <span>{color}</span>
                          {confidence !== null && (
                            <span className="text-muted-foreground">{(confidence * 100).toFixed(1)}%</span>
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
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Color Match Analysis</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Expected Color</div>
                    <div className="font-semibold text-foreground">{matchResult.expected_color}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Detected Color</div>
                    <div className="font-semibold text-foreground">{matchResult.detection.detected_color}</div>
                  </div>
                </div>
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  matchResult.verdict === "Match"
                    ? "bg-success/10 border-success/30"
                    : "bg-destructive/10 border-destructive/30"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Verdict:</span>
                    <Badge
                      variant={matchResult.verdict === "Match" ? "default" : "destructive"}
                      className={cn(
                        matchResult.verdict === "Match"
                          ? "bg-success/20 text-success border-success/30"
                          : "bg-destructive/20 text-destructive border-destructive/30"
                      )}
                    >
                      {matchResult.verdict}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Error Display */}
          {(detectMutation.isError || detectAndMatchMutation.isError) && (
            <Card className="p-4 bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-destructive/80 mt-2">
                {detectMutation.error instanceof Error
                  ? detectMutation.error.message
                  : detectAndMatchMutation.error instanceof Error
                  ? detectAndMatchMutation.error.message
                  : "Unknown error occurred"}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

