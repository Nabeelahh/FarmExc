import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, TrendingUp, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { financialTermsSchema, FinancialTermsFormData } from '@/validation/campaignSchemas';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';

export function FinancialTermsStep() {
  const { formData, updateFinancialTerms, setStepValidation } = useCampaignWizardStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<FinancialTermsFormData>({
    resolver: zodResolver(financialTermsSchema),
    defaultValues: {
      targetAmount: formData.targetAmount,
      assetType: formData.assetType,
      roiStructure: formData.roiStructure,
      fixedReturnPercentage: formData.fixedReturnPercentage,
      revenueSharePercentage: formData.revenueSharePercentage,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();
  const roiStructure = watchedValues.roiStructure;

  React.useEffect(() => {
    setStepValidation('financial-terms', isValid);
  }, [isValid, setStepValidation]);

  React.useEffect(() => {
    const subscription = watch((value) => {
      updateFinancialTerms(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateFinancialTerms]);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Financial Terms</CardTitle>
        <CardDescription>
          Define the funding target and investor return structure for your campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="targetAmount">Target Funding Amount *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              placeholder="e.g., 10000"
              className="pl-10"
              {...register('targetAmount')}
              aria-invalid={errors.targetAmount ? 'true' : 'false'}
              aria-describedby={errors.targetAmount ? 'targetAmount-error' : undefined}
            />
          </div>
          {errors.targetAmount && (
            <p id="targetAmount-error" className="text-sm text-destructive" role="alert">
              {errors.targetAmount.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assetType">Asset Type *</Label>
          <Select
            value={watchedValues.assetType}
            onValueChange={(value) => setValue('assetType', value as 'USDC' | 'XLM')}
          >
            <SelectTrigger id="assetType" aria-label="Select asset type">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USDC">USDC (USD Coin)</SelectItem>
              <SelectItem value="XLM">XLM (Stellar Lumens)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the asset investors will use to fund your campaign.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roiStructure">Investor ROI Structure *</Label>
          <Select
            value={watchedValues.roiStructure}
            onValueChange={(value) => setValue('roiStructure', value as 'fixed_return' | 'revenue_share')}
          >
            <SelectTrigger id="roiStructure" aria-label="Select ROI structure">
              <SelectValue placeholder="Select ROI structure" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_return">Fixed Return Percentage</SelectItem>
              <SelectItem value="revenue_share">Revenue Share Percentage</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Fixed return: Investors receive a guaranteed percentage return on their investment.
            Revenue share: Investors receive a percentage of the harvest revenue.
          </p>
        </div>

        {roiStructure === 'fixed_return' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="fixedReturnPercentage">Fixed Return Percentage *</Label>
            <div className="relative">
              <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="fixedReturnPercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g., 15"
                className="pl-10"
                {...register('fixedReturnPercentage', { valueAsNumber: true })}
                aria-invalid={errors.fixedReturnPercentage ? 'true' : 'false'}
                aria-describedby={errors.fixedReturnPercentage ? 'fixedReturn-error' : undefined}
              />
            </div>
            {errors.fixedReturnPercentage && (
              <p id="fixedReturn-error" className="text-sm text-destructive" role="alert">
                {errors.fixedReturnPercentage.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Example: 15% means investors receive their principal plus 15% return at harvest.
            </p>
          </div>
        )}

        {roiStructure === 'revenue_share' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="revenueSharePercentage">Revenue Share Percentage *</Label>
            <div className="relative">
              <TrendingUp className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="revenueSharePercentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="e.g., 20"
                className="pl-10"
                {...register('revenueSharePercentage', { valueAsNumber: true })}
                aria-invalid={errors.revenueSharePercentage ? 'true' : 'false'}
                aria-describedby={errors.revenueSharePercentage ? 'revenueShare-error' : undefined}
              />
            </div>
            {errors.revenueSharePercentage && (
              <p id="revenueShare-error" className="text-sm text-destructive" role="alert">
                {errors.revenueSharePercentage.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Example: 20% means investors receive 20% of total harvest revenue.
            </p>
          </div>
        )}

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Investor Return Summary</h4>
          <p className="text-xs text-muted-foreground">
            {roiStructure === 'fixed_return' && (
              <>
                Investors will receive their principal plus{' '}
                <span className="font-semibold">{watchedValues.fixedReturnPercentage || 0}%</span>{' '}
                fixed return at harvest completion.
              </>
            )}
            {roiStructure === 'revenue_share' && (
              <>
                Investors will receive{' '}
                <span className="font-semibold">{watchedValues.revenueSharePercentage || 0}%</span>{' '}
                of total harvest revenue, proportional to their investment.
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
