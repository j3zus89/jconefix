'use client';

import { useState } from 'react';
import { X, Building2, Mail, Lock, Copy, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatPlanPeriodLabel, type BillingCycle, type PlanType } from '@/lib/org-plan';
import { countryLabel, type OrgCountry } from '@/lib/locale';

interface NewOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

interface CreatedOrgData {
  name: string;
  email: string;
  password: string;
  plan_type: PlanType;
  billing_cycle: BillingCycle;
  planLabel: string;
  license_expires_at: string;
  slug: string;
  loginUrl: string;
}

export default function NewOrganizationModal({ isOpen, onClose, onSuccess }: NewOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<CreatedOrgData | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    plan_type: 'basico' as PlanType,
    billing_cycle: 'mensual' as BillingCycle,
  });

  const supabase = createClient();

  const generateSlug = (name: string): string => {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `${baseSlug}-${randomSuffix}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/create-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          plan_type: formData.plan_type,
          billing_cycle: formData.billing_cycle,
          country: 'AR' as OrgCountry,
          currency: 'ARS',
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la organización');
      }

      const pt = result.data.plan_type as PlanType;
      const bc = result.data.billing_cycle as BillingCycle;
      const licenseAt = result.data.license_expires_at as string;
      setCreatedOrg({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        plan_type: pt,
        billing_cycle: bc,
        planLabel: formatPlanPeriodLabel(pt, bc),
        license_expires_at: licenseAt,
        slug: result.data.slug,
        loginUrl: `${window.location.origin}/login`,
      });

      setShowSuccess(true);
      setLoading(false);
      toast.success('✅ ¡Organización creada! Recargando...');
      
      // Cerrarse después de 2 segundos y recargar
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Error al crear la organización');
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', password: '', plan_type: 'profesional', billing_cycle: 'mensual' });
    setShowSuccess(false);
    setCreatedOrg(null);
    onClose();
  };

  if (!isOpen) return null;

  if (showSuccess && createdOrg) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-900">¡Organización Creada!</h2>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <p className="text-green-800 font-medium mb-4">
              Copia estos datos y envíalos al cliente por WhatsApp:
            </p>
            
            <div className="space-y-3">
              <div className="bg-white rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Nombre del Taller</p>
                  <p className="font-semibold text-gray-900">{createdOrg.name}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(createdOrg.name)}
                  className="text-[#0d9488] hover:text-[#0f766e]"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-white rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Email de Acceso</p>
                  <p className="font-semibold text-gray-900">{createdOrg.email}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(createdOrg.email)}
                  className="text-[#0d9488] hover:text-[#0f766e]"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-white rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Contraseña Temporal</p>
                  <p className="font-semibold text-gray-900">{createdOrg.password}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(createdOrg.password)}
                  className="text-[#0d9488] hover:text-[#0f766e]"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-white rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Plan y periodo</p>
                  <p className="font-semibold text-gray-900">{createdOrg.planLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Caduca: {new Date(createdOrg.license_expires_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(createdOrg.planLabel)}
                  className="text-[#0d9488] hover:text-[#0f766e]"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>

              <div className="bg-white rounded p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">URL de Acceso</p>
                  <p className="font-semibold text-gray-900 text-sm">{createdOrg.loginUrl}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(createdOrg.loginUrl)}
                  className="text-[#0d9488] hover:text-[#0f766e]"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                const message = `🎉 ¡Bienvenido a JC ONE FIX!\n\n` +
                  `Tu taller "${createdOrg.name}" ya está listo.\n\n` +
                  `📧 Email: ${createdOrg.email}\n` +
                  `🔑 Contraseña: ${createdOrg.password}\n` +
                  `📦 Plan: ${createdOrg.planLabel}\n` +
                  `📅 Licencia hasta: ${new Date(createdOrg.license_expires_at).toLocaleDateString('es-ES')}\n` +
                  `🌐 Acceso: ${createdOrg.loginUrl}\n\n` +
                  `Cambia tu contraseña al iniciar sesión.`;
                copyToClipboard(message);
              }}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
            >
              <Copy className="h-5 w-5" />
              Copiar Todo para WhatsApp
            </button>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Nueva Organización</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="h-4 w-4 inline mr-2" />
              Nombre del Taller
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Reparaciones Paco"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email del Dueño
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="dueño@taller.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="h-4 w-4 inline mr-2" />
              Contraseña Temporal
            </label>
            <input
              type="text"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">El cliente podrá cambiarla después</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Periodo de facturación</label>
            <p className="text-xs text-gray-500 mb-2">Plan licencia JC ONE FIX (ARS; importe acordado con comercial).</p>
            <select
              value={formData.billing_cycle}
              onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as BillingCycle })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent"
            >
              <option value="mensual">Mensual (licencia +30 días desde hoy)</option>
              <option value="anual">Anual (licencia +365 días desde hoy)</option>
            </select>
          </div>

          <p className="text-xs text-gray-500 -mt-2 mb-2">
            País y moneda del taller: <strong>{countryLabel('AR')}</strong> (ARS).
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              La fecha de caducidad de la licencia se calcula al crear la organización (30 o 365 días). El cobro fuera de
              la app; aquí activas el acceso con el plan estándar ilimitado.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Organización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
