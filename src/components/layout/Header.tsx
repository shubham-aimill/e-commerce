import { Globe, ChevronDown, Bell, Menu, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const markets = [
  { id: "india", name: "India", flag: "🇮🇳" },
  { id: "south_africa", name: "South Africa", flag: "🇿🇦" },
  { id: "global", name: "Global", flag: "🌍" },
];

const channels = [
  "Amazon", "Flipkart", "Takealot", "Shopify", "eBay", "Magento", "WooCommerce"
];

export function Header() {
  const [uiLanguage, setUiLanguage] = useState<'en' | 'local'>('en');
  const [selectedMarket, setSelectedMarket] = useState(markets[0]);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set(channels));

  const toggleChannel = (channel: string) => {
    const newChannels = new Set(selectedChannels);
    if (newChannels.has(channel)) {
      newChannels.delete(channel);
    } else {
      newChannels.add(channel);
    }
    setSelectedChannels(newChannels);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <SidebarTrigger className="lg:hidden">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>

        <div className="flex-1" />

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Market Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-card border-border/50">
                <Globe className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">{selectedMarket.name}</span>
                <span className="sm:hidden">{selectedMarket.flag}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {markets.map((market) => (
                <DropdownMenuItem 
                  key={market.id} 
                  className="gap-2 cursor-pointer"
                  onClick={() => setSelectedMarket(market)}
                >
                  <span>{market.flag}</span>
                  <span>{market.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Language Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-card border-border/50">
                <Languages className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">{uiLanguage === 'en' ? 'EN' : 'Local'}</span>
                <span className="sm:hidden">{uiLanguage === 'en' ? 'EN' : 'Loc'}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={() => setUiLanguage('en')} 
                className={`cursor-pointer ${uiLanguage === 'en' ? 'bg-primary/10' : ''}`}
              >
                <span>English (EN)</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setUiLanguage('local')} 
                className={`cursor-pointer ${uiLanguage === 'local' ? 'bg-primary/10' : ''}`}
              >
                <span>Local Language</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Channel Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 hidden md:flex bg-card border-border/50">
                <span>Channels</span>
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{selectedChannels.size}</Badge>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {channels.map((channel) => (
                <DropdownMenuItem 
                  key={channel}
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault(); // Prevents menu from closing on selection
                    toggleChannel(channel);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedChannels.has(channel) 
                          ? 'border-primary bg-primary/20 text-primary' 
                          : 'border-border'
                      }`}
                    >
                      {selectedChannels.has(channel) && <div className="w-2 h-2 bg-primary rounded-sm" />}
                    </div>
                    <span>{channel}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => {
              // Notification click handler
            }}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
          </Button>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-primary-foreground text-sm font-medium shadow-sm ring-1 ring-border">
            A
          </div>
        </div>
      </div>
    </header>
  );
}