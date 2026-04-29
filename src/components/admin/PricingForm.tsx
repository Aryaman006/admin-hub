import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Card, CardContent } from '@/components/ui/card';

import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

import {
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { toast } from 'sonner';

interface PricingSetting {
  id: string;
  plan_key: string;
  plan_name: string;
  base_price: number;
  gst_rate: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

interface PricingFormProps {
  pricing?: PricingSetting | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const pricingSchema = z.object({
  planName: z
    .string()
    .min(1, 'Plan name is required'),

  basePrice: z.string().refine(
    (val) =>
      !isNaN(Number(val)) &&
      Number(val) > 0,
    {
      message:
        'Base price must be greater than 0',
    }
  ),

  gstRate: z.string().refine(
    (val) => {
      const num = Number(val);

      return (
        !isNaN(num) &&
        num >= 0 &&
        num <= 1
      );
    },
    {
      message:
        'GST rate must be between 0 and 1',
    }
  ),

  isActive: z.boolean().default(true),

  changeReason: z.string().optional(),
});

type PricingFormData =
  z.infer<typeof pricingSchema>;

const PricingForm = ({
  pricing,
  onSuccess,
  onCancel,
}: PricingFormProps) => {
  const [isSaving, setIsSaving] =
    useState(false);

  const [livePrice, setLivePrice] =
    useState<number>(0);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const form = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),

    defaultValues: {
      planName:
        pricing?.plan_name || '',

      basePrice:
        pricing?.base_price?.toString() ||
        '',

      gstRate:
        pricing?.gst_rate?.toString() ||
        '0.05',

      isActive:
        pricing?.is_active ?? true,

      changeReason: '',
    },
  });

  const basePriceWatch =
    form.watch('basePrice');

  const gstRateWatch =
    form.watch('gstRate');

  useEffect(() => {
    const basePrice =
      Number(basePriceWatch) || 0;

    const gstRate =
      Number(gstRateWatch) || 0;

    const finalPrice =
      basePrice +
      basePrice * gstRate;

    setLivePrice(finalPrice);
  }, [
    basePriceWatch,
    gstRateWatch,
  ]);

  const onSubmit = async () => {
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit =
    async () => {
      setShowConfirmation(false);

      const data =
        form.getValues();

      setIsSaving(true);

      try {
        const payload = {
          plan_key:
            pricing?.plan_key ||
            `plan_${Date.now()}`,

          plan_name:
            data.planName,

          base_price:
            Number(data.basePrice),

          gst_rate:
            Number(data.gstRate),

          currency: 'INR',

          is_active:
            data.isActive,
        };

        let response;

        if (pricing?.id) {
          response =
            await supabase
              .from(
                'pricing_settings'
              )
              .update(payload)
              .eq(
                'id',
                pricing.id
              );
        } else {
          response =
            await supabase
              .from(
                'pricing_settings'
              )
              .insert(payload);
        }

        if (response.error) {
          throw response.error;
        }

        toast.success(
          pricing
            ? 'Pricing updated successfully'
            : 'Pricing created successfully'
        );

        onSuccess();
      } catch (error) {
        console.error(
          'Pricing save error:',
          error
        );

        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to save pricing'
        );
      } finally {
        setIsSaving(false);
      }
    };

  const basePrice =
    Number(
      form.watch('basePrice')
    ) || 0;

  const gstRate =
    Number(
      form.watch('gstRate')
    ) || 0;

  const gstAmount =
    basePrice * gstRate;

  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Base Price:
              </span>

              <span className="text-lg font-semibold">
                ₹
                {basePrice.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                GST (
                {(
                  gstRate * 100
                ).toFixed(1)}
                %):
              </span>

              <span className="text-lg font-semibold">
                ₹
                {gstAmount.toFixed(
                  2
                )}
              </span>
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold">
                Final Price:
              </span>

              <span className="text-2xl font-bold text-primary">
                ₹
                {livePrice.toFixed(
                  2
                )}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            ✓ Live preview based on
            base price and GST.
          </p>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 text-blue-900">
        <AlertCircle className="h-4 w-4" />

        <AlertDescription>
          Pricing updates are saved
          directly into Supabase and
          reflected instantly.
        </AlertDescription>
      </Alert>

      {/* Form */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            onSubmit
          )}
          className="space-y-4"
        >
          {/* Plan Name */}
          <FormField
            control={form.control}
            name="planName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Plan Name
                </FormLabel>

                <FormControl>
                  <Input
                    placeholder="Premium Yearly"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Base Price */}
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Base Price
                </FormLabel>

                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="999"
                    {...field}
                  />
                </FormControl>

                <FormDescription>
                  Price before GST
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* GST Rate */}
          <FormField
            control={form.control}
            name="gstRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  GST Rate
                </FormLabel>

                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="0.05"
                    {...field}
                  />
                </FormControl>

                <FormDescription>
                  Example: 0.05 = 5%
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Change Reason */}
          <FormField
            control={form.control}
            name="changeReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Change Reason
                </FormLabel>

                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Optional admin note..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          {/* Active Toggle */}
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>
                    Active Plan
                  </FormLabel>

                  <FormDescription>
                    Enable or disable
                    this plan
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    checked={
                      field.value
                    }
                    onCheckedChange={
                      field.onChange
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Confirmation */}
          {showConfirmation && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />

                  <div>
                    <h4 className="font-semibold text-sm text-yellow-900">
                      Confirm Update
                    </h4>

                    <p className="text-sm text-yellow-800 mt-1">
                      This pricing
                      will be updated
                      immediately for
                      all users.
                    </p>

                    <div className="mt-3 bg-white p-3 rounded border border-yellow-200 text-sm">
                      <div className="font-mono text-xs space-y-1">
                        <div>
                          Plan:{' '}
                          <span className="font-semibold">
                            {form.watch(
                              'planName'
                            )}
                          </span>
                        </div>

                        <div>
                          Final
                          Price:{' '}
                          <span className="font-semibold">
                            ₹
                            {livePrice.toFixed(
                              2
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setShowConfirmation(
                        false
                      )
                    }
                  >
                    Cancel
                  </Button>

                  <Button
                    size="sm"
                    disabled={
                      isSaving
                    }
                    onClick={
                      handleConfirmedSubmit
                    }
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {isSaving
                      ? 'Saving...'
                      : 'Confirm Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {!showConfirmation && (
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  isSaving ||
                  !form.formState
                    .isValid
                }
                className="flex-1"
              >
                {isSaving
                  ? 'Saving...'
                  : pricing
                  ? 'Update Pricing'
                  : 'Create Pricing'}
              </Button>
            </div>
          )}
        </form>
      </Form>

      {/* Success Info */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />

        <AlertDescription className="text-green-900">
          Pricing changes are
          reflected instantly across
          the platform.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PricingForm;