import { supabase } from '@/integrations/supabase/client';
import { AdminDailyReport, AdminLead, AdminUser, ApiUsageStats, ApiUsageSummary, Campaign, SerpapiAccountUsage, SerpapiUsagePoint, TmDashboard } from './types';

export async function fetchTmDashboard(): Promise<TmDashboard | null> {
  const { data, error } = await (supabase.rpc as any)('tm_dashboard');
  if (error) {
    console.error('Erro ao buscar painel do gestor:', error);
    throw error;
  }
  return (data as TmDashboard) || null;
}

export async function saveTmCampaign(input: {
  id?: string;
  name: string;
  platform: string;
  status: string;
  objective: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  start_date?: string | null;
  end_date?: string | null;
  notes: string;
}): Promise<Campaign | null> {
  const { data, error } = await (supabase.rpc as any)('tm_save_campaign', {
    p_id: input.id ?? null,
    p_name: input.name,
    p_platform: input.platform,
    p_status: input.status,
    p_objective: input.objective,
    p_budget: input.budget,
    p_spent: input.spent,
    p_impressions: input.impressions,
    p_clicks: input.clicks,
    p_start_date: input.start_date || null,
    p_end_date: input.end_date || null,
    p_notes: input.notes,
  });
  if (error) {
    console.error('Erro ao salvar campanha:', error);
    throw error;
  }
  return (data as Campaign | null);
}

export async function deleteTmCampaign(id: string): Promise<void> {
  const { error } = await (supabase.rpc as any)('tm_delete_campaign', { p_id: id });
  if (error) {
    console.error('Erro ao excluir campanha:', error);
    throw error;
  }
}

export async function linkLeadToCampaign(leadId: string, campaignId: string | null): Promise<void> {
  const { error } = await (supabase.rpc as any)('tm_link_lead', {
    p_lead_id: leadId,
    p_campaign_id: campaignId,
  });
  if (error) {
    console.error('Erro ao vincular lead à campanha:', error);
    throw error;
  }
}

export async function updateLeadAds(
  leadId: string,
  hasAds: boolean,
  metaHasAds: boolean | null,
  googleAdsCount: number | null,
): Promise<void> {
  const { error } = await (supabase.rpc as any)('tm_update_lead_ads', {
    p_lead_id: leadId,
    p_has_ads: hasAds,
    p_meta_has_ads: metaHasAds,
    p_google_ads_count: googleAdsCount,
  });
  if (error) {
    console.error('Erro ao atualizar verificação de anúncio:', error);
    throw error;
  }
}

export async function fetchAdminLeads(): Promise<AdminLead[]> {
  const { data, error } = await (supabase.rpc as any)('admin_dashboard_leads');
  if (error) {
    console.error('Erro ao buscar leads para o dashboard:', error);
    throw error;
  }
  return (data || []) as AdminLead[];
}

export async function fetchApiUsageStats(days: number = 7): Promise<ApiUsageStats[]> {
  const { data, error } = await (supabase.rpc as any)('get_api_usage_stats', {
    p_days: days,
  });
  if (error) {
    console.error('Erro ao buscar estatísticas de API:', error);
    throw error;
  }
  return (data || []) as ApiUsageStats[];
}

export async function fetchApiUsageSummary(days: number = 7): Promise<ApiUsageSummary | null> {
  const { data, error } = await (supabase.rpc as any)('get_api_usage_summary', {
    p_days: days,
  });
  if (error) {
    console.error('Erro ao buscar resumo de API:', error);
    throw error;
  }
  return (data && data.length > 0) ? (data[0] as ApiUsageSummary) : null;
}

export async function fetchSerpapiUsage(): Promise<SerpapiAccountUsage[]> {
  const { data, error } = await (supabase.rpc as any)('get_serpapi_usage');
  if (error) {
    console.error('Erro ao buscar uso das chaves SerpAPI:', error);
    throw error;
  }
  return (data || []) as SerpapiAccountUsage[];
}

export async function fetchSerpapiUsageHistory(keyIndex: number = 0): Promise<SerpapiUsagePoint[]> {
  const { data, error } = await (supabase.rpc as any)('get_serpapi_usage_history', {
    p_key_index: keyIndex,
    p_days: 30,
  });
  if (error) {
    console.error('Erro ao buscar histórico de uso SerpAPI:', error);
    throw error;
  }
  return (data || []) as SerpapiUsagePoint[];
}

export async function triggerSerpapiSync(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const { error } = await supabase.functions.invoke('sync-serpapi-usage', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (error) {
    console.error('Erro ao executar sync do SerpAPI:', error);
    return false;
  }
  return true;
}

// User management functions
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await (supabase.rpc as any)('admin_list_users');
  if (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
  return (data || []) as AdminUser[];
}

export async function createAdminUser(
  email: string,
  password: string,
  name: string,
  role: string = 'sdr'
): Promise<{ id: string; email: string; name: string; role: string; password: string }> {
  const { data, error } = await (supabase.rpc as any)('admin_create_user', {
    p_email: email,
    p_password: password,
    p_name: name,
    p_role: role,
  });
  if (error) {
    console.error('Erro ao criar usuário:', error);
    throw error;
  }
  return data;
}

export async function updateAdminUser(
  userId: string,
  updates: { name?: string; role?: string; password?: string; avatar_url?: string }
): Promise<{ id: string; email: string; name: string; avatar_url: string | null; role: string; success: boolean }> {
  const { data, error } = await (supabase.rpc as any)('admin_update_user', {
    p_user_id: userId,
    p_name: updates.name || null,
    p_role: updates.role || null,
    p_password: updates.password || null,
    p_avatar_url: updates.avatar_url ?? null,
  });
  if (error) {
    console.error('Erro ao atualizar usuário:', error);
    throw error;
  }
  return data;
}

export async function deleteAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await (supabase.rpc as any)('admin_delete_user', {
    p_user_id: userId,
  });
  if (error) {
    console.error('Erro ao excluir usuário:', error);
    throw error;
  }
  return data?.success === true;
}

export async function fetchAdminDailyReports(): Promise<AdminDailyReport[]> {
  const { data, error } = await (supabase.rpc as any)('admin_list_daily_reports');
  if (error) {
    console.error('Erro ao buscar relatórios diários:', error);
    throw error;
  }
  return (data || []) as AdminDailyReport[];
}
