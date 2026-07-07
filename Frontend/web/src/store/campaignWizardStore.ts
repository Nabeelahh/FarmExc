import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CampaignFormData, MilestoneConfig } from '@/types/campaign';

type WizardStep = 
  | 'basic-info'
  | 'financial-terms'
  | 'timeline'
  | 'milestone-definition'
  | 'verification-setup'
  | 'review-submit';

interface CampaignWizardState {
  currentStep: WizardStep;
  formData: CampaignFormData;
  stepValidation: Record<WizardStep, boolean>;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  
  // Actions
  setCurrentStep: (step: WizardStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateFormData: (data: Partial<CampaignFormData>) => void;
  updateBasicInfo: (data: Partial<CampaignFormData>) => void;
  updateFinancialTerms: (data: Partial<CampaignFormData>) => void;
  updateTimeline: (data: Partial<CampaignFormData>) => void;
  addMilestone: (milestone: MilestoneConfig) => void;
  updateMilestone: (index: number, milestone: Partial<MilestoneConfig>) => void;
  removeMilestone: (index: number) => void;
  updateVerificationSetup: (data: Partial<CampaignFormData>) => void;
  setStepValidation: (step: WizardStep, isValid: boolean) => void;
  setAutoSaving: (isSaving: boolean) => void;
  setLastSaved: (date: Date) => void;
  resetWizard: () => void;
  canProceed: () => boolean;
}

const initialFormData: CampaignFormData = {
  // Basic Info
  name: '',
  description: '',
  cropType: '',
  location: {
    latitude: 0,
    longitude: 0,
    address: '',
  },
  farmSize: 0,
  farmSizeUnit: 'hectares',

  // Financial Terms
  targetAmount: '',
  assetType: 'USDC',
  roiStructure: 'fixed_return',
  fixedReturnPercentage: 0,
  revenueSharePercentage: 0,

  // Timeline
  startDate: new Date(),
  expectedHarvestDate: new Date(),
  milestoneWindows: [],

  // Milestones
  milestones: [],

  // Verification Setup
  agentRequirements: {
    minStakeAmount: '',
    requiredAgentCount: 1,
    multiSigRequired: false,
    multiSigThreshold: 2,
  },

  // Metadata
  status: 'draft',
  lastSaved: undefined,
};

const stepOrder: WizardStep[] = [
  'basic-info',
  'financial-terms',
  'timeline',
  'milestone-definition',
  'verification-setup',
  'review-submit',
];

export const useCampaignWizardStore = create<CampaignWizardState>()(
  persist(
    (set, get) => ({
      currentStep: 'basic-info',
      formData: initialFormData,
      stepValidation: {
        'basic-info': false,
        'financial-terms': false,
        'timeline': false,
        'milestone-definition': false,
        'verification-setup': false,
        'review-submit': false,
      },
      isAutoSaving: false,
      lastSaved: null,

      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
          set({ currentStep: stepOrder[currentIndex + 1] });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: stepOrder[currentIndex - 1] });
        }
      },

      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      updateBasicInfo: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      updateFinancialTerms: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      updateTimeline: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      addMilestone: (milestone) =>
        set((state) => ({
          formData: {
            ...state.formData,
            milestones: [...state.formData.milestones, milestone],
          },
        })),

      updateMilestone: (index, milestone) =>
        set((state) => ({
          formData: {
            ...state.formData,
            milestones: state.formData.milestones.map((m, i) =>
              i === index ? { ...m, ...milestone } : m
            ),
          },
        })),

      removeMilestone: (index) =>
        set((state) => ({
          formData: {
            ...state.formData,
            milestones: state.formData.milestones.filter((_, i) => i !== index),
          },
        })),

      updateVerificationSetup: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      setStepValidation: (step, isValid) =>
        set((state) => ({
          stepValidation: { ...state.stepValidation, [step]: isValid },
        })),

      setAutoSaving: (isSaving) => set({ isAutoSaving: isSaving }),

      setLastSaved: (date) => set({ lastSaved: date }),

      resetWizard: () =>
        set({
          currentStep: 'basic-info',
          formData: initialFormData,
          stepValidation: {
            'basic-info': false,
            'financial-terms': false,
            'timeline': false,
            'milestone-definition': false,
            'verification-setup': false,
            'review-submit': false,
          },
          isAutoSaving: false,
          lastSaved: null,
        }),

      canProceed: () => {
        const { currentStep, stepValidation } = get();
        return stepValidation[currentStep];
      },
    }),
    {
      name: 'campaign-wizard-storage',
      partialize: (state) => ({
        formData: state.formData,
        currentStep: state.currentStep,
        stepValidation: state.stepValidation,
        lastSaved: state.lastSaved,
      }),
    }
  )
);
