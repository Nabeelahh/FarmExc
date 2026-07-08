export interface MilestoneConfig {
  id?: string;
  name: string;
  description: string;
  targetDate: Date;
  verificationType: 'single_agent' | 'multi_party' | 'satellite_cross_check';
  requiredAgentCount?: number;
  stakingRequirement?: string;
  releasePercentage: number;
  evidenceRequirements: {
    photos: boolean;
    gps: boolean;
    satelliteCrossCheck: boolean;
  };
  bufferDays: number;
}

export interface CampaignFormData {
  // Basic Info
  name: string;
  description: string;
  cropType: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  farmSize: number;
  farmSizeUnit: 'hectares' | 'acres';

  // Financial Terms
  targetAmount: string;
  assetType: 'USDC' | 'XLM';
  roiStructure: 'fixed_return' | 'revenue_share';
  fixedReturnPercentage?: number;
  revenueSharePercentage?: number;

  // Timeline
  startDate: Date;
  expectedHarvestDate: Date;
  milestoneWindows: {
    startDate: Date;
    endDate: Date;
    bufferDays: number;
  }[];

  // Milestones
  milestones: MilestoneConfig[];

  // Verification Setup
  agentRequirements: {
    minStakeAmount: string;
    requiredAgentCount: number;
    multiSigRequired: boolean;
    multiSigThreshold?: number;
  };

  // Metadata
  status: 'draft' | 'submitted' | 'deployed';
  lastSaved?: Date;
}
