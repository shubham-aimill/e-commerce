import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Bell, Shield, Globe, Palette, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserSettings {
  profile: {
    name: string;
    email: string;
    avatar?: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    alerts: string[];
  };
  marketplaces: Array<{
    id: string;
    name: string;
    active: boolean;
    connected: boolean;
  }>;
  appearance: {
    theme: "system" | "light" | "dark";
  };
}

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading, error } = useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: () => apiClient.get<UserSettings>("/settings"),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      return apiClient.put<{ success: boolean; message: string }>("/settings", updates);
    },
    onSuccess: (data) => {
      toast({
        title: "Settings updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const settings = settingsData;
  const activeMarketplaces = settings?.marketplaces?.filter(m => m.active && m.connected).length ?? 0;
  const newNotifications = 3; // This would come from a notifications API

  const settingsItems = [
    { 
      icon: User, 
      title: "Profile", 
      description: "Manage your account details", 
      badge: null,
      onClick: () => {
        // Handle profile edit
      }
    },
    { 
      icon: Bell, 
      title: "Notifications", 
      description: "Configure alert preferences", 
      badge: newNotifications > 0 ? `${newNotifications} new` : null,
      onClick: () => {
        updateMutation.mutate({
          notifications: {
            ...settings?.notifications,
            email: !settings?.notifications?.email,
          },
        });
      }
    },
    { 
      icon: Shield, 
      title: "Security", 
      description: "Password and authentication", 
      badge: null,
      onClick: () => {
        // Handle security settings
      }
    },
    { 
      icon: Globe, 
      title: "Marketplaces", 
      description: "Connected marketplace accounts", 
      badge: activeMarketplaces > 0 ? `${activeMarketplaces} active` : null,
      onClick: () => {
        // Handle marketplace settings
      }
    },
    { 
      icon: Palette, 
      title: "Appearance", 
      description: "Theme and display settings", 
      badge: null,
      onClick: () => {
        const currentTheme = settings?.appearance?.theme || "system";
        const nextTheme = currentTheme === "system" ? "light" : currentTheme === "light" ? "dark" : "system";
        updateMutation.mutate({
          appearance: {
            theme: nextTheme,
          },
        });
      }
    },
  ];

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-[800px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-[800px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-destructive">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                Settings
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account and platform preferences
              </p>
            </div>
            {settingsData && (
              <Badge className="bg-success/10 text-success border-success/20 px-3 py-1.5 ml-auto">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                API Connected
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={cn(
                  "rounded-xl p-6 lg:p-8 border-2 border-border/50 bg-card/50 backdrop-blur-sm shadow-lg",
                  "flex items-center gap-4 hover:border-primary/50 hover:bg-primary/5 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer",
                  "animate-fade-in"
                )}
                style={{ 
                  animationDelay: `${index * 100}ms`, 
                  animationFillMode: 'forwards',
                  animationDuration: '400ms'
                }}
                onClick={item.onClick}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="font-semibold">{item.badge}</Badge>
                )}
                {updateMutation.isPending && item.title === "Notifications" && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
