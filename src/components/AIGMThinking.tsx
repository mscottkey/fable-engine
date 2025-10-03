import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import gmAvatarSvg from "@/assets/gm-avatar.svg";

interface AIGMThinkingProps {
  thoughts?: string;
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

export function AIGMThinking({ thoughts, stage, className = "" }: AIGMThinkingProps) {
  const [displayedThought, setDisplayedThought] = useState("");
  const [thoughtIndex, setThoughtIndex] = useState(0);

  useEffect(() => {
    // If we have actual thoughts from the AI, display those
    if (thoughts) {
      setDisplayedThought(thoughts);
      return;
    }

    // Otherwise cycle through thinking messages
    const interval = setInterval(() => {
      setThoughtIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [thoughts]);

  useEffect(() => {
    if (!thoughts) {
      setDisplayedThought(THINKING_MESSAGES[thoughtIndex]);
    }
  }, [thoughtIndex, thoughts]);

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {/* Avatar with thinking indicator */}
      <div className="relative flex-shrink-0">
        <img
          src={gmAvatarSvg}
          alt="AI Game Master"
          className="w-16 h-16"
        />
        {/* Thinking pulse effect */}
        <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-pulse" />
        {/* Brain icon indicator */}
        <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1">
          <Brain className="w-3 h-3 text-white animate-pulse" />
        </div>
      </div>

      {/* Thought Bubble */}
      <div className="relative bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm border border-purple-500/30 rounded-lg px-4 py-3 max-w-md shadow-lg flex-1">
        {/* Thought bubble arrow */}
        <div className="absolute left-0 top-6 transform -translate-x-2">
          <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-purple-500/20" />
        </div>

        {/* Stage label if provided */}
        {stage && (
          <div className="text-xs text-purple-400 font-semibold mb-1 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            {stage}
          </div>
        )}

        {/* Thought text */}
        <p className="text-sm text-foreground/90 leading-relaxed min-h-[1.5rem]">
          {displayedThought}
        </p>

        {/* Thinking indicator dots */}
        <div className="flex gap-1 mt-2 justify-end">
          <div className="w-1.5 h-1.5 bg-purple-500/60 rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-purple-500/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1.5 h-1.5 bg-purple-500/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}
