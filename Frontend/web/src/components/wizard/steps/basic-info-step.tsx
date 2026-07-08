import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Wheat, Ruler } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { basicInfoSchema, BasicInfoFormData } from '@/validation/campaignSchemas';
import { useCampaignWizardStore } from '@/store/campaignWizardStore';

export function BasicInfoStep() {
  const { formData, updateBasicInfo, setStepValidation } = useCampaignWizardStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: formData.name,
      description: formData.description,
      cropType: formData.cropType,
      location: formData.location,
      farmSize: formData.farmSize,
      farmSizeUnit: formData.farmSizeUnit,
    },
    mode: 'onChange',
  });

  const watchedValues = watch();

  React.useEffect(() => {
    setStepValidation('basic-info', isValid);
  }, [isValid, setStepValidation]);

  React.useEffect(() => {
    const subscription = watch((value) => {
      updateBasicInfo(value);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateBasicInfo]);

  const handleLocationDetect = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('location.latitude', position.coords.latitude);
          setValue('location.longitude', position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Provide the fundamental details about your agricultural campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Maize Harvest 2024 - Cooperative A"
            {...register('name')}
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            placeholder="Describe your campaign, goals, and any relevant context for investors..."
            className="min-h-[120px]"
            {...register('description')}
            aria-invalid={errors.description ? 'true' : 'false'}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && (
            <p id="description-error" className="text-sm text-destructive" role="alert">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cropType">Crop Type *</Label>
          <div className="relative">
            <Wheat className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="cropType"
              placeholder="e.g., Maize, Rice, Cassava"
              className="pl-10"
              {...register('cropType')}
              aria-invalid={errors.cropType ? 'true' : 'false'}
              aria-describedby={errors.cropType ? 'cropType-error' : undefined}
            />
          </div>
          {errors.cropType && (
            <p id="cropType-error" className="text-sm text-destructive" role="alert">
              {errors.cropType.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Farm Location *</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="address"
              placeholder="Enter farm address or use GPS detection"
              className="pl-10"
              {...register('location.address')}
              aria-invalid={errors.location?.address ? 'true' : 'false'}
              aria-describedby={errors.location?.address ? 'address-error' : undefined}
            />
          </div>
          {errors.location?.address && (
            <p id="address-error" className="text-sm text-destructive" role="alert">
              {errors.location.address.message}
            </p>
          )}
          <button
            type="button"
            onClick={handleLocationDetect}
            className="text-sm text-primary hover:underline mt-1"
          >
            Detect current GPS coordinates
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude *</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="e.g., 6.5244"
              {...register('location.latitude', { valueAsNumber: true })}
              aria-invalid={errors.location?.latitude ? 'true' : 'false'}
              aria-describedby={errors.location?.latitude ? 'latitude-error' : undefined}
            />
            {errors.location?.latitude && (
              <p id="latitude-error" className="text-sm text-destructive" role="alert">
                {errors.location.latitude.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude *</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="e.g., 3.3792"
              {...register('location.longitude', { valueAsNumber: true })}
              aria-invalid={errors.location?.longitude ? 'true' : 'false'}
              aria-describedby={errors.location?.longitude ? 'longitude-error' : undefined}
            />
            {errors.location?.longitude && (
              <p id="longitude-error" className="text-sm text-destructive" role="alert">
                {errors.location.longitude.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="farmSize">Farm Size *</Label>
            <div className="relative">
              <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="farmSize"
                type="number"
                step="0.1"
                placeholder="e.g., 5.5"
                className="pl-10"
                {...register('farmSize', { valueAsNumber: true })}
                aria-invalid={errors.farmSize ? 'true' : 'false'}
                aria-describedby={errors.farmSize ? 'farmSize-error' : undefined}
              />
            </div>
            {errors.farmSize && (
              <p id="farmSize-error" className="text-sm text-destructive" role="alert">
                {errors.farmSize.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="farmSizeUnit">Unit *</Label>
            <Select
              value={watchedValues.farmSizeUnit}
              onValueChange={(value) => setValue('farmSizeUnit', value as 'hectares' | 'acres')}
            >
              <SelectTrigger id="farmSizeUnit" aria-label="Select farm size unit">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hectares">Hectares</SelectItem>
                <SelectItem value="acres">Acres</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
