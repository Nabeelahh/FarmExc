import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from './stepper';
import { AutoSaveIndicator } from './auto-save-indicator';
import { BasicInfoStep } from './steps/basic-info-step';
import { FinancialTermsStep } from './steps/financial-terms-step';
import { TimelineStep } from './steps/timeline-step';
import { MilestoneDefinitionStep } from './steps/milestone-definition-step';
import { VerificationSetupStep } from './steps/verification-setup-step';
import { ReviewSubmitStep } from './steps/review-submit-step';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';

const wizardSteps = [
  { id: 'basic-info', label: 'Basic Info', description: 'Campaign details' },
  { id: 'financial-terms', label: 'Financial Terms', description: 'Funding & ROI' },
  { id: 'timeline', label: 'Timeline', description: 'Dates & schedule' },
  { id: 'milestone-definition', label: 'Milestones', description: 'Verification points' },
  { id: 'verification-setup', label: 'Verification', description: 'Agent requirements' },
  { id: 'review-submit', label: 'Review', description: 'Submit campaign' },
];

export function CampaignWizard() {
  const {
    currentStep,
    stepValidation,
    nextStep,
    previousStep,
    setCurrentStep,
    canProceed,
    setAutoSaving,
    setLastSaved,
    formData,
  } = useCampaignWizardStore();

  const currentStepIndex = wizardSteps.findIndex((step) => step.id === currentStep);
  const completedSteps = wizardSteps
    .slice(0, currentStepIndex)
    .map((_, index) => index)
    .filter((index) => stepValidation[wizardSteps[index].id as keyof typeof stepValidation]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      setAutoSaving(true);
      // Simulate auto-save - in production, this would call an API
      setTimeout(() => {
        setAutoSaving(false);
        setLastSaved(new Date());
      }, 1000);
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [formData, setAutoSaving, setLastSaved]);

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex < currentStepIndex || stepValidation[wizardSteps[stepIndex].id as keyof typeof stepValidation]) {
      setCurrentStep(wizardSteps[stepIndex].id as any);
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      nextStep();
    }
  };

  const handlePrevious = () => {
    previousStep();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'basic-info':
        return <BasicInfoStep />;
      case 'financial-terms':
        return <FinancialTermsStep />;
      case 'timeline':
        return <TimelineStep />;
      case 'milestone-definition':
        return <MilestoneDefinitionStep />;
      case 'verification-setup':
        return <VerificationSetupStep />;
      case 'review-submit':
        return <ReviewSubmitStep />;
      default:
        return <BasicInfoStep />;
    }
  };

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === wizardSteps.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Campaign</h1>
          <p className="text-muted-foreground">
            Follow the steps to create and deploy your agricultural funding campaign on the Soroban blockchain.
          </p>
        </div>

        {/* Auto-save indicator */}
        <div className="mb-6 flex justify-end">
          <AutoSaveIndicator
            isSaving={useCampaignWizardStore.getState().isAutoSaving}
            lastSaved={useCampaignWizardStore.getState().lastSaved}
          />
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper
            steps={wizardSteps}
            currentStep={currentStepIndex}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'review-submit' && (
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              {isLastStep ? 'Review' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
