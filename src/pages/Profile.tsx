import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { uploadAvatar } from '@/lib/avatar-upload';
import { initials } from '@/lib/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';
import { ArrowLeft, Camera, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  sdr: 'SDR',
  tm: 'Gestor de Tráfego',
};

const homePathFor = (role: UserRole | null) =>
  role === 'admin' ? '/dashboard' : role === 'tm' ? '/tm' : '/';

export default function Profile() {
  const { user, role, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentName = (user?.user_metadata?.full_name as string) || '';
  const [name, setName] = useState(currentName);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    (user?.user_metadata?.avatar_url as string) || '',
  );
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const displayName = name || currentName || user?.email || '';

  const handleFile = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const { url, error } = await uploadAvatar(user.id, file);
      if (error || !url) {
        toast.error(error?.message || 'Falha ao enviar a imagem.');
        return;
      }
      const { error: saveError } = await updateProfile({ avatar_url: url });
      if (saveError) {
        toast.error(saveError.message);
        return;
      }
      setAvatarUrl(url);
      toast.success('Foto atualizada!');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    const { error } = await updateProfile({ avatar_url: '' });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAvatarUrl('');
    toast.success('Foto removida.');
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Informe seu nome.');
      return;
    }
    setSavingName(true);
    try {
      const { error } = await updateProfile({ full_name: trimmed });
      if (error) {
        toast.error(error.message);
        return;
      }
      setName(trimmed);
      toast.success('Nome atualizado!');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Link to={homePathFor(role)} aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua foto, nome e senha.</p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Foto e nome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <Avatar className="h-20 w-20 border border-border">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-gold-500 text-black text-xl font-bold">
                  {initials(displayName) || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? 'Enviando...' : 'Alterar foto'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="rounded-xl text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP — até 5 MB.</span>
              </div>
            </div>

            <form onSubmit={handleSaveName} className="space-y-2">
              <Label htmlFor="profile-name" className="text-sm text-muted-foreground">Nome</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="h-12 rounded-xl bg-background border-input focus:border-gold-500 focus:ring-gold-500"
                />
                <Button
                  type="submit"
                  disabled={savingName || name.trim() === currentName}
                  className="h-12 rounded-xl shrink-0 bg-gold-500 text-black hover:bg-gold-600"
                >
                  {savingName ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="text-sm text-foreground truncate">{user?.email}</p>
              </div>
              <div className="pt-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Perfil de acesso</p>
                <p className="text-sm text-foreground">{role ? ROLE_LABELS[role] : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Alterar senha</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm onSuccess={() => {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
