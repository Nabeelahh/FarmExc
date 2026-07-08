import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { timelineSchema, TimelineFormData } from '@/validation/campaignSchemas';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';
import { format } from 'date-fns';

export function TimelineStep() {
  const { formData, updateTimeline, setStepValidation } = useCampaignWizardStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<TimelineFormData>({
    resolver: zodResolver(timelineSchema),
    defaultValues: {
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      milestoneWindows: formData.milestoneWindows,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  React.useEffect(() => {
    setStepValidation('timeline', isValid);
  }, [isValid, setStepValidation]);

  React.useEffect(() => {
    const subscription = watch((value) => {
      updateTimeline(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateTimeline]);

  const calculateDuration = () => {
    if (watchedValues.startDate && watchedValues.expectedHarvestDate) {
      const start = new Date(watchedValues.startDate);
      const end = new Date(watchedValues.expectedHarvestDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const duration = calculateDuration();

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>
          Set the campaign start date, expected harvest date, and milestone windows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Campaign Start Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="startDate"
                type="date"
                className="pl-10"
                {...register('startDate', { valueAsDate: true })}
                aria-invalid={errors.startDate ? 'true' : 'false'}
                aria-describedby={errors.startDate ? 'startDate-error' : undefined}
              />
            </div>
            {errors.startDate && (
              <p id="startDate-error" className="text-sm text-destructive" role="alert">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedHarvestDate">Expected Harvest Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="expectedHarvestDate"
                type="date"
                className="pl-10"
                {...register('expectedHarvestDate', { valueAsDate: true })}
                aria-invalid={errors.expectedHarvestDate ? 'true' : 'false'}
                aria-describedby={errors.expectedHarvestDate ? 'harvestDate-error' : undefined}
              />
            </div>
            {errors.expectedHarvestDate && (
              <p id="harvestDate-error" className="text-sm text-destructive" role="alert">
                {errors.expectedHarvestDate.message}
              </p>
            )}
          </div>
        </div>

        {duration > 0 && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Campaign Duration</span>
            </div>
            <p className="text-2xl font-bold mt-2">{duration} days</p>
            <p className="text-xs text-muted-foreground mt-1">
              From {format(new Date(watchedValues.startDate), 'MMM dd, yyyy')} to{' '}
              {format(new Date(watchedValues.expectedHarvestDate), 'MMM dd, yyyy')}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Milestone Windows</Label>
            <p className="text-xs text-muted-foreground">
              Define time windows for each milestone with buffer periods
            </p>
          </div>
          
          <div className="bg-muted/30 p-4 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              Milestone windows will be automatically generated based on your timeline
              after you define milestones in the next step.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">
            Timeline Guidelines
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Start date must be in the future</li>
            <li>• Harvest date must be after start date</li>
            <li>• Typical crop cycles range from 90-180 days</li>
            <li>• Buffer periods allow flexibility for weather delays</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
