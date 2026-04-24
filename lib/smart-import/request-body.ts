import { z } from 'zod';
import { SMART_IMPORT_MAX_ROWS } from '@/lib/smart-import/constants';

export const smartImportGridSchema = z.object({
  mode: z.enum(['customers_only', 'customers_and_tickets']),
  headers: z.array(z.string()).max(256),
  rows: z.array(z.array(z.string())).max(SMART_IMPORT_MAX_ROWS),
  mapping: z.record(z.string(), z.union([z.string(), z.null()]).optional()),
});

export type SmartImportGridPayload = z.infer<typeof smartImportGridSchema>;
