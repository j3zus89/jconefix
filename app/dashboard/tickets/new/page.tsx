'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Loader as Loader2, Search, User, History, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveOrganizationId } from '@/lib/dashboard-org';
import { isUuid } from '@/lib/panel-notifications';
import { humanizeRepairTicketsSchemaError } from '@/lib/supabase-setup-hints';
import { reserveNextBoletoTicketNumber } from '@/lib/boleto-ticket-number';
import { fetchTicketRepairsSettingsForOrg } from '@/lib/fetch-ticket-repairs-settings-org';
import type { TicketNumberStyle } from '@/lib/ticket-repairs-settings';
import { useOrgLocale } from '@/lib/hooks/useOrgLocale';
import { repairCaseTerms } from '@/lib/locale';
import { dashboardFormSectionTitle } from '@/components/dashboard/dashboard-form-styles';
import {
  newTicketFormSchema,
  type NewTicketFormValues,
} from '@/lib/form-schemas/high-risk-forms';

const TICKET_FORM_DEFAULTS: NewTicketFormValues = {
  customer_id: '',
  device_type: '',
  device_brand: '',
  device_category: '',
  device_model: '',
  device_screen_inches: '',
  serial_number: '',
  imei: '',
  issue_description: '',
  issue_title: 'Título del problema',
  status: 'open',
  priority: 'medium',
  task_type: '',
  estimated_cost: '',
  final_cost: '',
  deposit_amount: '',
  notes: '',
  diagnostic_notes: '',
  device_pin: '',
  unlock_pattern: '',
  warranty_info: '',
  assigned_to: '',
  is_urgent: false,
  is_draft: false,
};

export default function NewTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTicketId = searchParams.get('edit');
  const supabase = createClient();
  const ticketRf = useForm<NewTicketFormValues>({
    resolver: zodResolver(newTicketFormSchema),
    defaultValues: TICKET_FORM_DEFAULTS,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const persistTicket = async (values: NewTicketFormValues) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required');
        return;
      }

      const orgId = await getActiveOrganizationId(supabase);
      if (!orgId) {
        toast.error('No active organization');
        return;
      }

      const payload = {
        issue_title: values.issue_title,
        issue_description: values.issue_description,
        priority: values.priority,
        status: values.status,
        customer_id: values.customer_id || null,
        assigned_to: values.assigned_to || null,
        estimated_cost: values.estimated_cost ? parseFloat(values.estimated_cost) : null,
        final_cost: values.final_cost ? parseFloat(values.final_cost) : null,
        deposit_amount: values.deposit_amount ? parseFloat(values.deposit_amount) : null,
        notes: values.notes || null,
        organization_id: orgId,
        user_id: user.id,
      };

      let data, error;
      if (editTicketId) {
        const res = await supabase
          .from('tickets')
          .update(payload)
          .eq('id', editTicketId)
          .select()
          .single();
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase
          .from('tickets')
          .insert([payload])
          .select()
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      toast.success(editTicketId ? 'Ticket updated' : 'Ticket created');
      router.push(`/dashboard/tickets/${data.id}`);
    } catch (error) {
      toast.error(humanizeRepairTicketsSchemaError(error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = ticketRf.handleSubmit(persistTicket);

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="max-w-[1360px] mx-auto px-4 py-3 sm:px-5">
        <h1 className="text-xl font-bold text-gray-900 mb-3 sm:text-2xl">
          {editTicketId ? 'Edit Ticket' : 'Create New Ticket'}
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4">
              <h2 className={dashboardFormSectionTitle}>Ticket Information</h2>
              
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    {...ticketRf.register('issue_title')}
                    placeholder="Ticket title"
                    
                  />
                </div>

                <div>
                  <Label>Description *</Label>
                  <Textarea
                    {...ticketRf.register('issue_description')}
                    placeholder="Detailed description"
                    rows={4}
                    
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={ticketRf.watch('priority')}
                      onValueChange={(v) => ticketRf.setValue('priority', v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select
                      value={ticketRf.watch('status')}
                      onValueChange={(v) => ticketRf.setValue('status', v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Estimated Cost</Label>
                    <Input
                      {...ticketRf.register('estimated_cost')}
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label>Final Cost</Label>
                    <Input
                      {...ticketRf.register('final_cost')}
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label>Deposit Amount</Label>
                    <Input
                      {...ticketRf.register('deposit_amount')}
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    {...ticketRf.register('notes')}
                    placeholder="Additional notes"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/tickets')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTicketId ? 'Update Ticket' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
