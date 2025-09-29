import { User } from "@supabase/supabase-js";
import { Home, Settings, LogOut, Dice6 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoSvg from "@/assets/logo.svg";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  user: User;
  onBackToAdventures: () => void;
  gameStarted: boolean;
}

export function AppSidebar({ user, onBackToAdventures, gameStarted }: AppSidebarProps) {
  const { open } = useSidebar();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    {
      title: "Adventures",
      icon: Home,
      onClick: onBackToAdventures,
      active: !gameStarted,
    },
    {
      title: "Current Game",
      icon: Dice6,
      onClick: () => {},
      active: gameStarted,
      disabled: !gameStarted,
    },
  ];

  return (
    <Sidebar className={open ? "w-64" : "w-16"}>
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-sidebar-accent">
            <img src={logoSvg} alt="RoleplAI GM Logo" className="w-full h-full object-contain" />
          </div>
          {!open && (
            <div>
              <h2 className="font-semibold text-sidebar-foreground">RoleplAI GM</h2>
              <p className="text-xs text-sidebar-foreground/70">
                {user.user_metadata?.display_name || user.email}
              </p>
            </div>
          )}
        </div>
        {!open && <SidebarTrigger className="ml-auto" />}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    isActive={item.active}
                    disabled={item.disabled}
                    className={`${item.active ? "bg-sidebar-primary/10 text-sidebar-primary border-sidebar-primary/20" : "text-sidebar-foreground hover:bg-sidebar-accent"} ${
                      item.disabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {!open && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/80">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <Settings className="w-4 h-4" />
                  {!open && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="w-4 h-4" />
          {!open && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}