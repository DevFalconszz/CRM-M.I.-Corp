import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadStatus, STATUS_LABELS } from '@/lib/types';

interface Props {
  value: LeadStatus;
  onChange: (v: LeadStatus) => void;
}

const statusStyles: Record<string, string> = {
  analise_pendente: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  em_analise: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  ponto_contato: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  mensagem_enviada: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  follow_up: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  reuniao_agendada: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  recusado: 'bg-red-500/15 text-red-700 dark:text-red-400',
  venda_fechada: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

const STATUSES: LeadStatus[] = [
  'analise_pendente', 'em_analise', 'ponto_contato', 'mensagem_enviada', 'follow_up',
  'reuniao_agendada', 'recusado', 'venda_fechada',
];

export function StatusSelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LeadStatus)}>
      <SelectTrigger className={`w-[170px] h-8 text-xs rounded-lg font-medium border-0 ${statusStyles[value] || ''}`}>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
