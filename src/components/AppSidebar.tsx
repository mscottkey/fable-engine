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
        toast({ title: "Error", description: "Failed to sign out", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    }
  };

  const menuItems = [
    { title: "Adventures", icon: Home, onClick: onBackToAdventures, active: !gameStarted },
    { title: "Current Game", icon: Dice6, onClick: () => {}, active: gameStarted, disabled: !gameStarted },
  ];

  return (
    <Sidebar
      collapsible="icon"
      // Let the component control layout using CSS vars:
      // 18rem expanded (~288px), 4.25rem collapsed (68px incl. padding)
      className="group [--sidebar-width:14.5rem] [--sidebar-width-icon:4.25rem]"
    >
      <SidebarHeader className="bg-sidebar border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3 group-data-[state=collapsed]:justify-center">
          {/* Logo box: don't let it squish */}
          <div className="shrink-0 rounded-lg bg-sidebar-accent
                          size-12 group-data-[state=collapsed]:size-9">
            <img
              src={logoSvg}
              alt="RoleplAI GM Logo"
              className="h-full w-full object-contain"
            />
          </div>

          {/* Title/user only when expanded */}
          <div className="min-w-0 group-data-[state=collapsed]:hidden">
            <h2 className="truncate font-semibold text-sidebar-foreground">RoleplAI GM</h2>
            <p className="truncate text-xs text-sidebar-foreground/70">
              {user.user_metadata?.display_name || user.email}
            </p>
          </div>
        </div>

        {/* Trigger positioning for both states */}
        <div className="mt-2 flex">
          <SidebarTrigger
            className="ml-auto group-data-[state=collapsed]:mx-auto group-data-[state=collapsed]:ml-0"
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-sidebar-foreground/80">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    isActive={item.active}
                    disabled={item.disabled}
                    className={[
                      item.active
                        ? "bg-sidebar-primary/10 text-sidebar-primary border-sidebar-primary/20"
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                      item.disabled ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                    aria-label={item.title}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {open && <span className="truncate">{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-sidebar-foreground/80">
              Account
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Settings">
                  <Settings className="h-5 w-5 shrink-0" />
                  {open && <span>Settings</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-foreground text-sidebar-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {open && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
