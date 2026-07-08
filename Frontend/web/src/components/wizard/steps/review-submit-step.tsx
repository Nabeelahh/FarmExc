import React from 'react';
import { CheckCircle2, AlertTriangle, FileText, DollarSign, Calendar, MapPin, Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';
import { format } from 'date-fns';
import { campaignFormSchema } from '@/validation/campaignSchemas';

export function ReviewSubmitStep() {
  const { formData, canProceed } = useCampaignWizardStore();

  const validateCampaign = () => {
    try {
      campaignFormSchema.parse(formData);
      return { isValid: true, errors: null };
    } catch (error: any) {
      return { isValid: false, errors: error.errors };
    }
  };

  const { isValid, errors } = validateCampaign();

  const calculateGasEstimate = () => {
    // Mock gas estimation - in production, this would call the actual contract
    const baseGas = 100000; // Base gas for contract deployment
    const milestoneGas = formData.milestones.length * 50000; // Gas per milestone
    const totalGas = baseGas + milestoneGas;
    const gasPrice = 0.00001; // XLM per gas unit (mock)
    return {
      gasUnits: totalGas,
      estimatedCost: (totalGas * gasPrice).toFixed(4),
    };
  };

  const gasEstimate = calculateGasEstimate();

  const simulateReturns = (scenario: 'optimistic' | 'expected' | 'pessimistic') => {
    const targetAmount = parseFloat(formData.targetAmount) || 0;
    const multipliers = { optimistic: 1.3, expected: 1.15, pessimistic: 0.9 };
    const multiplier = multipliers[scenario];
    const totalRevenue = targetAmount * multiplier;
    
    let investorReturn = 0;
    if (formData.roiStructure === 'fixed_return') {
      investorReturn = targetAmount * (1 + (formData.fixedReturnPercentage || 0) / 100);
    } else {
      investorReturn = totalRevenue * ((formData.revenueSharePercentage || 0) / 100);
    }
    
    const farmerProceeds = totalRevenue - investorReturn;
    
    return {
      totalRevenue,
      investorReturn,
      farmerProceeds,
    };
  };

  const optimisticReturns = simulateReturns('optimistic');
  const expectedReturns = simulateReturns('expected');
  const pessimisticReturns = simulateReturns('pessimistic');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review & Submit</CardTitle>
          <CardDescription>
            Review your campaign details before deploying to the Soroban blockchain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Status */}
          <div className={`p-4 rounded-lg border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${isValid ? 'text-green-900' : 'text-red-900'}`}>
                {isValid ? 'Campaign Validation Passed' : 'Campaign Validation Failed'}
              </span>
            </div>
            {!isValid && errors && (
              <div className="mt-2 text-sm text-red-700">
                <p>Please fix the following errors before submitting:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {errors.slice(0, 5).map((error: any, index: number) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Basic Info Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Campaign Name:</span>
                <p className="font-medium">{formData.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Crop Type:</span>
                <p className="font-medium">{formData.cropType}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">Description:</span>
                <p className="font-medium">{formData.description}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Farm Size:</span>
                <p className="font-medium">{formData.farmSize} {formData.farmSizeUnit}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span>
                <p className="font-medium">{formData.location.address}</p>
                <p className="text-xs text-muted-foreground">
                  {formData.location.latitude.toFixed(4)}, {formData.location.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Terms Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Financial Terms</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Target Amount:</span>
                <p className="font-medium">{formData.targetAmount} {formData.assetType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">ROI Structure:</span>
                <p className="font-medium capitalize">{formData.roiStructure.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {formData.roiStructure === 'fixed_return' ? 'Fixed Return:' : 'Revenue Share:'}
                </span>
                <p className="font-medium">
                  {formData.roiStructure === 'fixed_return' 
                    ? `${formData.fixedReturnPercentage}%`
                    : `${formData.revenueSharePercentage}%`}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Timeline</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <p className="font-medium">{format(new Date(formData.startDate), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Harvest:</span>
                <p className="font-medium">{format(new Date(formData.expectedHarvestDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Milestones ({formData.milestones.length})</h3>
            </div>
            <div className="space-y-2">
              {formData.milestones.map((milestone, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{milestone.name}</p>
                      <p className="text-xs text-muted-foreground">{milestone.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(milestone.targetDate), 'MMM dd, yyyy')} • {milestone.releasePercentage}% release
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium bg-primary/10 px-2 py-1 rounded">
                        {milestone.verificationType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Setup Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Verification Setup</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Min Stake:</span>
                <p className="font-medium">{formData.agentRequirements.minStakeAmount} XLM</p>
              </div>
              <div>
                <span className="text-muted-foreground">Required Agents:</span>
                <p className="font-medium">{formData.agentRequirements.requiredAgentCount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Multi-Sig:</span>
                <p className="font-medium">
                  {formData.agentRequirements.multiSigRequired 
                    ? `${formData.agentRequirements.multiSigThreshold}-of-${formData.agentRequirements.requiredAgentCount}`
                    : 'Not required'}
                </p>
              </div>
            </div>
          </div>

          {/* Contract Simulation */}
          <div className="space-y-3">
            <h3 className="font-semibold">Contract Simulation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-900">Optimistic</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-900">{optimisticReturns.totalRevenue.toFixed(0)} {formData.assetType}</p>
                  <p className="text-xs text-green-700">Investor: {optimisticReturns.investorReturn.toFixed(0)}</p>
                  <p className="text-xs text-green-700">Farmer: {optimisticReturns.farmerProceeds.toFixed(0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-900">Expected</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-900">{expectedReturns.totalRevenue.toFixed(0)} {formData.assetType}</p>
                  <p className="text-xs text-blue-700">Investor: {expectedReturns.investorReturn.toFixed(0)}</p>
                  <p className="text-xs text-blue-700">Farmer: {expectedReturns.farmerProceeds.toFixed(0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-orange-900">Pessimistic</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-900">{pessimisticReturns.totalRevenue.toFixed(0)} {formData.assetType}</p>
                  <p className="text-xs text-orange-700">Investor: {pessimisticReturns.investorReturn.toFixed(0)}</p>
                  <p className="text-xs text-orange-700">Farmer: {pessimisticReturns.farmerProceeds.toFixed(0)}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Gas Estimation */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium text-sm">Estimated Gas Cost</h4>
                <p className="text-xs text-muted-foreground">
                  {gasEstimate.gasUnits.toLocaleString()} gas units
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{gasEstimate.estimatedCost} XLM</p>
                <p className="text-xs text-muted-foreground">Approximate deployment cost</p>
              </div>
            </div>
          </div>

          {/* Contract Terms Summary */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
              Contract Terms Summary (Plain Language)
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Campaign will raise {formData.targetAmount} {formData.assetType} from investors</li>
              <li>• Funds held in escrow and released only upon milestone verification</li>
              <li>• {formData.milestones.length} milestones with {formData.agentRequirements.requiredAgentCount} required verification agents</li>
              <li>• Agents must stake {formData.agentRequirements.minStakeAmount} XLM (slashable for fraud)</li>
              <li>• Investors receive {formData.roiStructure === 'fixed_return' ? `${formData.fixedReturnPercentage}% fixed return` : `${formData.revenueSharePercentage}% of harvest revenue`}</li>
              <li>• Campaign runs from {format(new Date(formData.startDate), 'MMM dd, yyyy')} to {format(new Date(formData.expectedHarvestDate), 'MMM dd, yyyy')}</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button
              disabled={!isValid}
              className="flex-1"
              onClick={() => {
                // Handle contract deployment
                console.log('Deploying campaign:', formData);
              }}
            >
              Deploy Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
