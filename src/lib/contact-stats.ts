import { supabase } from '@/integrations/supabase/client';

/**
 * Métricas de primeiro contato.
 *
 * Os envios são registrados em `lead_reports` no momento em que o SDR abre a
 * conversa, com o marcador abaixo. Isso dá respaldo auditável (quem, quando e
 * para qual lead) sem depender de automação de WhatsApp.
 */
export const CONTACT_MARKER = '[MENSAGEM ENVIADA]';

export interface ContactEvent {
  user_id: string;
  created_at: string;
}

export const CONTACT_REPORT_PREFIX = `${CONTACT_MARKER} Primeiro contato no WhatsApp`;

export function toLocalISODate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfLocalDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Busca os eventos de contato a partir de uma data (ISO).
 * Falhas de RLS/rede retornam lista vazia para não quebrar as telas.
 */
export async function fetchContactEvents(sinceISO: string, untilISO?: string): Promise<ContactEvent[]> {
  let query = supabase
    .from('lead_reports')
    .select('user_id,created_at')
    .like('content', `${CONTACT_MARKER}%`)
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (untilISO) query = query.lte('created_at', untilISO);

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao carregar eventos de contato:', error);
    return [];
  }
  return (data || []) as ContactEvent[];
}

export async function fetchContactEventsForDay(date: Date): Promise<ContactEvent[]> {
  return fetchContactEvents(startOfLocalDay(date), endOfLocalDay(date));
}

export function countByUser(events: ContactEvent[], userId?: string): number {
  if (!userId) return events.length;
  return events.filter((e) => e.user_id === userId).length;
}

/** Agrupa por dia local: { '2026-10-20': 12 } */
export function groupByDay(events: ContactEvent[]): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, e) => {
    const key = toLocalISODate(e.created_at);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/** Agrupa por usuário + dia local: { 'user__2026-10-20': 3 } */
export function groupByUserAndDay(events: ContactEvent[]): Record<string, number> {
  return events.reduce<Record<string, number>>((acc, e) => {
    const key = `${e.user_id}__${toLocalISODate(e.created_at)}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

/** Série dos últimos N dias (inclui hoje), pronta para gráfico. */
export function buildDaySeries(events: ContactEvent[], days = 7): { date: string; label: string; enviadas: number }[] {
  const grouped = groupByDay(events);
  const out: { date: string; label: string; enviadas: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = toLocalISODate(d);
    out.push({
      date: iso,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      enviadas: grouped[iso] || 0,
    });
  }
  return out;
}
