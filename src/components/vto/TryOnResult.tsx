import { Download, Share2, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TryOnResultProps {
  imageUrl: string | null;
  mappedSize?: string;
  isLoading?: boolean;
  onDownload?: () => void;
  onShare?: () => void;
  onRegenerate?: () => void;
}

export function TryOnResult({
  imageUrl,
  mappedSize,
  isLoading = false,
  onDownload,
  onShare,
  onRegenerate,
}: TryOnResultProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Generating Try-On...
            </h3>
            <p className="text-sm text-muted-foreground">
              This may take 10-30 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Try-On Result</h3>
          {mappedSize && (
            <p className="text-sm text-muted-foreground mt-1">
              Mapped Size: <span className="font-medium text-foreground">{mappedSize}</span>
            </p>
          )}
        </div>
        <Badge className="bg-success/10 text-success border-success/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Generated
        </Badge>
      </div>

      <div className="relative aspect-[3/4] bg-muted/30 rounded-lg overflow-hidden border border-border/50">
        <img
          src={imageUrl}
          alt="Virtual try-on result"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onDownload}
          className="flex-1 gap-2"
          variant="default"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
        <Button
          onClick={onShare}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
        <Button
          onClick={onRegenerate}
          variant="ghost"
          size="icon"
          title="Regenerate"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}



