import { useState, useEffect } from "react";
import { Brain, ChevronDown } from "lucide-react";
import gmAvatarSvg from "@/assets/gm-avatar.svg";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AIGMThinkingProps {
  thoughts?: string; // Legacy: single thought string
  thoughtsStream?: string[]; // New: array of streaming thoughts
  stage?: string;
  className?: string;
}

const THINKING_MESSAGES = [
  "Analyzing character dynamics...",
  "Weaving character bonds...",
  "Balancing party composition...",
  "Crafting unique backstories...",
  "Ensuring mechanical diversity...",
  "Building narrative hooks...",
  "Considering story connections...",
  "Optimizing skill coverage...",
];

export function AIGMThinking({ thoughts, thoughtsStream, stage, className = "" }: AIGMThinkingProps) {
  const [displayedThought, setDisplayedThought] = useState("");
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    // Priority 1: Use latest thought from stream
    if (thoughtsStream && thoughtsStream.length > 0) {
      const latestThought = thoughtsStream[thoughtsStream.length - 1];
      setDisplayedThought(latestThought);
      return;
    }

    // Priority 2: Use single thought if provided
    if (thoughts) {
      setDisplayedThought(thoughts);
      return;
    }

    // Priority 3: Fallback to cycling messages
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [thoughts, thoughtsStream]);

  useEffect(() => {
    if (!thoughts && !thoughtsStream) {
      setDisplayedThought(THINKING_MESSAGES[thoughtIndex]);
    }
  }, [thoughtIndex, thoughts, thoughtsStream]);

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Avatar with thinking indicator - matches AIGMAvatar style */}
      <div className="relative flex-shrink-0">
        <img
          src={gmAvatarSvg}
          alt="AI Game Master"
          className="w-16 h-16 animate-pulse"
        />
        {/* Thinking pulse effect - uses primary color like AIGMAvatar */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
        {/* Brain icon indicator */}
        <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
          <Brain className="w-3 h-3 text-primary-foreground animate-pulse" />
        </div>
      </div>

      {/* Thought Bubble - matches AIGMAvatar speech bubble style */}
      <div className="relative bg-card/90 backdrop-blur-sm border border-primary/20 rounded-lg px-4 py-3 max-w-md shadow-lg flex-1">
        {/* Thought bubble arrow */}
        <div className="absolute left-0 top-6 transform -translate-x-2">
          <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-card/90" />
        </div>

        {/* Stage label if provided */}
        {stage && (
          <div className="text-xs text-primary font-semibold mb-1 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {stage}
          </div>
        )}

        {/* Thought text - italic like AIGMAvatar quotes */}
        <p className="text-sm text-foreground/80 italic leading-relaxed min-h-[1.5rem]">
          {displayedThought}
        </p>

        {/* Thought history - collapsible if we have streaming thoughts */}
        {thoughtsStream && thoughtsStream.length > 1 && (
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen} className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className={`w-3 h-3 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
              <span>Previous thoughts ({thoughtsStream.length - 1})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {thoughtsStream.slice(0, -1).reverse().map((thought, idx) => (
                <div key={idx} className="text-xs text-muted-foreground/70 italic border-l-2 border-primary/20 pl-2">
                  {thought}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Thinking indicator dots - matches AIGMAvatar style */}
        <div className="flex gap-1 mt-2 justify-end">
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}
