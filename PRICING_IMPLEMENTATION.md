# Pricing Management - Implementation Guide

## Overview
The Playoga Admin Platform now has a complete pricing management system integrated with the existing backend. This guide explains how the system works end-to-end.

## Architecture

```
Admin Dashboard (React/TypeScript)
        ↓
  PricingPage.tsx
        ↓
  PricingForm.tsx (Form & Validation)
        ↓
  Supabase Edge Function (update-pricing-settings)
        ↓
  pricing_settings Table
        ↓
  User App (Auto-updates)
        ↓
  Razorpay Checkout (Uses new amount)
```

## File Structure

```
src/
├── pages/admin/
│   └── PricingPage.tsx          # Main pricing management page
├── components/admin/
│   └── PricingForm.tsx          # Form component with validation
├── types/
│   └── permissions.ts           # Updated with 'pricing' module
├── constants/
│   └── navItems.ts              # Added /pricing route
└── App.tsx                       # Added pricing route
```

## How It Works

### 1. Admin Navigation
- Admin logs in and navigates to "Pricing" in sidebar
- Route: `/admin/pricing`
- Protected by permission system

### 2. Fetch Pricing Data
```typescript
// PricingPage fetches current pricing
const { data } = await supabase
  .from('pricing_settings')
  .select('*')
  .eq('is_active', true)
```

### 3. Display Pricing
- Shows pricing in two formats:
  - Card grid view (overview)
  - Detailed table (all fields)
- Shows plan name, base price, GST, final price, billing cycle, status, last updated

### 4. Edit Pricing
- Admin clicks "Edit" on any plan
- Form opens with current values
- Admin can update:
  - Plan Name
  - Base Price
  - GST Rate
  - Billing Cycle
  - Active Status
  - Change Reason (audit trail)

### 5. Live Price Preview
- As admin types, GST is calculated in real-time
- Shows: Base Price + GST = Final Price
- **Important**: This is display only, backend controls actual amount

### 6. Form Validation
Frontend validation:
- Plan name required
- Base price > 0
- GST rate between 0 and 1
- Required fields not empty

Backend validation (separate):
- Amount verification
- Data integrity checks
- Security validation

### 7. Confirmation Dialog
- Before saving, admin sees confirmation dialog
- Shows the new final price
- Admin confirms the update

### 8. Backend Update
```typescript
const { data, error } = await supabase.functions.invoke('update-pricing-settings', {
  body: {
    planKey,
    planName,
    basePrice,
    gstRate,
    billingCycle,
    changeReason,
  }
});
```

### 9. Success Notification
- Toast shows "Pricing updated successfully!"
- Form closes
- Pricing list refreshes
- User app automatically reflects new pricing

### 10. User App Updates
- User app continuously syncs with pricing_settings table
- New pricing available immediately
- No app redeploy needed
- Razorpay uses latest amount from backend

## Key Features

### Live Price Preview
```
Base Price:    ₹1299
GST (5%):      ₹64.95
─────────────────────
Final Price:   ₹1363.95
```

### Error Handling
- Network errors → "Failed to update pricing"
- Authorization errors → "Unauthorized - Please log in again"
- Permission errors → "Forbidden - You don't have permission"
- Validation errors → Specific field messages
- Backend errors → User-friendly messages

### Audit Trail
- Change reason stored in database
- Timestamp of every update
- Admin who made the change
- All updates logged for compliance

### Permission Control
- Admins with "pricing" read permission → Can view
- Admins with "pricing" update permission → Can edit
- Super admins → Can do everything

## Testing the Integration

### Test Create New Plan
1. Go to `/admin/pricing`
2. Click "Add New Plan"
3. Fill form:
   - Plan Name: "Test Plan"
   - Base Price: 999
   - GST Rate: 0.18
   - Billing Cycle: monthly
4. Confirm and save

### Test Edit Existing Plan
1. Go to `/admin/pricing`
2. Click "Edit" on a plan
3. Change base price
4. Watch live preview update
5. Confirm and save

### Test Error Cases
1. Try submitting with empty plan name
2. Try base price = 0
3. Try GST > 1
4. Check network error handling

### Test in User App
1. After saving pricing in admin
2. Open user app
3. Navigate to pricing page
4. Verify new price is shown
5. Click buy
6. Verify Razorpay shows new amount

## Database Schema

The `pricing_settings` table has:
- `id` - UUID primary key
- `plan_key` - Unique plan identifier
- `plan_name` - Display name
- `base_price` - Price before GST (decimal)
- `gst_rate` - GST percentage (0-1)
- `final_price` - Calculated price (base + GST)
- `currency` - Currency code (₹)
- `billing_cycle` - monthly/quarterly/half-yearly/yearly
- `is_active` - Boolean flag
- `last_updated` - Timestamp
- `change_reason` - Audit trail
- `created_at` - Record creation time

## Security Considerations

### Frontend (This Implementation)
- ✓ Form validation
- ✓ User permission checks
- ✓ Authenticated API calls
- ✓ Error handling
- ✗ Does NOT control final amount (that's backend's job)

### Backend (Already Implemented)
- ✓ Authentication & authorization
- ✓ Amount validation & verification
- ✓ GST calculation validation
- ✓ Rate limiting
- ✓ Audit logging
- ✓ Subscription activation logic

### Important Security Notes
1. **Never trust frontend amounts** - Backend always validates
2. **Backend is source of truth** - Admin form is for display/editing only
3. **Secrets not exposed** - All API calls use authenticated client
4. **Permission-based access** - RBAC system enforces permissions
5. **Audit trail** - All changes logged with reason and timestamp

## Troubleshooting

### Problem: Pricing not updating
**Solution**: 
1. Check network tab for failed requests
2. Verify auth token is valid
3. Check backend logs for update-pricing-settings errors
4. Verify permissions for logged-in admin

### Problem: Form won't submit
**Solution**:
1. Check all fields are filled
2. Verify base price > 0
3. Verify GST between 0-1
4. Check browser console for validation errors

### Problem: Price preview not calculating
**Solution**:
1. Check base price is entered
2. Verify GST rate is in decimal format
3. Refresh page to reset form

### Problem: Unauthorized error
**Solution**:
1. User needs "pricing" module read permission
2. Need "pricing" module update permission to save
3. Check with super admin to grant permissions

## Next Steps (Optional Enhancements)

1. Add pricing history view
2. Add bulk pricing updates
3. Add pricing analytics
4. Add discount code management
5. Add pricing templates
6. Add A/B testing for pricing

## Backend Edge Function

The `update-pricing-settings` function already exists and handles:
- Validating the update request
- Calculating final price with GST
- Updating pricing_settings table
- Creating audit log entry
- Notifying other services
- Returning success/error response

This admin UI simply calls that function with the updated values.

## Conclusion

The pricing management system is now fully integrated with:
- ✓ Admin UI for pricing management
- ✓ Real-time preview
- ✓ Backend API integration
- ✓ User app auto-sync
- ✓ Permission-based access
- ✓ Error handling
- ✓ Audit trail

Everything is production-ready and follows the Playoga Admin Platform design patterns.
