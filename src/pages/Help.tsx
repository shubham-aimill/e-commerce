import { HelpCircle, Book, MessageCircle, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Help() {
  const helpItems = [
    { 
      icon: Book, 
      title: "Documentation", 
      description: "Read our comprehensive guides",
      action: "Browse Docs",
      gradient: "from-primary/10 to-primary/5",
      borderColor: "border-primary/20"
    },
    { 
      icon: MessageCircle, 
      title: "Live Chat", 
      description: "Chat with our support team",
      action: "Start Chat",
      gradient: "from-info/10 to-info/5",
      borderColor: "border-info/20"
    },
    { 
      icon: Mail, 
      title: "Email Support", 
      description: "Get help via email",
      action: "Send Email",
      gradient: "from-success/10 to-success/5",
      borderColor: "border-success/20"
    },
    { 
      icon: HelpCircle, 
      title: "FAQs", 
      description: "Frequently asked questions",
      action: "View FAQs",
      gradient: "from-warning/10 to-warning/5",
      borderColor: "border-warning/20"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="p-4 lg:p-8 space-y-8 max-w-[1200px] mx-auto">
        {/* Enhanced Header */}
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Help & Support
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Get help with the Content Intelligence Platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          {helpItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={cn(
                  "rounded-xl p-6 lg:p-8 border-2 text-center",
                  `bg-gradient-to-br ${item.gradient}`,
                  `border-${item.borderColor}`,
                  "shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer",
                  "animate-fade-in"
                )}
                style={{ 
                  animationDelay: `${index * 100}ms`, 
                  animationFillMode: 'forwards',
                  animationDuration: '400ms'
                }}
              >
                <div className={cn(
                  "w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-6",
                  `bg-gradient-to-br ${item.gradient} border-2 ${item.borderColor}`
                )}>
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{item.description}</p>
                <Button variant="outline" size="sm" className="gap-2 h-10 font-semibold hover:bg-background transition-colors">
                  {item.action}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
