import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Zap } from "lucide-react";
import heroImage from "@/assets/hero-bg-red.png";

interface LandingPageProps {
  onShowAuth: () => void;
}

export function LandingPage({ onShowAuth }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <img src="/logo.png" alt="The Narrator AI" className="w-8 h-8 mr-2" />
                <h1 className="text-xl font-bold text-primary">RoleplAI GM</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onShowAuth}>
                Sign In
              </Button>
              <Button variant="crimson" onClick={onShowAuth}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="AI Gamemaster"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/70" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="max-w-3xl">
            <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6">
              Your AI
              <span className="text-primary block">Gamemaster</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Experience immersive tabletop RPGs powered by AI. Story first, rules invisible. 
              Just describe what you want to do and watch your adventure unfold.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="crimson" onClick={onShowAuth} className="text-lg px-8">
                Start Your Adventure
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Why RoleplAI GM?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The perfect blend of storytelling freedom and intelligent game management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">Instant Play</h3>
              <p className="text-muted-foreground leading-relaxed">
                No prep time needed. Tell us your story idea and we'll create a world, 
                characters, and adventure hooks in seconds.
              </p>
            </div>

            <div className="text-center p-8 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">Story Focus</h3>
              <p className="text-muted-foreground leading-relaxed">
                Describe your actions naturally. Our AI handles the mechanics invisibly, 
                keeping you immersed in the narrative.
              </p>
            </div>

            <div className="text-center p-8 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">Smart Rules</h3>
              <p className="text-muted-foreground leading-relaxed">
                Powered by proven tabletop systems like Fate Core. Rules work behind 
                the scenes to ensure fair, engaging gameplay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of players already exploring infinite worlds with their AI gamemaster.
          </p>
          <Button size="lg" variant="crimson" onClick={onShowAuth} className="text-lg px-12">
            Create Account
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">RoleplAI GM</h3>
            <p className="text-muted-foreground">
              The future of tabletop role-playing games
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}