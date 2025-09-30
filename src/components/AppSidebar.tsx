import { User } from "@supabase/supabase-js";
import { Home, Settings, LogOut, Dice6, Plus, Clock, RefreshCw, AlertCircle, CheckCircle, Loader2, Play, Pause } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoSvg from "@/assets/logo.svg";
import { useToast } from "@/hooks/use-toast";
import { getUserGames } from "@/services/campaignService";
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
  onSelectGame?: (gameId: string) => void;
  onResumeSeed?: (seedId: string) => void;
  gameStarted: boolean;
  currentGameId?: string | null;
}

export function AppSidebar({ user, onBackToAdventures, onSelectGame, onResumeSeed, gameStarted, currentGameId }: AppSidebarProps) {
  const { open } = useSidebar();
  const { toast } = useToast();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const userGames = await getUserGames();
      setGames(userGames || []);
    } catch (error) {
      console.error('Failed to load games:', error);
      toast({
        title: "Error",
        description: "Failed to load your games",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleGameSelect = (gameId: string) => {
    if (onSelectGame) {
      onSelectGame(gameId);
    }
  };

  const formatGameDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getStatusInfo = (game: any) => {
    if (game.type === 'game') {
      return {
        icon: Play,
        label: 'Playing',
        color: 'text-accent',
        bgColor: 'bg-accent/20',
        description: 'Ready to play'
      };
    }

    switch (game.status) {
      case 'seed_created':
        return {
          icon: Pause,
          label: 'Setup',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/40',
          description: 'Ready to generate story'
        };
      case 'story_generating':
        return {
          icon: Loader2,
          label: 'Building',
          color: 'text-primary',
          bgColor: 'bg-primary/20',
          description: 'Creating story...',
          animate: 'animate-spin'
        };
      case 'story_generated':
        return {
          icon: CheckCircle,
          label: 'Review',
          color: 'text-accent',
          bgColor: 'bg-accent/20',
          description: 'Story ready for review'
        };
      case 'story_failed':
        return {
          icon: AlertCircle,
          label: 'Failed',
          color: 'text-destructive',
          bgColor: 'bg-destructive/20',
          description: 'Generation failed'
        };
      default:
        return {
          icon: Dice6,
          label: 'Unknown',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/20',
          description: 'Unknown status'
        };
    }
  };

  const handleItemSelect = (game: any) => {
    if (game.type === 'game') {
      handleGameSelect(game.id);
    } else {
      // For seeds, resume the story building process
      if (onResumeSeed) {
        onResumeSeed(game.id);
      }
    }
  };

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
        {/* Navigation */}
        <SidebarGroup>
          {open && (
            <SidebarGroupLabel className="text-sidebar-foreground/80">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onBackToAdventures}
                  isActive={!gameStarted}
                  className={
                    !gameStarted
                      ? "bg-sidebar-primary/10 text-sidebar-primary border-sidebar-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }
                  aria-label="Create New Adventure"
                >
                  <Plus className="h-5 w-5 shrink-0" />
                  {open && <span className="truncate">New Adventure</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Games */}
        <SidebarGroup>
          <div className="flex items-center justify-between">
            {open && (
              <SidebarGroupLabel className="text-sidebar-foreground/80">
                Your Games
              </SidebarGroupLabel>
            )}
            {open && (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadGames}
                disabled={loading}
                className="h-6 w-6 p-0 hover:bg-sidebar-accent"
                aria-label="Refresh games"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled className="text-sidebar-foreground/50">
                    <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
                    {open && <span>Loading...</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : games.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton disabled className="text-sidebar-foreground/50">
                    <Dice6 className="h-5 w-5 shrink-0" />
                    {open && <span>No games yet</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                games.map((game) => {
                  const statusInfo = getStatusInfo(game);
                  const StatusIcon = statusInfo.icon;
                  const isActive = game.type === 'game' ? currentGameId === game.id : false;
                  
                  return (
                    <SidebarMenuItem key={`${game.type}-${game.id}`}>
                      <SidebarMenuButton
                        onClick={() => handleItemSelect(game)}
                        isActive={isActive}
                        className={
                          isActive
                            ? "bg-sidebar-primary/10 text-sidebar-primary border-sidebar-primary/20"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        }
                        aria-label={`${statusInfo.label}: ${game.name}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <StatusIcon className={`h-4 w-4 shrink-0 ${statusInfo.color} ${statusInfo.animate || ''}`} />
                          {open && (
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-medium text-sm">{game.name}</span>
                                <span className={`text-xs px-2 py-1 rounded-md font-medium ${statusInfo.color} ${statusInfo.bgColor} border border-current/20`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {formatGameDate(game.created_at)}
                              </div>
                            </div>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Settings */}
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
