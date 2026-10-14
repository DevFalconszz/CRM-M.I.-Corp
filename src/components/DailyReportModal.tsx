import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Portal } from '@/components/Portal';

interface Props {
  date: Date;
  /** Quando true, o modal é obrigatório e não pode ser fechado sem salvar. */
  blocking?: boolean;
  onClose: () => void;
  onSaved: () => void;
  saveFn: (date: string, content: string) => Promise<boolean>;
}

const ptMonths = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const weekdays = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

export function DailyReportModal({ date, blocking, onClose, onSaved, saveFn }: Props) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Descreva o que aconteceu no dia para continuar.');
      return;
    }
    setSaving(true);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const ok = await saveFn(iso, content.trim());
    setSaving(false);
    if (ok) {
      toast.success('Relatório salvo!');
      onSaved();
    } else {
      toast.error('Erro ao salvar o relatório. Tente novamente.');
    }
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-start justify-center overflow-y-auto custom-scrollbar p-4">
      <div className="w-full max-w-lg my-auto rounded-2xl border border-border bg-card shadow-xl p-6">
        {blocking && (
          <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400 text-sm">
            <Lock className="w-4 h-4" />
            Relatório obrigatório para continuar trabalhando
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Relatório Diário</h2>
          {!blocking && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">Fechar</Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 capitalize">
          {weekdays[date.getDay()]}, {date.getDate()} de {ptMonths[date.getMonth()]} de {date.getFullYear()}
        </p>

        <textarea
          className="w-full mt-4 min-h-[160px] rounded-xl border border-input bg-background text-foreground p-3 text-sm focus:border-gold-500 focus:ring-gold-500 outline-none"
          placeholder="Descreva aqui o que foi feito no dia: prospecções realizadas, ligações, reuniões, dificuldades, próximos passos..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />

        <Button
          className="w-full h-12 rounded-xl text-base font-semibold bg-gold-500 text-black hover:bg-gold-600 mt-4"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
          {saving ? 'Salvando...' : 'Enviar Relatório'}
        </Button>
      </div>
    </div>
    </Portal>
  );
}