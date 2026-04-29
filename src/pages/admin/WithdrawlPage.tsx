import { useEffect, useState } from "react";
import PermissionGuard from '@/components/admin/PermissionGuard';
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportWithdrawalsData } from "@/utils/excelExport";

const tabs = ["all", "pending", "approved", "completed", "rejected"];

const WithdrawalRequestsPage = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  // ✅ FETCH + MERGE USERS
  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .order("created_at", { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
      toast.error("Failed to fetch withdrawals");
      setLoading(false);
      return;
    }

    const userIds = data.map((r) => r.user_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds) as { data: any[] | null };

    const { data: emails } = await supabase
      .from("user_emails")
      .select("id, email")
      .in("id", userIds) as { data: any[] | null };

    const merged = data.map((req) => {
      const profile = profiles?.find((p) => p.id === req.user_id);
      const email = emails?.find((e) => e.id === req.user_id);

      return {
        ...req,
        full_name: profile?.full_name || "N/A",
        email: email?.email || "N/A",
      };
    });

    setRequests(merged);
    setLoading(false);
  };

  const filtered =
    filter === "all"
      ? requests
      : requests.filter((r) => r.status === filter);

  const totalPending = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  // ✅ APPROVE
  const handleApprove = async (req: any) => {
    if (!confirm("Approve this request?")) return;

    const { error } = await supabase
      .from("withdrawal_requests")
      // @ts-expect-error - table not in generated types
      .update({
        status: "approved",
        processed_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    if (error) {
      toast.error("Failed to approve");
    } else {
      toast.success("Approved");
      fetchRequests();
    }
  };

  // ❌ REJECT (WITH REASON)
  const handleReject = async (req: any) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    const { error } = await supabase
      .from("withdrawal_requests")
      // @ts-expect-error - table not in generated types
      .update({
        status: "rejected",
        admin_notes: reason,
        processed_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    if (error) {
      toast.error("Failed to reject");
    } else {
      toast.success("Rejected");
      fetchRequests();
    }
  };

  // 💸 COMPLETE (RPC SAFE)
  const handleComplete = async (req: any) => {
  if (!confirm("Have you already sent payment to the user?")) return;

  if (req.status !== "approved") {
    toast.error("Approve first");
    return;
  }

  const { error } = await supabase
    .from("withdrawal_requests")
    // @ts-expect-error - table not in generated types
    .update({
      status: "completed",
    })
    .eq("id", req.id);

  if (error) {
    toast.error(error.message);
  } else {
    toast.success("Withdrawal completed");
    fetchRequests();
  }
};

  // 💳 PAYMENT DETAILS
  const renderPaymentDetails = (req: any) => {
    const details = req.payment_details;

    if (req.payment_method === "upi") {
      return <span>{details?.upi_id}</span>;
    }

    if (req.payment_method === "bank_transfer") {
      return (
        <div className="text-xs space-y-1">
          <p><b>Name:</b> {details?.account_holder_name}</p>
          <p><b>Bank:</b> {details?.bank_name}</p>
          <p><b>Acc:</b> {details?.account_number}</p>
          <p><b>IFSC:</b> {details?.ifsc_code}</p>
        </div>
      );
    }

    return "-";
  };

  const handleExportWithdrawals = async () => {
    setIsExporting(true);
    try {
      if (requests.length === 0) {
        toast.error("No withdrawals to export");
        return;
      }

      exportWithdrawalsData(requests);
      toast.success(`Exported ${requests.length} withdrawals successfully`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export withdrawals";
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="Withdrawal Requests" 
        description="Manage payouts"
      >
        <PermissionGuard module="withdrawals" action="read">
          <Button 
            onClick={handleExportWithdrawals}
            disabled={isExporting || requests.length === 0}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Withdrawals"}
          </Button>
        </PermissionGuard>
      </PageHeader>

      {/* Summary */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Pending</p>
          <p className="text-2xl font-bold">₹{totalPending}</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <Button
            key={t}
            variant={filter === t ? "default" : "outline"}
            onClick={() => setFilter(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {/* Table */}
     <Card>
  <CardContent className="p-0 overflow-hidden">
    {loading ? (
      <p className="p-6">Loading...</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="bg-muted/50 border-b">
            <tr className="text-left">
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium">Method</th>
              <th className="p-4 font-medium">Details</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Notes</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filtered.map((req) => (
              <tr
                key={req.id}
                className="border-b hover:bg-muted/40 transition"
              >
                {/* Email */}
                <td className="p-4 font-medium">{req.email}</td>

                {/* Amount */}
                <td className="p-4 font-semibold text-lg">
                  ₹{req.amount}
                </td>

                {/* Method */}
                <td className="p-4 capitalize">
                  {req.payment_method}
                </td>

                {/* Details */}
                <td className="p-4">
                  <div className="text-xs bg-muted px-2 py-1 rounded-md">
                    {renderPaymentDetails(req)}
                  </div>
                </td>

                {/* Status */}
                <td className="p-4">
                  <Badge
                    className={`
                      ${
                        req.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : req.status === "approved"
                          ? "bg-blue-100 text-blue-700"
                          : req.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                    `}
                  >
                    {req.status}
                  </Badge>
                </td>

                {/* Date */}
                <td className="p-4 text-muted-foreground text-xs">
                  {new Date(req.created_at).toLocaleString()}
                </td>

                {/* Notes */}
                <td className="p-4 text-xs text-red-500">
                  {req.admin_notes || "-"}
                </td>

                {/* Actions */}
                <td className="p-4 text-right space-x-2">
                  <PermissionGuard module="withdrawals" action="update">
                    <>
                      {req.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleApprove(req)}
                          >
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(req)}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {req.status === "approved" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleComplete(req)}
                        >
                          Complete
                        </Button>
                      )}
                    </>
                  </PermissionGuard>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>
    </>
  );
};

export default WithdrawalRequestsPage;