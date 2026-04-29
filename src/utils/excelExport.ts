import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: unknown) => string | number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
}

/**
 * Format currency values in INR
 */
export const formatCurrency = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = Number(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

/**
 * Format date in Indian locale
 */
export const formatDateIN = (value: unknown): string => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value as string);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Format status as proper case
 */
export const formatStatus = (value: unknown): string => {
  if (!value) return '—';
  return String(value)
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Generate Excel file from data and trigger download
 */
export const exportToExcel = (options: ExportOptions): void => {
  const { filename, sheetName = 'Sheet1', columns, data } = options;

  // Transform data based on column configuration
  const transformedData = data.map(row => {
    const transformedRow: Record<string, string | number> = {};

    columns.forEach(column => {
      const value = row[column.key];
      let formattedValue: string | number;

      if (column.format) {
        formattedValue = column.format(value);
      } else {
        // Default formatting based on value type
        if (value === null || value === undefined) {
          formattedValue = '—';
        } else if (typeof value === 'boolean') {
          formattedValue = value ? 'Yes' : 'No';
        } else {
          formattedValue = String(value);
        }
      }

      transformedRow[column.header] = formattedValue;
    });

    return transformedRow;
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // Set column widths
  const colWidths = columns.map(col => ({
    wch: col.width || 15,
  }));
  worksheet['!cols'] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename.replace('.xlsx', `_${timestamp}.xlsx`);

  // Write file
  XLSX.writeFile(workbook, finalFilename);
};

/**
 * Export users data
 */
export const exportUsersData = (users: Record<string, unknown>[]): void => {
  if (!users || users.length === 0) {
    throw new Error('No user data to export');
  }

  const columns: ExportColumn[] = [
    { header: 'User ID', key: 'user_id', width: 20 },
    { header: 'Full Name', key: 'full_name', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Subscription Status', key: 'subscription_status', width: 18, format: formatStatus },
    { header: 'Yogic Points', key: 'yogic_points', width: 15 },
    { header: 'Watch Time (mins)', key: 'watch_time', width: 18 },
    { header: 'Is Blocked', key: 'is_blocked', width: 12, format: (v) => v ? 'Yes' : 'No' },
    { header: 'Created At', key: 'created_at', width: 20, format: formatDateIN },
  ];

  exportToExcel({
    filename: 'users-report.xlsx',
    sheetName: 'Users',
    columns,
    data: users,
  });
};

/**
 * Export payments data
 */
export const exportPaymentsData = (payments: Record<string, unknown>[]): void => {
  if (!payments || payments.length === 0) {
    throw new Error('No payment data to export');
  }

  const columns: ExportColumn[] = [
    { header: 'Payment ID', key: 'id', width: 20 },
    { header: 'User ID', key: 'user_id', width: 20 },
    { header: 'User Name', key: 'user_name', width: 20 },
    { header: 'User Email', key: 'user_email', width: 25 },
    { header: 'Amount (₹)', key: 'amount', width: 15, format: formatCurrency },
    { header: 'GST (₹)', key: 'gst_amount', width: 12, format: formatCurrency },
    { header: 'Plan Name', key: 'plan_name', width: 18 },
    { header: 'Status', key: 'status', width: 15, format: formatStatus },
    { header: 'Razorpay Order ID', key: 'razorpay_order_id', width: 20 },
    { header: 'Razorpay Payment ID', key: 'razorpay_payment_id', width: 25 },
    { header: 'Created At', key: 'created_at', width: 20, format: formatDateIN },
  ];

  exportToExcel({
    filename: 'payments-report.xlsx',
    sheetName: 'Payments',
    columns,
    data: payments,
  });
};

/**
 * Export corporates data
 */
export const exportCorporatesData = (corporates: Record<string, unknown>[]): void => {
  if (!corporates || corporates.length === 0) {
    throw new Error('No corporate data to export');
  }

  const columns: ExportColumn[] = [
    { header: 'Corporate ID', key: 'id', width: 20 },
    { header: 'Corporate Name', key: 'name', width: 25 },
    { header: 'Admin Email', key: 'admin_email', width: 25 },
    { header: 'Coupon Code', key: 'coupon_code', width: 15 },
    { header: 'Total Members', key: 'member_count', width: 15 },
    { header: 'Status', key: 'is_active', width: 12, format: (v) => v ? 'Active' : 'Inactive' },
    { header: 'Created At', key: 'created_at', width: 20, format: formatDateIN },
  ];

  exportToExcel({
    filename: 'corporates-report.xlsx',
    sheetName: 'Corporates',
    columns,
    data: corporates,
  });
};

/**
 * Export withdrawals data
 */
export const exportWithdrawalsData = (withdrawals: Record<string, unknown>[]): void => {
  if (!withdrawals || withdrawals.length === 0) {
    throw new Error('No withdrawal data to export');
  }

  const columns: ExportColumn[] = [
    { header: 'Request ID', key: 'id', width: 20 },
    { header: 'User ID', key: 'user_id', width: 20 },
    { header: 'Full Name', key: 'full_name', width: 20 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Amount (₹)', key: 'amount', width: 15, format: formatCurrency },
    { header: 'Bank Account', key: 'bank_account_number', width: 20 },
    { header: 'IFSC Code', key: 'ifsc_code', width: 15 },
    { header: 'Status', key: 'status', width: 15, format: formatStatus },
    { header: 'Requested At', key: 'created_at', width: 20, format: formatDateIN },
    { header: 'Updated At', key: 'updated_at', width: 20, format: formatDateIN },
  ];

  exportToExcel({
    filename: 'withdrawals-report.xlsx',
    sheetName: 'Withdrawals',
    columns,
    data: withdrawals,
  });
};
