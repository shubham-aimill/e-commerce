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
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// --- Interfaces & Data ---

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
    title: "Color Mismatch", 
    url: "/color-mismatch", 
    icon: Palette,
    description: "Detect color mismatches"
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
];

const settingsItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, description: "App settings" },
  { title: "Help", url: "/help", icon: HelpCircle, description: "Get help" },
];

// --- Helper Component (Moved Outside to prevent re-renders) ---

const NavItemLink = ({ 
  item, 
  collapsed, 
  isActive 
}: { 
  item: NavItem; 
  collapsed: boolean;
  isActive: boolean; 
}) => {
  const content = (
    <NavLink 
      to={item.url}
      className={cn(
        "group relative flex items-center gap-4 py-3 rounded-lg transition-all duration-200 ease-in-out",
        // Dynamic padding based on collapse state to keep icons centered
        collapsed ? "justify-center px-2" : "px-4", 
        "hover:bg-[#F3F4F6] hover:scale-[1.01] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
        isActive 
          ? "bg-[#EFF6FF] text-[#1E40AF] font-medium shadow-sm" 
          : "text-[#111827] hover:text-[#111827]"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Left border accent for active state */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3B82F6] rounded-l-lg" aria-hidden="true" />
      )}
      
      <item.icon 
        className={cn(
          "w-5 h-5 flex-shrink-0 transition-colors",
          isActive ? "text-[#3B82F6]" : "text-[#6B7280] group-hover:text-[#111827]"
        )} 
        aria-hidden="true"
      />
      
      {!collapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0 gap-2 animate-in fade-in duration-300">
          <div className="flex flex-col flex-1 min-w-0 gap-0.5" style={{ lineHeight: "1.4" }}>
            <span className={cn(
              "text-sm font-medium leading-tight truncate",
              isActive ? "text-[#1E40AF]" : "text-[#111827]"
            )}>
              {item.title}
            </span>
            <span className={cn(
              "text-xs leading-tight truncate",
              isActive ? "text-[#1E40AF]/70" : "text-[#6B7280]"
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

// --- Main Component ---

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const checkIsActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <TooltipProvider>
      <Sidebar 
        className="border-r border-border/30 bg-[#FAFBFC]"
        collapsible="icon"
        // Let standard Sidebar width logic handle the width, 
        // but enforce min-width logic via classes if necessary for your design system
        variant="sidebar"
      >
        <SidebarHeader className={cn(
          "border-b border-border/30 bg-white/50 backdrop-blur-sm shadow-sm transition-all duration-300",
          collapsed ? "px-2 py-4 justify-center" : "px-6 py-4"
        )}>
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-md flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="font-semibold text-[#111827] text-base leading-tight truncate">Content Intel</span>
                </div>
              )}
            </div>
            {!collapsed && (
               <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
               onClick={toggleSidebar}
               aria-label="Collapse sidebar"
             >
               <Menu className="w-4 h-4" />
             </Button>
            )}
          </div>
          {/* If sidebar is collapsed, we usually move the toggle button to the main layout or 
            keep it here. If you want it here when collapsed:
          */}
          {collapsed && (
             <Button
             variant="ghost"
             size="icon"
             className="h-6 w-6 mt-2 mx-auto text-[#6B7280] hover:text-[#111827]"
             onClick={toggleSidebar}
             aria-label="Expand sidebar"
           >
             <Menu className="w-4 h-4" />
           </Button>
          )}
        </SidebarHeader>

        <SidebarContent className={cn(
          "transition-all duration-300",
          collapsed ? "px-2 py-4" : "px-6 py-4"
        )}>
          {/* Main Navigation Section */}
          <SidebarGroup className="space-y-2">
            {!collapsed && (
              <>
                <SidebarGroupLabel className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.5px] px-0 pt-2 pb-2">
                  Main Navigation
                </SidebarGroupLabel>
              </>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <NavItemLink 
                      item={item} 
                      collapsed={collapsed} 
                      isActive={checkIsActive(item.url)} 
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* AI Tools Section */}
          <SidebarGroup className="mt-4 space-y-2">
            {!collapsed && (
              <>
                <Separator className="my-2" />
                <SidebarGroupLabel className="text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.5px] px-0 pt-2 pb-2">
                  AI Tools
                </SidebarGroupLabel>
              </>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {toolsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <NavItemLink 
                      item={item} 
                      collapsed={collapsed} 
                      isActive={checkIsActive(item.url)} 
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className={cn(
          "border-t border-border/30 bg-white/50 transition-all duration-300",
          collapsed ? "px-2 py-4" : "px-6 py-4"
        )}>
          <SidebarMenu className="space-y-1">
            {settingsItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <NavItemLink 
                  item={item} 
                  collapsed={collapsed} 
                  isActive={checkIsActive(item.url)} 
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}