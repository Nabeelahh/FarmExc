import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { milestoneDefinitionSchema, MilestoneDefinitionFormData } from '@/validation/campaignSchemas';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';
import { cn } from '@/lib/utils';

export function MilestoneDefinitionStep() {
  const { formData, updateMilestone, addMilestone, removeMilestone, setStepValidation } = useCampaignWizardStore();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<MilestoneDefinitionFormData>({
    resolver: zodResolver(milestoneDefinitionSchema),
    defaultValues: {
      milestones: formData.milestones,
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones',
  });

  const watchedMilestones = watch('milestones');

  React.useEffect(() => {
    setStepValidation('milestone-definition', isValid);
  }, [isValid, setStepValidation]);

  React.useEffect(() => {
    const subscription = watch((value) => {
      if (value.milestones) {
        value.milestones.forEach((milestone, index) => {
          updateMilestone(index, milestone);
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, updateMilestone]);

  const totalReleasePercentage = watchedMilestones?.reduce((sum, m) => sum + (m.releasePercentage || 0), 0) || 0;
  const isTotalValid = Math.abs(totalReleasePercentage - 100) < 0.01;

  const addNewMilestone = () => {
    const newMilestone = {
      name: '',
      description: '',
      targetDate: new Date(),
      verificationType: 'single_agent' as const,
      releasePercentage: 0,
      evidenceRequirements: {
        photos: true,
        gps: true,
        satelliteCrossCheck: false,
      },
      bufferDays: 7,
    };
    append(newMilestone);
    addMilestone(newMilestone);
  };

  const removeMilestoneAtIndex = (index: number) => {
    remove(index);
    removeMilestone(index);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Milestone Definition</CardTitle>
        <CardDescription>
          Define 3-6 milestones with verification criteria and fund release percentages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Total Release Percentage</h4>
              <p className="text-xs text-muted-foreground">Must equal 100%</p>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              isTotalValid ? "text-green-600" : "text-red-600"
            )}>
              {totalReleasePercentage.toFixed(1)}%
            </div>
          </div>
          {!isTotalValid && (
            <div className="flex items-center gap-2 mt-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">
                Adjust milestone percentages to total exactly 100%
              </span>
            </div>
          )}
        </div>

        {fields.map((field, index) => (
          <Card key={field.id} className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Milestone {index + 1}</CardTitle>
                {fields.length > 3 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeMilestoneAtIndex(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`milestones.${index}.name`}>Milestone Name *</Label>
                  <Input
                    {...register(`milestones.${index}.name`)}
                    placeholder="e.g., Land Preparation"
                    aria-invalid={errors.milestones?.[index]?.name ? 'true' : 'false'}
                  />
                  {errors.milestones?.[index]?.name && (
                    <p className="text-sm text-destructive">
                      {errors.milestones[index]?.name?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`milestones.${index}.targetDate`}>Target Date *</Label>
                  <Input
                    type="date"
                    {...register(`milestones.${index}.targetDate`, { valueAsDate: true })}
                    aria-invalid={errors.milestones?.[index]?.targetDate ? 'true' : 'false'}
                  />
                  {errors.milestones?.[index]?.targetDate && (
                    <p className="text-sm text-destructive">
                      {errors.milestones[index]?.targetDate?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`milestones.${index}.description`}>Description *</Label>
                <Textarea
                  {...register(`milestones.${index}.description`)}
                  placeholder="Describe what needs to be accomplished for this milestone..."
                  className="min-h-[80px]"
                  aria-invalid={errors.milestones?.[index]?.description ? 'true' : 'false'}
                />
                {errors.milestones?.[index]?.description && (
                  <p className="text-sm text-destructive">
                    {errors.milestones[index]?.description?.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`milestones.${index}.verificationType`}>Verification Type *</Label>
                  <Select
                    {...register(`milestones.${index}.verificationType`)}
                    onValueChange={(value) => setValue(`milestones.${index}.verificationType`, value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_agent">Single Agent</SelectItem>
                      <SelectItem value="multi_party">Multi-Party</SelectItem>
                      <SelectItem value="satellite_cross_check">Satellite Cross-Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`milestones.${index}.releasePercentage`}>Release % *</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    {...register(`milestones.${index}.releasePercentage`, { valueAsNumber: true })}
                    placeholder="e.g., 20"
                    aria-invalid={errors.milestones?.[index]?.releasePercentage ? 'true' : 'false'}
                  />
                  {errors.milestones?.[index]?.releasePercentage && (
                    <p className="text-sm text-destructive">
                      {errors.milestones[index]?.releasePercentage?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`milestones.${index}.bufferDays`}>Buffer Days *</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    {...register(`milestones.${index}.bufferDays`, { valueAsNumber: true })}
                    placeholder="e.g., 7"
                    aria-invalid={errors.milestones?.[index]?.bufferDays ? 'true' : 'false'}
                  />
                  {errors.milestones?.[index]?.bufferDays && (
                    <p className="text-sm text-destructive">
                      {errors.milestones[index]?.bufferDays?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Evidence Requirements</Label>
                <div className="grid grid-cols-3 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(`milestones.${index}.evidenceRequirements.photos`)}
                      className="rounded"
                    />
                    Photos
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(`milestones.${index}.evidenceRequirements.gps`)}
                      className="rounded"
                    />
                    GPS
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(`milestones.${index}.evidenceRequirements.satelliteCrossCheck`)}
                      className="rounded"
                    />
                    Satellite
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {fields.length < 6 && (
          <Button
            type="button"
            variant="outline"
            onClick={addNewMilestone}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-medium text-sm text-yellow-900 dark:text-yellow-100 mb-2">
            Milestone Guidelines
          </h4>
          <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• Minimum 3 milestones, maximum 6 milestones</li>
            <li>• Total release percentage must equal exactly 100%</li>
            <li>• Common milestones: Land prep, Planting, Growth monitoring, Harvest</li>
            <li>• Buffer days allow flexibility for weather delays</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
