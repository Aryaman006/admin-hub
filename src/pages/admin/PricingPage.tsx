import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PermissionGuard from '@/components/admin/PermissionGuard';
import PageHeader from '@/components/admin/PageHeader';
import PricingForm from '@/components/admin/PricingForm';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PricingSetting {
  id: string;
  plan_key: string;
  plan_name: string;
  base_price: number;
  gst_rate: number;
  currency: string;
  billing_cycle: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

const PricingPage = () => {
  const [pricings, setPricings] = useState<PricingSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] =
    useState<PricingSetting | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    id?: string;
  }>({ open: false });

  useEffect(() => {
    fetchPricings();
  }, []);

  const fetchPricings = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('pricing_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        console.log(data);
        

      if (error) throw error;

      setPricings(data || []);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to fetch pricing settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (pricing?: PricingSetting) => {
    setEditingPricing(pricing || null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPricing(null);
  };

  const handleSave = async () => {
    await fetchPricings();
    handleCloseDialog();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateFinalPrice = (
    basePrice: number,
    gstRate: number
  ) => {
    return basePrice + basePrice * gstRate;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Pricing Management"
        description="Manage subscription pricing and billing cycles"
      >
        <PermissionGuard module="pricing" action="update">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Plan
          </Button>
        </PermissionGuard>
      </PageHeader>

      <div className="space-y-6">
        {/* Pricing Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricings.map((pricing) => (
            <Card
              key={pricing.id}
              className="relative overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {pricing.plan_name}
                      </p>

                      <h3 className="text-2xl font-bold mt-1">
                        {pricing.currency}
                        {calculateFinalPrice(
                          Number(pricing.base_price || 0),
                          Number(pricing.gst_rate || 0)
                        ).toFixed(2)}
                      </h3>
                    </div>

                    <Badge
                      variant={
                        pricing.is_active
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {pricing.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Base Price:
                      </span>

                      <span className="font-medium">
                        {pricing.currency}
                        {Number(
                          pricing.base_price || 0
                        ).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        GST Rate:
                      </span>

                      <span className="font-medium">
                        {(
                          Number(pricing.gst_rate || 0) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Billing Cycle:
                      </span>

                      <span className="font-medium">
                        {pricing.billing_cycle}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Updated:{' '}
                      {formatDate(
                        pricing.updated_at ||
                          pricing.created_at
                      )}
                    </p>
                  </div>

                  <PermissionGuard
                    module="pricing"
                    action="update"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        handleOpenDialog(pricing)
                      }
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </PermissionGuard>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Detailed Table View */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead>Final Price</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pricings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8"
                      >
                        <p className="text-muted-foreground">
                          No pricing plans found
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pricings.map((pricing) => (
                      <TableRow key={pricing.id}>
                        <TableCell className="font-medium">
                          {pricing.plan_name}
                        </TableCell>

                        <TableCell>
                          {pricing.currency}
                          {Number(
                            pricing.base_price || 0
                          ).toFixed(2)}
                        </TableCell>

                        <TableCell>
                          {(
                            Number(pricing.gst_rate || 0) *
                            100
                          ).toFixed(1)}
                          %
                        </TableCell>

                        <TableCell className="font-semibold">
                          {pricing.currency}
                          {calculateFinalPrice(
                            Number(pricing.base_price || 0),
                            Number(pricing.gst_rate || 0)
                          ).toFixed(2)}
                        </TableCell>

                        <TableCell>
                          {pricing.currency}
                        </TableCell>

                        <TableCell>
                          {pricing.billing_cycle}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              pricing.is_active
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {pricing.is_active
                              ? 'Active'
                              : 'Inactive'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(
                            pricing.updated_at ||
                              pricing.created_at
                          )}
                        </TableCell>

                        <TableCell>
                          <PermissionGuard
                            module="pricing"
                            action="update"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleOpenDialog(pricing)
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </PermissionGuard>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h4 className="font-semibold text-sm mb-2">
              📋 How Pricing Works
            </h4>

            <ul className="text-sm text-muted-foreground space-y-2">
              <li>
                • All prices are managed from this dashboard
              </li>
              <li>
                • User app automatically reflects updated pricing
              </li>
              <li>
                • Razorpay checkout uses the latest backend amount
              </li>
              <li>
                • GST is calculated dynamically in real-time
              </li>
              <li>
                • No app redeploy needed for price changes
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Form Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPricing
                ? 'Edit Pricing Plan'
                : 'Add New Pricing Plan'}
            </DialogTitle>
          </DialogHeader>

          <PricingForm
            pricing={editingPricing}
            onSuccess={handleSave}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Update Pricing
            </AlertDialogTitle>

            <AlertDialogDescription>
              This will update the pricing for all users.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction>
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PricingPage;