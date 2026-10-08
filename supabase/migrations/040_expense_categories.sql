-- ============================================================
-- KYRO: more detailed expense categories for Business Data
--
-- Adds day-to-day expense types (food, chai & snacks, petrol/diesel,
-- travel, electricity, phone & internet, stationery, courier, labour,
-- bank charges, professional fees, etc.) to business_data_entries.
-- Existing categories and rows are unchanged.
--
-- Additive, data-safe and safe to re-run.
-- ============================================================

alter table public.business_data_entries
  drop constraint if exists business_data_entries_category_check;

alter table public.business_data_entries
  add constraint business_data_entries_category_check check (
    category in (
      'product_purchase',
      'rent',
      'salary',
      'food',
      'tea_snacks',
      'fuel',
      'transport',
      'travel',
      'electricity',
      'utilities',
      'phone_internet',
      'stationery',
      'office_supplies',
      'courier',
      'packaging',
      'labour',
      'cleaning',
      'maintenance',
      'marketing',
      'bank_charges',
      'professional_fees',
      'insurance',
      'taxes_fees',
      'staff_welfare',
      'medical',
      'donations',
      'misc'
    )
  );
