import { 
  LayoutDashboard, 
  AlertTriangle, 
  Camera, 
  FileText, 
  MessageSquare,
  Palette,
  Settings,
  HelpCircle,
  Globe,
  ChevronRight
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

const mainNavItems = [
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
    description: "Content quality detection"
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

const toolsItems = [
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

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar 
      className="border-r border-border/50 bg-sidebar"
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sand-500 to-sand-600 flex items-center justify-center shadow-lg">
            <Globe className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-sm">Content Intel</span>
              <span className="text-xs text-muted-foreground">Global Platform</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-2">
            {!collapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "hover:bg-accent/80",
                        isActive(item.url) && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive(item.url) ? "text-primary" : "text-muted-foreground"
                      )} />
                      {!collapsed && (
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                      {!collapsed && isActive(item.url) && (
                        <ChevronRight className="w-4 h-4 text-primary" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2 py-2">
            {!collapsed && "AI Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "hover:bg-accent/80",
                        isActive(item.url) && "bg-ai/10 text-ai font-medium"
                      )}
                    >
                      <item.icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive(item.url) ? "text-ai" : "text-muted-foreground"
                      )} />
                      {!collapsed && (
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm truncate">{item.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/50">
        <SidebarMenu>
          {settingsItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink 
                  to={item.url}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    "hover:bg-accent/80 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
