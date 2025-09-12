import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, SkipForward, HelpCircle, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  selector?: string; // CSS selector for element to highlight
  position?: "top" | "bottom" | "left" | "right" | "center";
  page?: string; // Which page this step should show on
  mobileSelector?: string; // Alternative selector for mobile
  action?: () => void; // Optional action to perform
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete?: () => void;
  storageKey?: string;
}

export function TutorialOverlay({ steps, onComplete, storageKey = "tutorial_completed" }: TutorialOverlayProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [location] = useLocation();
  const isMobile = window.innerWidth < 768;

  // Check if tutorial should show
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(storageKey);
    const isNewUser = !hasSeenTutorial;
    
    if (isNewUser) {
      // Small delay to let page render
      setTimeout(() => setIsActive(true), 1000);
    }
  }, [storageKey]);

  // Update highlight when step changes
  useEffect(() => {
    if (!isActive || !steps[currentStep]) return;

    const step = steps[currentStep];
    const selector = isMobile && step.mobileSelector ? step.mobileSelector : step.selector;
    
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep, isActive, steps, isMobile]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Check if next step requires navigation
      const nextStep = steps[currentStep + 1];
      if (nextStep.page && nextStep.page !== location) {
        // Navigate to the page first
        window.location.href = nextStep.page;
      }
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  const completeTutorial = () => {
    localStorage.setItem(storageKey, "true");
    setIsActive(false);
    if (onComplete) onComplete();
  };

  const restartTutorial = () => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    // Show help button to restart tutorial
    return (
      <Button
        onClick={restartTutorial}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        size="sm"
        data-testid="button-tutorial-help"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help Tour
      </Button>
    );
  }

  const step = steps[currentStep];
  if (!step) return null;

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!highlightRect || !step.position || step.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    const padding = 20;
    const positions: any = {
      top: {
        bottom: `${window.innerHeight - highlightRect.top + padding}px`,
        left: `${highlightRect.left + highlightRect.width / 2}px`,
        transform: "translateX(-50%)"
      },
      bottom: {
        top: `${highlightRect.bottom + padding}px`,
        left: `${highlightRect.left + highlightRect.width / 2}px`,
        transform: "translateX(-50%)"
      },
      left: {
        top: `${highlightRect.top + highlightRect.height / 2}px`,
        right: `${window.innerWidth - highlightRect.left + padding}px`,
        transform: "translateY(-50%)"
      },
      right: {
        top: `${highlightRect.top + highlightRect.height / 2}px`,
        left: `${highlightRect.right + padding}px`,
        transform: "translateY(-50%)"
      }
    };

    return positions[step.position] || positions.bottom;
  };

  return (
    <div className="tutorial-overlay">
      {/* Dark overlay with highlight cutout */}
      <div 
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{ 
          background: "rgba(0, 20, 50, 0.85)",
          backdropFilter: "blur(2px)"
        }}
      >
        {highlightRect && (
          <>
            {/* Highlight border animation */}
            <div
              className="absolute pointer-events-none animate-pulse"
              style={{
                top: highlightRect.top - 4,
                left: highlightRect.left - 4,
                width: highlightRect.width + 8,
                height: highlightRect.height + 8,
                border: "3px solid #3b82f6",
                borderRadius: "8px",
                boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.4)"
              }}
            />
            {/* Clear area for highlighted element */}
            <div
              className="absolute pointer-events-auto"
              style={{
                top: highlightRect.top,
                left: highlightRect.left,
                width: highlightRect.width,
                height: highlightRect.height,
                background: "transparent",
                boxShadow: `
                  0 0 0 9999px rgba(0, 20, 50, 0.85),
                  inset 0 0 10px rgba(59, 130, 246, 0.2)
                `,
                borderRadius: "4px"
              }}
            />
          </>
        )}
      </div>

      {/* Tutorial Card */}
      <Card 
        className="fixed z-[9999] bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-2xl max-w-md w-[90%] md:w-96"
        style={getTooltipPosition()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                {currentStep + 1}
              </div>
              <span className="text-sm text-blue-600 font-medium">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-900">{step.title}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
          </div>

          {/* Progress bar */}
          <div className="mt-4 mb-4">
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Skip Tour
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}