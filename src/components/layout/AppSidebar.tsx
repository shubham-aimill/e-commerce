import { 
  LayoutDashboard, 
  AlertTriangle, 
  Camera, 
  FileText, 
  MessageSquare,
  Palette,
  Settings,
  HelpCircle,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { 
    title: "Executive Overview", 
    url: "/", 
    icon: LayoutDashboard,
    description: "Global command center"
  },
  { 
    title: "Mismatch Engine", 
    url: "/mismatch", 
    icon: AlertTriangle,
    description: "Content quality detection",
    badge: 3
  },
  { 
    title: "AI Photoshoot", 
    url: "/photoshoot", 
    icon: Camera,
    description: "Generate product imagery"
  },
  { 
    title: "Image to Text", 
    url: "/content", 
    icon: FileText,
    description: "Auto-generate descriptions"
  },
];

const toolsItems: NavItem[] = [
  { 
    title: "SQL Agent", 
    url: "/agent", 
    icon: MessageSquare,
    description: "Natural language queries"
  },
  { 
    title: "Virtual Try-On", 
    url: "/virtual-tryon", 
    icon: Camera,
    description: "Virtual try-on with AI"
  },
  { 
    title: "Color Mismatch", 
    url: "/color-mismatch", 
    icon: Palette,
    description: "Detect color mismatches"
  },
];

const settingsItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, description: "App settings" },
  { title: "Help", url: "/help", icon: HelpCircle, description: "Get help" },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const NavItemComponent = ({ item, collapsed }: { item: NavItem; collapsed: boolean }) => {
    const active = isActive(item.url);
    
    const content = (
      <NavLink 
        to={item.url}
        className={cn(
          "group relative flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ease-in-out",
          "hover:bg-[#F3F4F6] hover:scale-[1.01] active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
          active 
            ? "bg-[#EFF6FF] text-[#1E40AF] font-medium shadow-sm" 
            : "text-[#111827] hover:text-[#111827]"
        )}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? `${item.title}: ${item.description}` : undefined}
      >
        {/* Left border accent for active state */}
        {active && (
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3B82F6] rounded-l-lg" aria-hidden="true" />
        )}
        
        <item.icon 
          className={cn(
            "w-5 h-5 flex-shrink-0 transition-colors",
            active ? "text-[#3B82F6]" : "text-[#6B7280] group-hover:text-[#111827]"
          )} 
          aria-hidden="true"
        />
        
        {!collapsed && (
          <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
            <div className="flex flex-col flex-1 min-w-0 gap-0.5" style={{ lineHeight: "1.4" }}>
              <span className={cn(
                "text-sm font-medium leading-tight truncate",
                active ? "text-[#1E40AF]" : "text-[#111827]"
              )}>
                {item.title}
              </span>
              <span className={cn(
                "text-xs leading-tight truncate",
                active ? "text-[#1E40AF]/70" : "text-[#6B7280]"
              )}>
                {item.description}
              </span>
            </div>
            {item.badge && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] font-semibold flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[#111827] text-white border-0 shadow-lg">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{item.title}</span>
              <span className="text-xs text-white/80">{item.description}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <Sidebar 
        className="border-r border-border/30 bg-[#FAFBFC]"
        collapsible="icon"
        style={{ width: collapsed ? undefined : "280px", minWidth: collapsed ? undefined : "280px" }}
      >
        <SidebarHeader className="px-6 py-4 border-b border-border/30 bg-white/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-[#111827] text-base leading-tight">Content Intel</span>
                  <span className="text-xs text-[#6B7280] leading-tight">AI E-Commerce Platform</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </Button>
          </div>
        </SidebarHeader>

      <SidebarContent className="px-6 py-4">
        {/* Main Navigation Section */}
        <SidebarGroup className="space-y-2">
          {!collapsed && (
            <>
              <Separator className="my-0" />
              <SidebarGroupLabel className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.5px] px-0 pt-6 pb-2">
                Main Navigation
              </SidebarGroupLabel>
            </>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavItemComponent item={item} collapsed={collapsed} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Tools Section */}
        <SidebarGroup className="mt-6 space-y-2">
          {!collapsed && (
            <>
              <Separator className="my-0" />
              <SidebarGroupLabel className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.5px] px-0 pt-6 pb-2">
                AI Tools
              </SidebarGroupLabel>
            </>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavItemComponent item={item} collapsed={collapsed} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 py-4 border-t border-border/30 bg-white/50">
        <SidebarMenu className="space-y-1">
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <NavItemComponent item={item} collapsed={collapsed} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}
