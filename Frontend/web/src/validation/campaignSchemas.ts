import { z } from 'zod';

// Basic Info Schema
export const basicInfoSchema = z.object({
  name: z.string()
    .min(3, 'Campaign name must be at least 3 characters')
    .max(100, 'Campaign name must not exceed 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  cropType: z.string()
    .min(2, 'Crop type is required')
    .max(50, 'Crop type must not exceed 50 characters'),
  location: z.object({
    latitude: z.number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    address: z.string()
      .min(5, 'Address must be at least 5 characters')
      .max(200, 'Address must not exceed 200 characters'),
  }),
  farmSize: z.number()
    .min(0.1, 'Farm size must be at least 0.1')
    .max(10000, 'Farm size must not exceed 10000'),
  farmSizeUnit: z.enum(['hectares', 'acres']),
});

// Financial Terms Schema
export const financialTermsSchema = z.object({
  targetAmount: z.string()
    .min(1, 'Target amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Target amount must be a positive number',
    }),
  assetType: z.enum(['USDC', 'XLM']),
  roiStructure: z.enum(['fixed_return', 'revenue_share']),
  fixedReturnPercentage: z.number()
    .min(0, 'Fixed return percentage must be at least 0')
    .max(100, 'Fixed return percentage must not exceed 100')
    .optional(),
  revenueSharePercentage: z.number()
    .min(0, 'Revenue share percentage must be at least 0')
    .max(100, 'Revenue share percentage must not exceed 100')
    .optional(),
}).refine((data) => {
  if (data.roiStructure === 'fixed_return') {
    return data.fixedReturnPercentage !== undefined && data.fixedReturnPercentage > 0;
  }
  if (data.roiStructure === 'revenue_share') {
    return data.revenueSharePercentage !== undefined && data.revenueSharePercentage > 0;
  }
  return true;
}, {
  message: 'ROI percentage is required based on the selected structure',
  path: ['roiStructure'],
});

// Timeline Schema
export const timelineSchema = z.object({
  startDate: z.date()
    .min(new Date(), 'Start date must be in the future'),
  expectedHarvestDate: z.date()
    .min(new Date(), 'Harvest date must be in the future'),
  milestoneWindows: z.array(z.object({
    startDate: z.date(),
    endDate: z.date(),
    bufferDays: z.number()
      .min(0, 'Buffer days must be at least 0')
      .max(30, 'Buffer days must not exceed 30'),
  })).optional(),
}).refine((data) => {
  return data.expectedHarvestDate > data.startDate;
}, {
  message: 'Harvest date must be after start date',
  path: ['expectedHarvestDate'],
});

// Milestone Schema
export const milestoneSchema = z.object({
  id: z.string().optional(),
  name: z.string()
    .min(3, 'Milestone name must be at least 3 characters')
    .max(100, 'Milestone name must not exceed 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  targetDate: z.date()
    .min(new Date(), 'Target date must be in the future'),
  verificationType: z.enum(['single_agent', 'multi_party', 'satellite_cross_check']),
  requiredAgentCount: z.number()
    .min(1, 'Required agent count must be at least 1')
    .max(10, 'Required agent count must not exceed 10')
    .optional(),
  stakingRequirement: z.string()
    .min(1, 'Staking requirement is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: 'Staking requirement must be a valid number',
    })
    .optional(),
  releasePercentage: z.number()
    .min(1, 'Release percentage must be at least 1')
    .max(100, 'Release percentage must not exceed 100'),
  evidenceRequirements: z.object({
    photos: z.boolean(),
    gps: z.boolean(),
    satelliteCrossCheck: z.boolean(),
  }),
  bufferDays: z.number()
    .min(0, 'Buffer days must be at least 0')
    .max(30, 'Buffer days must not exceed 30'),
});

// Milestone Definition Schema
export const milestoneDefinitionSchema = z.object({
  milestones: z.array(milestoneSchema)
    .min(3, 'At least 3 milestones are required')
    .max(6, 'Maximum 6 milestones allowed')
    .refine((milestones) => {
      const totalPercentage = milestones.reduce((sum, m) => sum + m.releasePercentage, 0);
      return Math.abs(totalPercentage - 100) < 0.01;
    }, {
      message: 'Total release percentage must equal 100%',
    }),
});

// Verification Setup Schema
export const verificationSetupSchema = z.object({
  agentRequirements: z.object({
    minStakeAmount: z.string()
      .min(1, 'Minimum stake amount is required')
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: 'Minimum stake amount must be a positive number',
      }),
    requiredAgentCount: z.number()
      .min(1, 'Required agent count must be at least 1')
      .max(10, 'Required agent count must not exceed 10'),
    multiSigRequired: z.boolean(),
    multiSigThreshold: z.number()
      .min(2, 'Multi-sig threshold must be at least 2')
      .max(10, 'Multi-sig threshold must not exceed 10')
      .optional(),
  }).refine((data) => {
    if (data.multiSigRequired) {
      return data.multiSigThreshold !== undefined && 
             data.multiSigThreshold <= data.requiredAgentCount;
    }
    return true;
  }, {
    message: 'Multi-sig threshold must not exceed required agent count',
    path: ['multiSigThreshold'],
  }),
});

// Complete Campaign Schema
export const campaignFormSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  cropType: z.string().min(2).max(50),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(5).max(200),
  }),
  farmSize: z.number().min(0.1).max(10000),
  farmSizeUnit: z.enum(['hectares', 'acres']),
  targetAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0),
  assetType: z.enum(['USDC', 'XLM']),
  roiStructure: z.enum(['fixed_return', 'revenue_share']),
  fixedReturnPercentage: z.number().min(0).max(100).optional(),
  revenueSharePercentage: z.number().min(0).max(100).optional(),
  startDate: z.date().min(new Date()),
  expectedHarvestDate: z.date().min(new Date()),
  milestoneWindows: z.array(z.object({
    startDate: z.date(),
    endDate: z.date(),
    bufferDays: z.number().min(0).max(30),
  })).optional(),
  milestones: z.array(milestoneSchema).min(3).max(6),
  agentRequirements: z.object({
    minStakeAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0),
    requiredAgentCount: z.number().min(1).max(10),
    multiSigRequired: z.boolean(),
    multiSigThreshold: z.number().min(2).max(10).optional(),
  }),
  status: z.enum(['draft', 'submitted', 'deployed']),
  lastSaved: z.date().optional(),
}).refine((data) => {
  return data.expectedHarvestDate > data.startDate;
}, {
  message: 'Harvest date must be after start date',
  path: ['expectedHarvestDate'],
}).refine((data) => {
  if (data.roiStructure === 'fixed_return') {
    return data.fixedReturnPercentage !== undefined && data.fixedReturnPercentage > 0;
  }
  if (data.roiStructure === 'revenue_share') {
    return data.revenueSharePercentage !== undefined && data.revenueSharePercentage > 0;
  }
  return true;
}, {
  message: 'ROI percentage is required based on the selected structure',
  path: ['roiStructure'],
}).refine((data) => {
  const totalPercentage = data.milestones.reduce((sum, m) => sum + m.releasePercentage, 0);
  return Math.abs(totalPercentage - 100) < 0.01;
}, {
  message: 'Total milestone release percentage must equal 100%',
  path: ['milestones'],
});

export type BasicInfoFormData = z.infer<typeof basicInfoSchema>;
export type FinancialTermsFormData = z.infer<typeof financialTermsSchema>;
export type TimelineFormData = z.infer<typeof timelineSchema>;
export type MilestoneFormData = z.infer<typeof milestoneSchema>;
export type MilestoneDefinitionFormData = z.infer<typeof milestoneDefinitionSchema>;
export type VerificationSetupFormData = z.infer<typeof verificationSetupSchema>;
export type CampaignFormInput = z.infer<typeof campaignFormSchema>;
