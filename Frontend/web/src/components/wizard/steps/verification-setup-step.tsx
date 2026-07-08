import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shield, Users, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { verificationSetupSchema, VerificationSetupFormData } from '@/validation/campaignSchemas';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';

export function VerificationSetupStep() {
  const { formData, updateVerificationSetup, setStepValidation } = useCampaignWizardStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<VerificationSetupFormData>({
    resolver: zodResolver(verificationSetupSchema),
    defaultValues: {
      agentRequirements: formData.agentRequirements,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();
  const multiSigRequired = watchedValues.agentRequirements?.multiSigRequired;

  React.useEffect(() => {
    setStepValidation('verification-setup', isValid);
  }, [isValid, setStepValidation]);

  React.useEffect(() => {
    const subscription = watch((value) => {
      updateVerificationSetup(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateVerificationSetup]);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Verification Setup</CardTitle>
        <CardDescription>
          Configure agent requirements, staking amounts, and multi-signature rules for milestone verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="minStakeAmount">Minimum Agent Stake Amount *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="minStakeAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 100"
              className="pl-10"
              {...register('agentRequirements.minStakeAmount')}
              aria-invalid={errors.agentRequirements?.minStakeAmount ? 'true' : 'false'}
              aria-describedby={errors.agentRequirements?.minStakeAmount ? 'stake-error' : undefined}
            />
          </div>
          {errors.agentRequirements?.minStakeAmount && (
            <p id="stake-error" className="text-sm text-destructive" role="alert">
              {errors.agentRequirements.minStakeAmount.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Agents must stake this amount in XLM to participate in verification. This bond is slashable for fraudulent attestations.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="requiredAgentCount">Required Agent Count *</Label>
          <div className="relative">
            <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="requiredAgentCount"
              type="number"
              min="1"
              max="10"
              placeholder="e.g., 3"
              className="pl-10"
              {...register('agentRequirements.requiredAgentCount', { valueAsNumber: true })}
              aria-invalid={errors.agentRequirements?.requiredAgentCount ? 'true' : 'false'}
              aria-describedby={errors.agentRequirements?.requiredAgentCount ? 'agentCount-error' : undefined}
            />
          </div>
          {errors.agentRequirements?.requiredAgentCount && (
            <p id="agentCount-error" className="text-sm text-destructive" role="alert">
              {errors.agentRequirements.requiredAgentCount.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Number of agents required to verify each milestone.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="multiSigRequired" className="text-base">Multi-Signature Required</Label>
            <p className="text-xs text-muted-foreground">
              Require multiple agents to sign off on milestone verification
            </p>
          </div>
          <Switch
            id="multiSigRequired"
            checked={multiSigRequired}
            onCheckedChange={(checked) => setValue('agentRequirements.multiSigRequired', checked)}
          />
        </div>

        {multiSigRequired && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="multiSigThreshold">Multi-Sig Threshold *</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="multiSigThreshold"
                type="number"
                min="2"
                max="10"
                placeholder="e.g., 2"
                className="pl-10"
                {...register('agentRequirements.multiSigThreshold', { valueAsNumber: true })}
                aria-invalid={errors.agentRequirements?.multiSigThreshold ? 'true' : 'false'}
                aria-describedby={errors.agentRequirements?.multiSigThreshold ? 'threshold-error' : undefined}
              />
            </div>
            {errors.agentRequirements?.multiSigThreshold && (
              <p id="threshold-error" className="text-sm text-destructive" role="alert">
                {errors.agentRequirements.multiSigThreshold.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum number of agents (out of {watchedValues.agentRequirements?.requiredAgentCount}) required to sign off. 
              Example: 2-of-3 means 2 out of 3 agents must approve.
            </p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
            Verification Security
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Agent stakes provide financial disincentive for fraud</li>
            <li>• Multi-sig adds consensus requirement for high-value milestones</li>
            <li>• Stakes are slashed if agents provide false attestations</li>
            <li>• Higher stakes and multi-sig increase verification security</li>
          </ul>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Current Configuration</h4>
          <div className="text-xs space-y-1">
            <p><span className="font-medium">Stake Amount:</span> {watchedValues.agentRequirements?.minStakeAmount || 0} XLM</p>
            <p><span className="font-medium">Required Agents:</span> {watchedValues.agentRequirements?.requiredAgentCount || 1}</p>
            <p><span className="font-medium">Multi-Sig:</span> {multiSigRequired ? `Yes (${watchedValues.agentRequirements?.multiSigThreshold}-of-${watchedValues.agentRequirements?.requiredAgentCount})` : 'No'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
