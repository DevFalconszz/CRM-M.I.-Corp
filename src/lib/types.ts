export type LeadStatus =
  | 'analise_pendente'
  | 'em_analise'
  | 'ponto_contato'
  | 'mensagem_enviada'
  | 'follow_up'
  | 'reuniao_agendada'
  | 'recusado'
  | 'venda_fechada';

export const STATUS_LABELS: Record<LeadStatus, string> = {
  analise_pendente: 'Análise Pendente',
  em_analise: 'Em Análise',
  ponto_contato: 'Pronto p/ Contato',
  mensagem_enviada: 'Mensagem Enviada',
  follow_up: 'Follow Up',
  reuniao_agendada: 'Reunião Agendada',
  recusado: 'Recusado',
  venda_fechada: 'Venda Fechada',
};

export interface Lead {
  id: string;
  name: string;
  title: string;
  category: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  website: string;
  google_maps_url: string;
  rating: string;
  reviews_count: string;
  instagram: string;
  responsavel: string;
  descricao: string;
  status: LeadStatus;
  whatsapp_group: string;
  meeting_dates: string[];
  nome_decisor: string;
  numero_decisor: string;
  has_ads?: boolean | null;
  meta_has_ads?: boolean | null;
  google_ads_count?: number;
  source?: string | null;
  campaign_id?: string | null;
  user_id?: string | null;
}

export interface AdminLead extends Lead {
  user_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
  created_at: string;
}

export type DashboardView =
  | 'geral'
  | 'por_usuario'
  | 'por_status'
  | 'por_nicho'
  | 'por_estado'
  | 'api_usage'
  | 'usuarios'
  | 'relatorios';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  deleted_at: string | null;
  lead_count: number;
  buscas_total: number;
  buscas_sucesso: number;
  buscas_erro: number;
  creditos: number;
}

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AdminDailyReport extends DailyReport {
  email: string;
  user_name: string;
}

export interface LeadReport {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ApiUsageStats {
  endpoint: string;
  key_index: number;
  total_calls: number;
  success_count: number;
  error_count: number;
  rate_limited_count: number;
  success_rate: number;
  last_used: string;
}

export interface ApiUsageSummary {
  total_calls: number;
  success_count: number;
  error_count: number;
  rate_limited_count: number;
  success_rate: number;
  primary_key_usage: number;
  fallback_key_usage: number;
}

export interface SerpapiAccountUsage {
  key_index: number;
  account_email: string;
  plan_name: string;
  searches_per_month: number;
  plan_searches_left: number;
  total_searches_left: number;
  this_month_usage: number;
  plan_renewal_date: string;
  fetched_at: string;
}

export interface SerpapiUsagePoint {
  fetched_at: string;
  this_month_usage: number;
  total_searches_left: number;
}

export interface TmRecentLead {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  responsavel: string;
  created_at: string;
  has_ads?: boolean | null;
  google_ads_count?: number;
  source?: string | null;
  campaign_id?: string | null;
}

export interface TmByOwner {
  responsavel: string;
  total: number;
  vendas: number;
}

export interface TmAdsStats {
  tem: number;
  sem: number;
  nao_verificado: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  objective: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  start_date: string | null;
  end_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  leads_count: number;
}

export interface TmDashboard {
  total: number;
  total_hoje: number;
  funil: Partial<Record<LeadStatus, number>>;
  ads: TmAdsStats;
  por_responsavel: TmByOwner[];
  por_origem: { origem: string; total: number }[];
  campanhas: Campaign[];
  recentes: TmRecentLead[];
}
