import { User } from "@supabase/supabase-js";
import { Home, Sparkles, Settings, LogOut, Dice6 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          {!open && (
            <div>
              <h2 className="font-semibold text-foreground">RoleplAI GM</h2>
              <p className="text-xs text-muted-foreground">
                {user.user_metadata?.display_name || user.email}
              </p>
            </div>
          )}
        </div>
        {!open && <SidebarTrigger className="ml-auto" />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    isActive={item.active}
                    disabled={item.disabled}
                    className={`${item.active ? "bg-primary/10 text-primary" : ""} ${
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
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="w-4 h-4" />
                  {!open && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4" />
          {!open && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}