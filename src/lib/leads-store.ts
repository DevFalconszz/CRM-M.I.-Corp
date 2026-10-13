import { supabase } from '@/integrations/supabase/client';
import { DailyReport, Lead, LeadReport } from './types';

/** Exclui um lead — via RPC para bypass de RLS (admin pode excluir qualquer um). */
export async function deleteLead(id: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('admin_delete_lead', { p_lead_id: id });
  if (error) { console.error('deleteLead error:', error); return false; }
  if (!data) { console.warn('deleteLead:nenhum lead excluído'); return false; }
  return true;
}

/** Transfere um lead para outro usuário — via RPC para bypass de RLS. */
export async function transferLead(leadId: string, targetUserId: string, targetUserName: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('admin_transfer_lead', {
    p_lead_id: leadId,
    p_target_user_id: targetUserId,
    p_target_user_name: targetUserName,
  });
  if (error) { console.error('transferLead error:', error); return false; }
  if (!data) { console.warn('transferLead:nenhum lead transferido'); return false; }
  return true;
}

export async function loadAllLeadNames(): Promise<Set<string>> {
  const { data, error } = await (supabase.rpc as any)('get_all_lead_names');
  if (error) {
    console.error('Erro ao carregar nomes de leads (global):', error);
    return new Set();
  }
  return new Set((data || []).map((row: any) => row.name_key));
}

function rowToLead(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    category: row.category,
    address: row.address,
    city: row.city,
    state: row.state,
    phone: row.phone,
    website: row.website,
    google_maps_url: row.google_maps_url,
    rating: row.rating,
    reviews_count: row.reviews_count,
    instagram: row.instagram,
    responsavel: row.responsavel,
    descricao: row.descricao,
    status: row.status as Lead['status'],
    whatsapp_group: row.whatsapp_group,
    meeting_dates: row.meeting_dates || [],
    nome_decisor: row.nome_decisor || '',
    numero_decisor: row.numero_decisor || '',
    has_ads: row.has_ads ?? null,
    meta_has_ads: row.meta_has_ads ?? null,
    google_ads_count: row.google_ads_count ?? 0,
    source: row.source ?? null,
    campaign_id: row.campaign_id ?? null,
    user_id: row.user_id ?? null,
  };
}

export async function loadLeads(): Promise<Lead[]> {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error loading leads:', error); return []; }
  return (data || []).map(rowToLead);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => '\\' + m);
}

/** Busca um lead já existente com o mesmo nome (case/whitespace insensível). */
async function findLeadByName(name: string): Promise<Lead | null> {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .ilike('name', escapeLike(trimmed))
    .limit(1);
  if (error) { console.error('findLeadByName error:', error); return null; }
  if (!data || data.length === 0) return null;
  return rowToLead(data[0]);
}

export async function insertLead(lead: Omit<Lead, 'id'>): Promise<Lead | null> {
  const { data: { user } } = await supabase.auth.getUser();

  // Duplicado já existe? Retorna o existente em vez de inserir de novo
  // (evita duplicar o mesmo negócio por clique duplo ou nova busca repetida).
  const existing = await findLeadByName(lead.name);
  if (existing) return existing;

  const { data, error } = await supabase.from('leads').insert({
    name: lead.name, title: lead.title, category: lead.category, address: lead.address,
    city: lead.city, state: lead.state, phone: lead.phone, website: lead.website,
    google_maps_url: lead.google_maps_url, rating: lead.rating, reviews_count: lead.reviews_count,
    instagram: lead.instagram, responsavel: lead.responsavel, descricao: lead.descricao,
    status: lead.status, whatsapp_group: lead.whatsapp_group, meeting_dates: lead.meeting_dates,
    nome_decisor: lead.nome_decisor, numero_decisor: lead.numero_decisor,
    has_ads: lead.has_ads ?? null,
    meta_has_ads: lead.meta_has_ads ?? null,
    google_ads_count: lead.google_ads_count ?? 0,
    source: lead.source ?? null,
    user_id: user?.id,
  }).select().single();

  if (error) {
    if (error.code === '23505') {
      // Corrida: outro insert criou o mesmo nome no meio tempo. Retorna o existente.
      return findLeadByName(lead.name);
    }
    console.error('Error inserting lead:', error);
    return null;
  }
  return rowToLead(data);
}

export async function insertLeads(leads: Omit<Lead, 'id'>[]): Promise<Lead[]> {
  const { data: { user } } = await supabase.auth.getUser();
  // Evita duplicados no mesmo lote (mesmo nome) antes do insert.
  const seen = new Set<string>();
  const unique = leads.filter((l) => {
    const key = (l.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const { data, error } = await supabase.from('leads').insert(unique.map(l => ({
    name: l.name, title: l.title, category: l.category, address: l.address,
    city: l.city, state: l.state, phone: l.phone, website: l.website,
    google_maps_url: l.google_maps_url, rating: l.rating, reviews_count: l.reviews_count,
    instagram: l.instagram, responsavel: l.responsavel, descricao: l.descricao,
    status: l.status, whatsapp_group: l.whatsapp_group, meeting_dates: l.meeting_dates,
    nome_decisor: l.nome_decisor, numero_decisor: l.numero_decisor,
    user_id: user?.id,
  }))).select();
  if (error) { console.error('Error inserting leads:', error); return []; }
  return (data || []).map(rowToLead);
}

export async function updateLead(lead: Lead): Promise<boolean> {
  const { error } = await supabase.from('leads').update({
    name: lead.name, title: lead.title, category: lead.category, address: lead.address,
    city: lead.city, state: lead.state, phone: lead.phone, website: lead.website,
    google_maps_url: lead.google_maps_url, rating: lead.rating, reviews_count: lead.reviews_count,
    instagram: lead.instagram, responsavel: lead.responsavel, descricao: lead.descricao,
    status: lead.status, whatsapp_group: lead.whatsapp_group, meeting_dates: lead.meeting_dates,
    nome_decisor: lead.nome_decisor, numero_decisor: lead.numero_decisor,
  }).eq('id', lead.id);
  if (error) { console.error('Error updating lead:', error); return false; }
  return true;
}

// ============================================================
// Relatórios diários (SDR)
// ============================================================
export async function loadMyDailyReports(): Promise<DailyReport[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .order('report_date', { ascending: false });
  if (error) {
    console.error('Error loading daily reports:', error);
    return [];
  }
  return (data || []) as DailyReport[];
}

export async function upsertDailyReport(reportDate: string, content: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('daily_reports').upsert(
    {
      user_id: user?.id,
      report_date: reportDate,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,report_date' },
  );
  if (error) {
    console.error('Error saving daily report:', error);
    return false;
  }
  return true;
}

// ============================================================
// Relatórios/anotações por lead
// ============================================================
export async function loadLeadReports(leadId: string): Promise<LeadReport[]> {
  const { data, error } = await supabase
    .from('lead_reports')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error loading lead reports:', error);
    return [];
  }
  return (data || []) as LeadReport[];
}

export async function addLeadReport(leadId: string, content: string): Promise<LeadReport | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('lead_reports')
    .insert({ lead_id: leadId, user_id: user?.id, content })
    .select()
    .single();
  if (error) {
    console.error('Error adding lead report:', error);
    return null;
  }
  return data as LeadReport;
}

export async function updateLeadReport(reportId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_reports')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) {
    console.error('Error updating lead report:', error);
    return false;
  }
  return true;
}

export async function deleteLeadReport(reportId: string): Promise<boolean> {
  const { error } = await supabase.from('lead_reports').delete().eq('id', reportId);
  if (error) {
    console.error('Error deleting lead report:', error);
    return false;
  }
  return true;
}
