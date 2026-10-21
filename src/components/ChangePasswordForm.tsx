import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordFormProps {
  onSuccess: () => void;
  submitLabel?: string;
}

export function ChangePasswordForm({ onSuccess, submitLabel = 'Salvar nova senha' }: ChangePasswordFormProps) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Senha alterada! Entre novamente com a nova senha.');
        setPassword('');
        setConfirm('');
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password" className="text-sm text-muted-foreground">Nova senha</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl bg-background border-input focus:border-gold-500 focus:ring-gold-500 pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirmar nova senha</Label>
        <Input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-12 rounded-xl bg-background border-input focus:border-gold-500 focus:ring-gold-500"
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-base font-semibold bg-gold-500 text-black hover:bg-gold-600"
        disabled={submitting}
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5 mr-2" />}
        {submitting ? 'Salvando...' : submitLabel}
      </Button>
    </form>
  );
}