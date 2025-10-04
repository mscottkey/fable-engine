// src/components/CampaignProgressBar.tsx
// Unified progress indicator for the entire campaign creation flow

import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface CampaignProgressBarProps {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const STEPS = [
  { id: 1, label: 'Story', shortLabel: 'Story' },
  { id: 2, label: 'Characters', shortLabel: 'Characters' },
  { id: 3, label: 'Factions', shortLabel: 'Factions' },
  { id: 4, label: 'Story Nodes', shortLabel: 'Nodes' },
  { id: 5, label: 'Campaign Arcs', shortLabel: 'Arcs' },
  { id: 6, label: 'Resolutions', shortLabel: 'Endings' },
];

export function CampaignProgressBar({ currentStep, className = '' }: CampaignProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
        {STEPS.map((step, index) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-accent text-accent-foreground ring-2 ring-primary animate-pulse'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>

                {/* Step Label */}
                <div
                  className={`mt-2 text-xs font-medium text-center ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </div>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    step.id < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Description */}
      <div className="text-center mt-4">
        <p className="text-sm text-muted-foreground">
          {STEPS.find((s) => s.id === currentStep)?.label}
          {currentStep < 6 && (
            <span className="ml-1">
              - Step {currentStep} of 6
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
