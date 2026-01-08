import { ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Brand, Category, Gender } from "@/types/vto";
import { getMappedSizeByCategory } from "@/lib/vto-size-mapping";

interface SizeMappingDisplayProps {
  category: Category;
  gender: Gender;
  fromBrand: Brand;
  fromSize: string;
  toBrand: Brand;
}

export function SizeMappingDisplay({
  category,
  gender,
  fromBrand,
  fromSize,
  toBrand,
}: SizeMappingDisplayProps) {
  const mappedSize = getMappedSizeByCategory(
    category,
    gender,
    fromBrand,
    fromSize,
    toBrand
  );

  if (!mappedSize) {
    return (
      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            Size mapping not available for this combination
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Current</div>
            <Badge variant="outline" className="text-sm font-medium">
              {fromBrand} {fromSize}
            </Badge>
          </div>
          
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Target</div>
            <Badge className="text-sm font-medium bg-primary text-primary-foreground">
              {toBrand} {mappedSize}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-success">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-medium">Mapped</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="text-xs text-muted-foreground">
          Category: <span className="font-medium text-foreground capitalize">{category}</span>
          {" • "}
          Gender: <span className="font-medium text-foreground capitalize">{gender}</span>
        </div>
      </div>
    </div>
  );
}



