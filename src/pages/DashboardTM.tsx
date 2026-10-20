import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Target, TrendingUp, Inbox, Activity, CheckCircle2, XCircle, RefreshCw, Users,
  Megaphone, ShieldOff, HelpCircle, Plus, Pencil, Trash2, AlertTriangle, Megaphone as AdIcon,
  MapPin, User2, CalendarDays, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { TmDashboard, Campaign, STATUS_LABELS, LeadStatus } from '@/lib/types';
import {
  fetchTmDashboard, saveTmCampaign, deleteTmCampaign, linkLeadToCampaign, updateLeadAds,
} from '@/lib/dashboard-api';
import { toast } from 'sonner';
import { initials, avatarColor } from '@/lib/avatars';

const STATUS_COLORS: Record<string, string> = {
  analise_pendente: '#f59e0b',
  em_analise: '#f97316',
  ponto_contato: '#ec4899',
  mensagem_enviada: '#14b8a6',
  follow_up: '#0ea5e9',
  reuniao_agendada: '#8b5cf6',
  recusado: '#ef4444',
  venda_fechada: '#10b981',
};

const STATUS_ORDER: LeadStatus[] = [
  'analise_pendente',
  'em_analise',
  'ponto_contato',
  'mensagem_enviada',
  'follow_up',
  'reuniao_agendada',
  'venda_fechada',
  'recusado',
];

const ORIGEM_LABELS: Record<string, string> = {
  prospeccao: 'Prospecção',
  trafico: 'Tráfego',
  sem_origem: 'Sem origem',
};

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  tiktok: 'TikTok Ads',
  outros: 'Outros',
};

const CAMPAIGN_STATUS: Record<string, { label: string; className: string }> = {
  ativa: { label: 'Ativa', className: 'border-green-500/40 text-green-600 bg-green-500/10' },
  pausada: { label: 'Pausada', className: 'border-amber-500/40 text-amber-600 bg-amber-500/10' },
  encerrada: { label: 'Encerrada', className: 'border-border text-muted-foreground bg-accent' },
};

const fmtMoney = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtNum = (v: number) => (v ?? 0).toLocaleString('pt-BR');

interface CampaignForm {
  id?: string;
  name: string;
  platform: string;
  status: string;
  objective: string;
  budget: string;
  spent: string;
  impressions: string;
  clicks: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const EMPTY_FORM: CampaignForm = {
  name: '', platform: 'meta', status: 'ativa', objective: '', budget: '0', spent: '0',
  impressions: '0', clicks: '0', start_date: '', end_date: '', notes: '',
};

export default function DashboardTM() {
  const [data, setData] = useState<TmDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchTmDashboard());
    } catch (e) {
      toast.error('Erro ao carregar o painel do gestor.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = data?.total ?? 0;
  const stats = useMemo(() => {
    const f = data?.funil ?? {};
    return {
      ht: data?.total_hoje ?? 0,
      emAnalise: (f.analise_pendente ?? 0) + (f.em_analise ?? 0),
      funil: (f.follow_up ?? 0) + (f.reuniao_agendada ?? 0),
      vendas: f.venda_fechada ?? 0,
      recusados: f.recusado ?? 0,
    };
  }, [data]);

  const funnelTotal = useMemo(
    () => STATUS_ORDER.reduce((acc, s) => acc + ((data?.funil?.[s] ?? 0) as number), 0),
    [data],
  );

  const adsTotal = useMemo(() => {
    const a = data?.ads ?? { tem: 0, sem: 0, nao_verificado: 0 };
    return a.tem + a.sem + a.nao_verificado;
  }, [data]);

  const cards = [
    { label: 'Total de Leads', value: total, icon: Target, color: 'text-gold-500' },
    { label: 'Entradas Hoje', value: stats.ht, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Em Análise', value: stats.emAnalise, icon: Inbox, color: 'text-amber-500' },
    { label: 'No Funil', value: stats.funil, icon: Activity, color: 'text-sky-500' },
    { label: 'Vendas Fechadas', value: stats.vendas, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Recusados', value: stats.recusados, icon: XCircle, color: 'text-red-500' },
  ];

  const openCreate = () => { setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (c: Campaign) => {
    setForm({
      id: c.id,
      name: c.name, platform: c.platform, status: c.status, objective: c.objective,
      budget: String(c.budget ?? 0), spent: String(c.spent ?? 0),
      impressions: String(c.impressions ?? 0), clicks: String(c.clicks ?? 0),
      start_date: c.start_date || '', end_date: c.end_date || '', notes: c.notes,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome da campanha.'); return; }
    setSaving(true);
    try {
      await saveTmCampaign({
        id: form.id,
        name: form.name,
        platform: form.platform,
        status: form.status,
        objective: form.objective,
        budget: Number(form.budget) || 0,
        spent: Number(form.spent) || 0,
        impressions: Number(form.impressions) || 0,
        clicks: Number(form.clicks) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes,
      });
      toast.success(form.id ? 'Campanha atualizada!' : 'Campanha criada!');
      setOpen(false);
      load();
    } catch (e) {
      toast.error('Erro ao salvar campanha.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Campaign) => {
    if (!window.confirm(`Excluir a campanha "${c.name}"?`)) return;
    try {
      await deleteTmCampaign(c.id);
      toast.success('Campanha excluída.');
      load();
    } catch (e) {
      toast.error('Erro ao excluir campanha.');
      console.error(e);
    }
  };

  const handleLink = async (leadId: string, campaignId: string) => {
    try {
      await linkLeadToCampaign(leadId, campaignId || null);
      toast.success(campaignId ? 'Lead vinculado à campanha.' : 'Vinculo removido.');
      load();
    } catch (e) {
      toast.error('Erro ao vincular lead.');
      console.error(e);
    }
  };

  const handleAds = async (leadId: string, hasAds: boolean) => {
    try {
      await updateLeadAds(leadId, hasAds, null, null);
      load();
    } catch (e) {
      toast.error('Erro ao atualizar verificação de anúncio.');
      console.error(e);
    }
  };

  const setField = (key: keyof CampaignForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const hasBudgetAlert = (c: Campaign) => c.status === 'ativa' && Number(c.budget) > 0 && Number(c.spent) >= Number(c.budget);
  const hasNoLeadAlert = (c: Campaign) => c.status === 'ativa' && Number(c.spent) > 0 && c.leads_count === 0;

  return (
    <main className="max-w-[1600px] mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-gold-500" />
              Painel do Gestor de Tráfego
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Central de informações: funil, status de anúncios, origem dos leads e campanhas de tráfego.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <c.icon className={`w-6 h-6 ${c.color}`} />
                  <span className="text-3xl font-bold">{c.value}</span>
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {STATUS_ORDER.map((s) => {
                const v = (data?.funil?.[s] ?? 0) as number;
                const pct = funnelTotal ? Math.round((v / funnelTotal) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{STATUS_LABELS[s]}</span>
                      <span className="text-muted-foreground">{v} · {pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s] }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status dos Anúncios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  label: 'Tem anúncio veiculando', value: data?.ads?.tem ?? 0, icon: Megaphone,
                  color: '#10b981', bg: 'bg-green-500/10 text-green-500',
                },
                {
                  label: 'Sem anúncio', value: data?.ads?.sem ?? 0, icon: ShieldOff,
                  color: '#94a3b8', bg: 'bg-accent text-muted-foreground',
                },
                {
                  label: 'A verificar (Ad Library)', value: data?.ads?.nao_verificado ?? 0, icon: HelpCircle,
                  color: '#f59e0b', bg: 'bg-amber-500/10 text-amber-500',
                },
              ].map((a) => {
                const v = a.value;
                const pct = adsTotal ? Math.round((v / adsTotal) * 100) : 0;
                return (
                  <div key={a.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <a.icon className={`w-4 h-4 ${a.bg} p-0.5 rounded`} />
                        {a.label}
                      </span>
                      <span className="text-muted-foreground">{v} · {pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-accent overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: a.color }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Verificação de anúncios (Google/Meta) é persistida no lead — sem re-verificar e sem gastar crédito SerpAPI de novo.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads por Responsável</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-2 py-2">Responsável</th>
                    <th className="px-2 py-2 text-center">Leads</th>
                    <th className="px-2 py-2 text-center">Vendas</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.por_responsavel ?? []).length === 0 && (
                    <tr><td colSpan={3} className="px-2 py-6 text-center text-muted-foreground">Nenhum lead cadastrado.</td></tr>
                  )}
                  {(data?.por_responsavel ?? []).map((r) => (
                    <tr key={r.responsavel} className="border-b border-border/50">
                      <td className="px-2 py-2">{r.responsavel}</td>
                      <td className="px-2 py-2 text-center font-medium">{r.total}</td>
                      <td className="px-2 py-2 text-center font-medium text-green-500">{r.vendas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origem dos Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.por_origem ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lead com origem registrada.</p>
              )}
              {(data?.por_origem ?? []).map((o) => {
                const pct = total ? Math.round((o.total / total) * 100) : 0;
                return (
                  <div key={o.origem}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{ORIGEM_LABELS[o.origem] ?? o.origem}</span>
                      <span className="text-muted-foreground">{o.total} · {pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: o.origem === 'trafico' ? '#8b5cf6' : '#f59e0b' }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Ao vincular um lead a uma campanha, a origem dele passa a ser Tráfego.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <AdIcon className="w-4 h-4 text-gold-500" />
              Campanhas de Tráfego
            </CardTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1.5" />Nova Campanha
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto custom-scrollbar">
            {((data?.campanhas ?? []).some((c) => hasBudgetAlert(c) || hasNoLeadAlert(c))) && (
              <div className="mb-4 flex items-center gap-2 text-xs text-amber-600 border border-amber-500/40 bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Atenção: há campanhas ativas com orçamento atingido ou gasto sem leads gerados.
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-2 py-2">Campanha</th>
                  <th className="px-2 py-2 text-center">Plataforma</th>
                  <th className="px-2 py-2 text-center">Status</th>
                  <th className="px-2 py-2 text-center">Orçamento</th>
                  <th className="px-2 py-2 text-center">Gasto</th>
                  <th className="px-2 py-2 text-center">Impressões</th>
                  <th className="px-2 py-2 text-center">Cliques</th>
                  <th className="px-2 py-2 text-center">CTR</th>
                  <th className="px-2 py-2 text-center">CPC</th>
                  <th className="px-2 py-2 text-center">Leads</th>
                  <th className="px-2 py-2 text-center">CPL</th>
                  <th className="px-2 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data?.campanhas ?? []).length === 0 && (
                  <tr><td colSpan={12} className="px-2 py-8 text-center text-muted-foreground">
                    Nenhuma campanha cadastrada. Crie sua primeira campanha para acompanhar gasto e CPL.
                  </td></tr>
                )}
                {(data?.campanhas ?? []).map((c) => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100) : 0;
                  const cpc = c.clicks > 0 ? Number(c.spent) / c.clicks : 0;
                  const cpl = c.leads_count > 0 ? Number(c.spent) / c.leads_count : 0;
                  const cs = CAMPAIGN_STATUS[c.status] ?? { label: c.status, className: 'border-border bg-accent text-muted-foreground' };
                  return (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {(hasBudgetAlert(c) || hasNoLeadAlert(c)) && (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                        </div>
                        {c.objective && <span className="text-xs text-muted-foreground">{c.objective}</span>}
                      </td>
                      <td className="px-2 py-2 text-center">{PLATFORM_LABELS[c.platform] ?? c.platform}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${cs.className}`}>{cs.label}</span>
                      </td>
                      <td className="px-2 py-2 text-center">{fmtMoney(Number(c.budget))}</td>
                      <td className="px-2 py-2 text-center">{fmtMoney(Number(c.spent))}</td>
                      <td className="px-2 py-2 text-center">{fmtNum(c.impressions)}</td>
                      <td className="px-2 py-2 text-center">{fmtNum(c.clicks)}</td>
                      <td className="px-2 py-2 text-center">{ctr.toFixed(1)}%</td>
                      <td className="px-2 py-2 text-center">{cpc > 0 ? fmtMoney(cpc) : '—'}</td>
                      <td className="px-2 py-2 text-center font-medium">{c.leads_count}</td>
                      <td className="px-2 py-2 text-center font-medium">{cpl > 0 ? fmtMoney(cpl) : '—'}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        <button className="text-muted-foreground hover:text-foreground mr-2" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="text-red-500 hover:text-red-400" onClick={() => handleDelete(c)} title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base">Leads Recentes</CardTitle>
            <span className="text-xs font-medium text-muted-foreground bg-accent px-2.5 py-1 rounded-full">
              {data?.recentes?.length ?? 0} últimos
            </span>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto custom-scrollbar rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-accent/60">
                    <th className="px-4 py-3 font-semibold">Lead</th>
                    <th className="px-3 py-3 font-semibold">Cidade</th>
                    <th className="px-3 py-3 text-center font-semibold">Status</th>
                    <th className="px-3 py-3 text-center font-semibold">Anúncio</th>
                    <th className="px-3 py-3 font-semibold">Origem</th>
                    <th className="px-3 py-3 font-semibold">Campanha</th>
                    <th className="px-3 py-3 font-semibold">Responsável</th>
                    <th className="px-3 py-3 font-semibold">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentes ?? []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhum lead recente.
                      </td>
                    </tr>
                  )}
                  {(data?.recentes ?? []).map((r, i) => (
                    <tr key={r.id} className={`hover:bg-accent/40 transition-colors ${i % 2 === 1 ? 'bg-accent/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${avatarColor(r.name)}`}>
                            {initials(r.name)}
                          </span>
                          <span className="font-medium text-foreground max-w-[230px] truncate" title={r.name}>
                            {r.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                          {r.city || '—'}{r.state ? ` - ${r.state}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{
                            color: STATUS_COLORS[r.status] ?? '#94a3b8',
                            backgroundColor: `${STATUS_COLORS[r.status] ?? '#94a3b8'}1a`,
                            border: `1px solid ${(STATUS_COLORS[r.status] ?? '#94a3b8')}55`,
                          }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[r.status] ?? '#94a3b8' }} />
                          {STATUS_LABELS[r.status as LeadStatus] ?? r.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-center gap-1.5">
                          {r.has_ads == null ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-amber-500 bg-amber-500/10 border border-amber-500/30">
                              <HelpCircle className="w-3 h-3" /> A verificar
                            </span>
                          ) : r.has_ads ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-green-600 bg-green-500/10 border border-green-500/30">
                              <Megaphone className="w-3 h-3" /> {r.google_ads_count ?? 0} anúncio{r.google_ads_count === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-muted-foreground bg-accent border border-border">
                              <ShieldOff className="w-3 h-3" /> Sem anúncio
                            </span>
                          )}
                          <div className="inline-flex rounded-full border border-border overflow-hidden text-[10px]">
                            <button
                              onClick={() => handleAds(r.id, true)}
                              className={`px-2 py-0.5 transition-colors ${r.has_ads ? 'text-green-600 bg-green-500/10' : 'text-muted-foreground hover:bg-accent'}`}
                              title="Tem anúncio"
                            >Tem</button>
                            <button
                              onClick={() => handleAds(r.id, false)}
                              className={`px-2 py-0.5 transition-colors ${r.has_ads === false ? 'text-muted-foreground bg-accent' : 'text-muted-foreground hover:bg-accent'}`}
                              title="Sem anúncio"
                            >Sem</button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-card">
                          <Building2 className="w-3 h-3" />
                          {ORIGEM_LABELS[r.source ?? 'sem_origem'] ?? r.source ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          className="bg-card border border-border rounded-lg text-xs px-2 py-1.5 max-w-[140px] focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                          value={r.campaign_id ?? ''}
                          onChange={(e) => handleLink(r.id, e.target.value)}
                        >
                          <option value="">Sem campanha</option>
                          {(data?.campanhas ?? []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                          {r.responsavel || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-xs">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
                          {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg text-foreground">
              {form.id ? 'Editar Campanha' : 'Nova Campanha de Tráfego'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Nome da campanha *</Label>
                <Input value={form.name} onChange={setField('name')} placeholder="Ex.: Clínicas - Campanha SP" />
              </div>
              <div className="space-y-1.5">
                <Label>Plataforma</Label>
                <select className="w-full bg-accent border border-border rounded-md px-3 py-2 text-sm" value={form.platform} onChange={setField('platform')}>
                  <option value="meta">Meta Ads</option>
                  <option value="google">Google Ads</option>
                  <option value="tiktok">TikTok Ads</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select className="w-full bg-accent border border-border rounded-md px-3 py-2 text-sm" value={form.status} onChange={setField('status')}>
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="encerrada">Encerrada</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Objetivo</Label>
                <Input value={form.objective} onChange={setField('objective')} placeholder="Ex.: Geração de leads para clínicas" />
              </div>
              <div className="space-y-1.5">
                <Label>Orçamento (R$)</Label>
                <Input type="number" value={form.budget} onChange={setField('budget')} />
              </div>
              <div className="space-y-1.5">
                <Label>Gasto (R$)</Label>
                <Input type="number" value={form.spent} onChange={setField('spent')} />
              </div>
              <div className="space-y-1.5">
                <Label>Impressões</Label>
                <Input type="number" value={form.impressions} onChange={setField('impressions')} />
              </div>
              <div className="space-y-1.5">
                <Label>Cliques</Label>
                <Input type="number" value={form.clicks} onChange={setField('clicks')} />
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="date" value={form.start_date} onChange={setField('start_date')} />
              </div>
              <div className="space-y-1.5">
                <Label>Término</Label>
                <Input type="date" value={form.end_date} onChange={setField('end_date')} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Input value={form.notes} onChange={setField('notes')} placeholder="Metas, criativos, links..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-gold-500 text-black hover:bg-gold-600" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}