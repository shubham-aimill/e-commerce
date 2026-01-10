import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/5">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}