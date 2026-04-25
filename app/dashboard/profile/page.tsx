'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, Mail, Phone, Building, MapPin, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadProfileAvatar } from '@/lib/upload-profile-avatar';

export default function ProfilePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    avatar_url: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        const full = (data as { full_name?: string }).full_name?.trim() || '';
        const parts = full.split(/\s+/).filter(Boolean);
        const inferredFirst = (data as { first_name?: string }).first_name ?? parts[0] ?? '';
        const inferredLast =
          (data as { last_name?: string }).last_name ??
          (parts.length > 1 ? parts.slice(1).join(' ') : '');

        setProfile({
          first_name: inferredFirst,
          last_name: inferredLast,
          email: user.email || '',
          phone: (data as { phone?: string }).phone || '',
          company: (data as { company?: string }).company || '',
          address: (data as { address?: string }).address || '',
          avatar_url: (data as { avatar_url?: string }).avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sesión no válida');
        return;
      }
      const url = await uploadProfileAvatar(supabase, user.id, file);
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          avatar_url: url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (error) throw error;
      setProfile((p) => ({ ...p, avatar_url: url }));
      window.dispatchEvent(new CustomEvent('jc-profile-avatar-updated'));
      toast.success('Foto de perfil actualizada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo subir la imagen';
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        company: profile.company,
        address: profile.address,
        avatar_url: profile.avatar_url || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Perfil actualizado correctamente');
      window.dispatchEvent(new CustomEvent('jc-profile-avatar-updated'));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al guardar: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const initials =
    `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.trim() ||
    profile.email?.[0]?.toUpperCase() ||
    '?';

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mi perfil</h1>

      <div className="grid gap-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          aria-hidden
          onChange={handleAvatarFile}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-2 border-gray-100">
                  {profile.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-[#0d9488] text-white text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-[#0d9488] text-white p-1.5 rounded-full hover:bg-[#0f766e] disabled:opacity-50 shadow-md"
                  title="Cambiar foto de perfil"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-gray-500">{profile.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, WebP o GIF · máximo 15 MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#0d9488]" />
              Información personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellidos</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Correo electrónico
              </Label>
              <Input id="email" value={profile.email} disabled className="bg-gray-100" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[#0d9488]" />
              Empresa / taller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Nombre de la empresa</Label>
              <Input
                id="company"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección
              </Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0d9488] hover:bg-[#0f766e]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
