import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Dice6, 
  Send, 
  Settings, 
  BookOpen, 
  Users, 
  Eye, 
  EyeOff,
  ScrollText,
  Sparkles,
  User
} from "lucide-react";

interface Message {
  id: string;
  role: 'player' | 'gm' | 'system';
  content: string;
  timestamp: Date;
  character?: {
    name: string;
    playerName: string;
  };
  mechanics?: {
    roll?: string;
    outcome?: 'fail' | 'tie' | 'success' | 'success-with-style';
  };
}

interface Character {
  id: string;
  playerName: string;
  characterName: string;
  concept: string;
}

interface GameInterfaceProps {
  characters?: Character[];
  gameIdea?: string;
}

export function GameInterface({ characters = [], gameIdea = "Epic Fantasy Adventure" }: GameInterfaceProps) {
  const [activeCharacter, setActiveCharacter] = useState(characters[0]?.id || '');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'gm',
      content: `Welcome to ${gameIdea}! ${characters.length > 0 ? `${characters.map(c => c.characterName).join(', ')}, you` : 'You'} find yourselves at the beginning of an epic adventure. The world awaits your choices. What do you do?`,
      timestamp: new Date()
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [showMechanics, setShowMechanics] = useState(false);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const activeChar = characters.find(c => c.id === activeCharacter);
    const characterName = activeChar ? activeChar.characterName : 'Unknown';
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'player',
      content: inputValue,
      timestamp: new Date(),
      character: activeChar ? { name: characterName, playerName: activeChar.playerName } : undefined
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    
    // Simulate GM response
    setTimeout(() => {
      const gmResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'gm',
        content: `The world responds to ${characterName}'s actions. A new challenge emerges, testing your resolve and creativity. The story continues to unfold based on your choices. What happens next?`,
        timestamp: new Date(),
        mechanics: showMechanics ? {
          roll: '4dF+2 vs Difficulty 2',
          outcome: 'success'
        } : undefined
      };
      setMessages(prev => [...prev, gmResponse]);
    }, 1500);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'gm': return <Sparkles className="w-4 h-4 text-primary" />;
      case 'player': return <User className="w-4 h-4 text-accent" />;
      default: return <ScrollText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const quickSuggestions = [
    "I search for clues",
    "I approach carefully", 
    "I use my abilities",
    "I talk to someone"
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Dice6 className="w-8 h-8 text-primary" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {gameIdea}
                </h1>
                <p className="text-sm text-muted-foreground">Story First, Rules Invisible</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMechanics(!showMechanics)}
                className="gap-2"
              >
                {showMechanics ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showMechanics ? 'Hide Mechanics' : 'Show Mechanics'}
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Story Notes</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Characters
                          </h4>
                          {characters.length > 0 ? characters.map((character) => (
                             <div key={character.id} className="p-3 bg-card/50 rounded-lg border border-border mb-2">
                               <div className="font-medium">{character.characterName}</div>
                               <div className="text-sm text-muted-foreground">{character.concept}</div>
                               <div className="text-xs text-muted-foreground">Player: {character.playerName}</div>
                             </div>
                          )) : (
                            <div className="text-sm text-muted-foreground">No characters set up</div>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Story Elements
                          </h4>
                          <div className="space-y-2">
                            <Badge variant="outline">Adventure Beginning</Badge>
                            <Badge variant="outline">Character Actions</Badge>
                            <Badge variant="outline">World Building</Badge>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Game Settings</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Ruleset</span>
                              <Badge>Fate Core</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Mechanics Visibility</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowMechanics(!showMechanics)}
                              >
                                {showMechanics ? 'On' : 'Off'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div key={message.id} className="message-fade-in">
                <Card className={`p-4 ${
                  message.role === 'gm' 
                    ? 'bg-card/70 border-primary/20' 
                    : message.role === 'player'
                    ? 'bg-accent/10 border-accent/20 ml-12'
                    : 'bg-muted/30 border-muted/40'
                }`}>
                  <div className="flex items-start gap-3">
                    {getMessageIcon(message.role)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium capitalize">
                          {message.role === 'gm' ? 'Game Master' : 
                           message.character ? `${message.character.name} (${message.character.playerName})` : 
                           'Player'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {showMechanics && message.mechanics && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-md">
                          <div className="text-xs text-muted-foreground">
                            Roll: {message.mechanics.roll} → {message.mechanics.outcome}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            {characters.length > 0 && (
              <div className="mb-3">
                <Label className="text-sm text-muted-foreground mb-2 block">Acting as:</Label>
                <div className="flex gap-2 flex-wrap">
                  {characters.map((character) => (
                    <Button
                      key={character.id}
                      variant={activeCharacter === character.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCharacter(character.id)}
                      className="text-xs"
                    >
                      <User className="w-3 h-3 mr-1" />
                      {character.characterName}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder={characters.length > 0 && activeCharacter ? 
                  `What does ${characters.find(c => c.id === activeCharacter)?.characterName} do?` : 
                  "Describe what you want to do..."
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} variant="crimson">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mt-2 flex gap-2 flex-wrap">
              {quickSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ethereal"
                  size="sm"
                  onClick={() => setInputValue(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}