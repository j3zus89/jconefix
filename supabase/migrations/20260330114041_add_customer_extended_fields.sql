/*
  # Add extended customer fields

  ## Overview
  Adds additional fields to the customers table to support the advanced customer management 
  features shown in the reference UI, including organization info, ID verification, 
  GDPR compliance, and communication preferences.

  ## Modified Tables

  ### `customers`
  New columns added:
  - `first_name` (text) - Customer first name
  - `last_name` (text) - Customer last name
  - `organization` (text) - Company/organization name
  - `customer_group` (text) - Customer group classification (Individual, Business, VIP, etc.)
  - `how_did_you_find_us` (text) - Referral source
  - `tax_class` (text) - Tax classification
  - `work_network` (text) - Work network info
  - `address2` (text) - Additional address line (apartment, floor, etc.)
  - `city` (text) - City
  - `state` (text) - State/province
  - `postal_code` (text) - Postal/ZIP code
  - `country` (text) - Country
  - `id_type` (text) - ID document type
  - `id_number` (text) - ID number
  - `drivers_license` (text) - Driver's license number
  - `mailchimp_status` (text) - MailChimp subscription status
  - `gdpr_consent` (boolean) - GDPR compliance consent
  - `email_notifications` (boolean) - Email notification preference
  - `contact_person` (text) - Emergency/secondary contact name
  - `contact_phone` (text) - Emergency/secondary contact phone
  - `contact_relation` (text) - Relationship to contact person
  - `tags` (text) - Comma-separated tags

  ## Important Notes
  - All new columns are nullable to not break existing records
  - No data is lost; this is purely additive
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'first_name') THEN
    ALTER TABLE customers ADD COLUMN first_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_name') THEN
    ALTER TABLE customers ADD COLUMN last_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'organization') THEN
    ALTER TABLE customers ADD COLUMN organization text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'customer_group') THEN
    ALTER TABLE customers ADD COLUMN customer_group text DEFAULT 'Individual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'how_did_you_find_us') THEN
    ALTER TABLE customers ADD COLUMN how_did_you_find_us text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tax_class') THEN
    ALTER TABLE customers ADD COLUMN tax_class text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'work_network') THEN
    ALTER TABLE customers ADD COLUMN work_network text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address2') THEN
    ALTER TABLE customers ADD COLUMN address2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'city') THEN
    ALTER TABLE customers ADD COLUMN city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'state') THEN
    ALTER TABLE customers ADD COLUMN state text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'postal_code') THEN
    ALTER TABLE customers ADD COLUMN postal_code text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'country') THEN
    ALTER TABLE customers ADD COLUMN country text DEFAULT 'España';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'id_type') THEN
    ALTER TABLE customers ADD COLUMN id_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'id_number') THEN
    ALTER TABLE customers ADD COLUMN id_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'drivers_license') THEN
    ALTER TABLE customers ADD COLUMN drivers_license text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'mailchimp_status') THEN
    ALTER TABLE customers ADD COLUMN mailchimp_status text DEFAULT 'No suscrito';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'gdpr_consent') THEN
    ALTER TABLE customers ADD COLUMN gdpr_consent boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'email_notifications') THEN
    ALTER TABLE customers ADD COLUMN email_notifications boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_person') THEN
    ALTER TABLE customers ADD COLUMN contact_person text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_phone') THEN
    ALTER TABLE customers ADD COLUMN contact_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'contact_relation') THEN
    ALTER TABLE customers ADD COLUMN contact_relation text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tags') THEN
    ALTER TABLE customers ADD COLUMN tags text;
  END IF;
END $$;
