import { useState, useEffect } from "react";
import { Genre } from "@/data/genres";
import { getRandomQuote } from "@/data/gm-quotes";
import gmAvatarSvg from "@/assets/gm-avatar.svg";

interface AIGMAvatarProps {
  genre?: Genre | 'generic';
  className?: string;
}

export function AIGMAvatar({ genre = 'generic', className = "" }: AIGMAvatarProps) {
  const [currentQuote, setCurrentQuote] = useState("");

  useEffect(() => {
    setCurrentQuote(getRandomQuote(genre));
  }, [genre]);

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Avatar */}
      <div className="relative">
        <img 
          src={gmAvatarSvg} 
          alt="AI Game Master" 
          className="w-16 h-16 animate-pulse"
        />
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Speech Bubble */}
      <div className="relative bg-card/90 backdrop-blur-sm border border-primary/20 rounded-lg px-4 py-3 max-w-xs shadow-lg">
        {/* Speech bubble arrow */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2">
          <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-card/90" />
        </div>
        
        {/* Quote text */}
        <p className="text-sm text-foreground/80 italic leading-relaxed">
          {currentQuote}
        </p>
        
        {/* Typing indicator dots */}
        <div className="flex gap-1 mt-2 justify-end">
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}