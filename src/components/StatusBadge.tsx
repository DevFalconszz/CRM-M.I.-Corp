import { LeadStatus, STATUS_LABELS } from '@/lib/types';

const config: Record<LeadStatus, { label: string; bg: string; text: string }> = {
  analise_pendente: { label: STATUS_LABELS.analise_pendente, bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400' },
  em_analise: { label: STATUS_LABELS.em_analise, bg: 'bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
  ponto_contato: { label: STATUS_LABELS.ponto_contato, bg: 'bg-pink-500/15', text: 'text-pink-700 dark:text-pink-400' },
  follow_up: { label: STATUS_LABELS.follow_up, bg: 'bg-sky-500/15', text: 'text-sky-700 dark:text-sky-400' },
  reuniao_agendada: { label: STATUS_LABELS.reuniao_agendada, bg: 'bg-violet-500/15', text: 'text-violet-700 dark:text-violet-400' },
  recusado: { label: STATUS_LABELS.recusado, bg: 'bg-red-500/15', text: 'text-red-700 dark:text-red-400' },
  venda_fechada: { label: STATUS_LABELS.venda_fechada, bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400' },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const c = config[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
