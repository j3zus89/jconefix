-- Renombrar grupo de cliente "Individual" → "Particular" (UI en español).
UPDATE customers
SET customer_group = 'Particular'
WHERE customer_group = 'Individual';
