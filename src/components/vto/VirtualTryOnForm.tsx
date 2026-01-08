import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  X,
  Sparkles,
  User,
  Shirt,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { vtoApi } from "@/lib/api";
import type { VTORequest, Brand, Category, Gender } from "@/types/vto";
import { SizeMappingDisplay } from "./SizeMappingDisplay";
import { TryOnResult } from "./TryOnResult";
import { getAvailableSizes } from "@/lib/vto-size-mapping";

export function VirtualTryOnForm() {
  const [gender, setGender] = useState<Gender>("male");
  const [category, setCategory] = useState<Category>("tshirts");
  const [currentBrand, setCurrentBrand] = useState<Brand>("Nike");
  const [currentSize, setCurrentSize] = useState<string>("M");
  const [targetBrand, setTargetBrand] = useState<Brand>("Adidas");
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userImageFile, setUserImageFile] = useState<File | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [mappedSize, setMappedSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update available sizes when brand/category/gender changes
  const availableSizes = getAvailableSizes(category, gender, currentBrand);

  const tryOnMutation = useMutation({
    mutationFn: async (data: VTORequest) => {
      const formData = new FormData();
      formData.append("gender", data.gender);
      formData.append("category", data.category);
      formData.append("current_brand", data.currentBrand);
      formData.append("current_size", data.currentSize);
      formData.append("target_brand", data.targetBrand);

      if (data.userImage) {
        formData.append("user_image", data.userImage);
      }

      const blob = await vtoApi.generateTryOn(formData);
      const imageUrl = URL.createObjectURL(blob);
      
      // Calculate mapped size
      const { getMappedSizeByCategory } = await import("@/lib/vto-size-mapping");
      const mapped = getMappedSizeByCategory(
        data.category,
        data.gender,
        data.currentBrand,
        data.currentSize,
        data.targetBrand
      );

      return { imageUrl, mappedSize: mapped };
    },
    onSuccess: (data) => {
      setResultImageUrl(data.imageUrl);
      setMappedSize(data.mappedSize);
      toast({
        title: "Try-on generated!",
        description: "Your virtual try-on is ready",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate try-on image",
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

      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImage(reader.result as string);
        setUserImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
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
        setUserImage(reader.result as string);
        setUserImageFile(file);
      };
      reader.readAsDataURL(file);
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
    setUserImage(null);
    setUserImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = () => {
    if (!currentSize) {
      toast({
        title: "Size required",
        description: "Please enter your current size",
        variant: "destructive",
      });
      return;
    }

    tryOnMutation.mutate({
      gender,
      category,
      currentBrand,
      currentSize,
      targetBrand,
      userImage: userImageFile || undefined,
    });
  };

  const handleDownload = () => {
    if (!resultImageUrl) return;
    
    const link = document.createElement("a");
    link.href = resultImageUrl;
    link.download = `tryon-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloading",
      description: "Image download started",
    });
  };

  const handleShare = async () => {
    if (!resultImageUrl) return;
    
    try {
      const response = await fetch(resultImageUrl);
      const blob = await response.blob();
      const file = new File([blob], "tryon.png", { type: "image/png" });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Virtual Try-On Result",
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(resultImageUrl);
        toast({
          title: "Link copied",
          description: "Image URL copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share image",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = () => {
    setResultImageUrl(null);
    setMappedSize(null);
    handleGenerate();
  };

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Step 1: Upload Your Photo (Optional)
        </h3>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          className={cn(
            "aspect-[3/4] bg-gradient-to-br from-sand-50 to-sand-100 rounded-xl mb-4 flex items-center justify-center border-2 border-dashed border-border relative overflow-hidden cursor-pointer hover:border-primary/50 transition-colors",
            userImage && "border-solid"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={!userImage ? () => fileInputRef.current?.click() : undefined}
        >
          {userImage ? (
            <div className="relative w-full h-full group">
              <img
                src={userImage}
                alt="Uploaded user"
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
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-12 h-12 text-sand-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Upload your photo</p>
              <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => fileInputRef.current?.click()}>
                Browse Files
              </Button>
            </div>
          )}
        </div>

        {!userImage && (
          <p className="text-xs text-muted-foreground text-center">
            Using default model image if no photo uploaded
          </p>
        )}
      </div>

      {/* Product Selection Section */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shirt className="w-5 h-5 text-primary" />
          Step 2: Product Selection
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Gender</label>
            <Select value={gender} onValueChange={(value) => setGender(value as Gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Category</label>
            <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Brand</label>
            <Select value={currentBrand} onValueChange={(value) => setCurrentBrand(value as Brand)}>
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Size</label>
            <Select value={currentSize} onValueChange={setCurrentSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.length > 0 ? (
                  availableSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={currentSize}>{currentSize}</SelectItem>
                )}
              </SelectContent>
            </Select>
            {availableSizes.length === 0 && (
              <Input
                value={currentSize}
                onChange={(e) => setCurrentSize(e.target.value)}
                placeholder="Enter size (e.g., M, 44, 8)"
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Target Brand</label>
            <Select value={targetBrand} onValueChange={(value) => setTargetBrand(value as Brand)}>
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

        {/* Size Mapping Display */}
        {currentSize && currentBrand !== targetBrand && (
          <div className="mt-4">
            <SizeMappingDisplay
              category={category}
              gender={gender}
              fromBrand={currentBrand}
              fromSize={currentSize}
              toBrand={targetBrand}
            />
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={tryOnMutation.isPending || !currentSize}
          size="lg"
          className="gap-2 min-w-[200px]"
        >
          {tryOnMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Try-On
            </>
          )}
        </Button>
      </div>

      {/* Result Display */}
      {resultImageUrl && (
        <TryOnResult
          imageUrl={resultImageUrl}
          mappedSize={mappedSize || undefined}
          onDownload={handleDownload}
          onShare={handleShare}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
}



