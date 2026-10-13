import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText, Upload, Download, Printer, Eye, Lock, LogIn,
  ChevronLeft, CheckCircle2, XCircle, Loader2, Trash2, File, Stamp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Portal } from '@/components/Portal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TEMP_PASSWORD = 'crm2024';

interface ClosedLead {
  id: string;
  name: string;
  city: string;
  state: string;
  responsavel: string;
  phone: string;
  website: string;
  instagram: string;
  descricao: string;
  created_at: string;
  updated_at: string;
}

interface DocRecord {
  id: string;
  lead_id: string;
  title: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  notes: string;
  created_at: string;
}

interface TemplateDoc {
  id: string;
  label: string;
  description: string;
  color: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
}

const DEFAULT_TEMPLATES: TemplateDoc[] = [
  { id: 'tpl-contrato', label: 'Contrato', description: 'Modelo de contrato padrão para impressão ou assinatura.', color: 'text-blue-500', file_name: null, file_path: null, file_size: null },
  { id: 'tpl-tap', label: 'TAP', description: 'Termo de Abertura de Projeto — modelo base.', color: 'text-purple-500', file_name: null, file_path: null, file_size: null },
  { id: 'tpl-aceite', label: 'Termo de Aceite', description: 'Termo de aceite final — modelo para assinatura do cliente.', color: 'text-emerald-500', file_name: null, file_path: null, file_size: null },
  { id: 'tpl-starter', label: 'Contrato Starter', description: 'Contrato padrão da oferta Starter para marketing.', color: 'text-sky-500', file_name: null, file_path: null, file_size: null },
  { id: 'tpl-professional', label: 'Contrato Professional', description: 'Contrato padrão da oferta Professional para marketing.', color: 'text-amber-500', file_name: null, file_path: null, file_size: null },
  { id: 'tpl-enterprise', label: 'Contrato Enterprise', description: 'Contrato padrão da oferta Enterprise para marketing.', color: 'text-rose-500', file_name: null, file_path: null, file_size: null },
];

const DOC_TYPES = [
  { value: 'contrato', label: 'Contrato', color: 'text-blue-500' },
  { value: 'tap', label: 'TAP', color: 'text-purple-500' },
  { value: 'aceite', label: 'Termo de Aceite', color: 'text-green-500' },
  { value: 'outro', label: 'Outro Documento', color: 'text-muted-foreground' },
];

const getDocTypeLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label ?? t;
const getDocTypeColor = (t: string) => DOC_TYPES.find((d) => d.value === t)?.color ?? 'text-muted-foreground';
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

async function loadTemplates(): Promise<TemplateDoc[]> {
  try {
    const { data, error } = await supabase.from('document_templates').select('*');
    if (error) throw error;
    return DEFAULT_TEMPLATES.map((def) => {
      const s = (data || []).find((x: any) => x.id === def.id);
      return s ? { ...def, file_name: s.file_name, file_path: s.file_path, file_size: s.file_size } : def;
    });
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

async function saveTemplates(tpls: TemplateDoc[]) {
  try {
    const rows = tpls.map((t) => ({
      id: t.id,
      file_name: t.file_name,
      file_path: t.file_path,
      file_size: t.file_size,
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('document_templates').upsert(rows);
  } catch { /* ignore */ }
}

function openPdf(signedUrl: string) {
  const w = window.open(signedUrl, '_blank');
  if (!w) toast.error('Popup bloqueado. Permita popups para este site.');
}

export default function Documents() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [leads, setLeads] = useState<ClosedLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ClosedLead | null>(null);
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState('contrato');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deleteDoc, setDeleteDoc] = useState<DocRecord | null>(null);

  const [templates, setTemplates] = useState<TemplateDoc[]>(DEFAULT_TEMPLATES);
  const [uploadingTemplate, setUploadingTemplate] = useState<string | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<TemplateDoc | null>(null);

  const handleLogin = () => {
    if (password === TEMP_PASSWORD) {
      setAuthenticated(true);
      toast.success('Acesso liberado.');
      loadLeads();
    } else {
      toast.error('Senha incorreta.');
    }
  };

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, city, state, responsavel, phone, website, instagram, descricao, created_at, updated_at')
        .eq('status', 'venda_fechada')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      toast.error('Erro ao carregar leads fechados.');
      console.error(e);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const loadDocs = useCallback(async (leadId: string) => {
    setDocsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_client_documents' as any, { p_lead_id: leadId });
      if (error) throw error;
      setDocuments((data as DocRecord[]) || []);
    } catch (e) {
      toast.error('Erro ao carregar documentos.');
      console.error(e);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    if (selectedLead) loadDocs(selectedLead.id);
  }, [selectedLead, loadDocs]);

  const handleUpload = async () => {
    if (!uploadFile || !selectedLead) return;
    setUploading(true);
    try {
      const ext = uploadFile.name.split('.').pop() || 'pdf';
      const path = `${selectedLead.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('client-docs')
        .upload(path, uploadFile, { contentType: uploadFile.type });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from('client_documents' as any).insert({
        lead_id: selectedLead.id,
        title: uploadTitle || uploadFile.name,
        doc_type: uploadType,
        file_name: uploadFile.name,
        file_path: path,
        file_size: uploadFile.size,
        user_id: user?.id,
      });

      if (insertError) throw insertError;

      toast.success('Documento enviado!');
      setShowUpload(false);
      setUploadTitle('');
      setUploadFile(null);
      loadDocs(selectedLead.id);
    } catch (e) {
      toast.error('Erro ao enviar documento.');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc: DocRecord) => {
    const { data, error } = await supabase.storage.from('client-docs').createSignedUrl(doc.file_path, 3600);
    if (error) { toast.error('Erro ao abrir documento.'); return; }
    openPdf(data.signedUrl);
  };

  const handleDeleteDoc = async () => {
    if (!deleteDoc) return;
    try {
      await supabase.storage.from('client-docs').remove([deleteDoc.file_path]);
      await supabase.from('client_documents' as any).delete().eq('id', deleteDoc.id);
      toast.success('Documento excluído.');
      setDeleteDoc(null);
      if (selectedLead) loadDocs(selectedLead.id);
    } catch (e) {
      toast.error('Erro ao excluir documento.');
      console.error(e);
    }
  };

  // ─── Template handlers ─────────────────────────────────────

  const handleTemplateUpload = async (templateId: string, file: File) => {
    setUploadingTemplate(templateId);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `templates/${templateId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('client-docs')
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const updated = templates.map((t) =>
        t.id === templateId ? { ...t, file_name: file.name, file_path: path, file_size: file.size } : t
      );
      setTemplates(updated);
      saveTemplates(updated);
      toast.success(`${file.name} enviado como modelo.`);
    } catch (e) {
      toast.error('Erro ao enviar modelo.');
      console.error(e);
    } finally {
      setUploadingTemplate(null);
    }
  };

  const handleTemplatePreview = async (tpl: TemplateDoc) => {
    if (!tpl.file_path) return;
    const { data, error } = await supabase.storage.from('client-docs').createSignedUrl(tpl.file_path, 3600);
    if (error) { toast.error('Erro ao abrir modelo.'); return; }
    openPdf(data.signedUrl);
  };

  const handleTemplateDownload = async (tpl: TemplateDoc) => {
    if (!tpl.file_path) return;
    try {
      const { data, error } = await supabase.storage.from('client-docs').createSignedUrl(tpl.file_path, 3600);
      if (error) throw error;
      const res = await fetch(data.signedUrl);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = tpl.file_name || `${tpl.label}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Erro ao baixar modelo.');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    try {
      if (deleteTemplate.file_path) {
        await supabase.storage.from('client-docs').remove([deleteTemplate.file_path]);
      }
      const updated = templates.map((t) =>
        t.id === deleteTemplate.id ? { ...t, file_name: null, file_path: null, file_size: null } : t
      );
      setTemplates(updated);
      saveTemplates(updated);
      toast.success('Modelo removido.');
      setDeleteTemplate(null);
    } catch (e) {
      toast.error('Erro ao remover modelo.');
    }
  };

  // ─── Tela de Login ────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-2">
            <Lock className="w-10 h-10 text-gold-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Documentos de Clientes</CardTitle>
            <p className="text-xs text-muted-foreground">Área restrita — informe a senha para acessar.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Senha de acesso"
                  autoFocus
                />
                <Button onClick={handleLogin} className="bg-gold-500 text-black hover:bg-gold-600">
                  <LogIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Lista de Leads Fechados ──────────────────────────────
  if (!selectedLead) {
    return (
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-gold-500" />
              Documentos de Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Modelos padrões e documentos de clientes com <strong>Venda Fechada</strong>.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-accent px-2.5 py-1 rounded-full">
            {leads.length} cliente{leads.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Documentos Padrões (Templates) ─────────────────── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Stamp className="w-4 h-4 text-gold-500" />
            <h2 className="text-base font-semibold">Documentos Padrões</h2>
            <span className="text-xs text-muted-foreground">— modelos de contratos para impressão ou assinatura</span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="border-border/70 hover:border-gold-500/30 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <FileText className={`w-5 h-5 ${tpl.color}`} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{tpl.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                    </div>
                  </div>

                  {tpl.file_name ? (
                    <>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="truncate">{tpl.file_name}</span>
                        {tpl.file_size != null && <span>· {formatFileSize(tpl.file_size)}</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleTemplatePreview(tpl)}>
                          <Eye className="w-3.5 h-3.5 mr-1" />Ver
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => handleTemplateDownload(tpl)}>
                          <Download className="w-3.5 h-3.5 mr-1" />Baixar
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setDeleteTemplate(tpl)} title="Remover modelo">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <label className="flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-border hover:border-gold-500/50 cursor-pointer transition-colors text-xs text-muted-foreground hover:text-foreground">
                      {uploadingTemplate === tpl.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          Enviar modelo PDF
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        disabled={uploadingTemplate === tpl.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleTemplateUpload(tpl.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Leads Fechados ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold-500" />
              <h2 className="text-base font-semibold">Clientes</h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-accent px-2.5 py-1 rounded-full">
              {leads.length} cliente{leads.length !== 1 ? 's' : ''}
            </span>
          </div>

          {leadsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium text-foreground">Nenhum cliente fechado</p>
              <p className="text-sm mt-1">Leads com status "Venda Fechada" aparecerão aqui.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className="cursor-pointer hover:border-gold-500/40 hover:shadow-md transition-all"
                onClick={() => setSelectedLead(lead)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center text-sm font-bold text-gold-500 shrink-0">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.city}{lead.state ? ` - ${lead.state}` : ''}</p>
                      <p className="text-xs text-muted-foreground mt-1">{lead.responsavel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </section>

      {/* Delete Template Confirmation */}
      {deleteTemplate && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={() => setDeleteTemplate(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full my-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Remover modelo?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Remover o modelo <strong>{deleteTemplate.label}</strong>? O arquivo enviado será excluído do storage.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTemplate(null)}>Cancelar</Button>
              <Button onClick={handleDeleteTemplate} className="bg-red-500 hover:bg-red-600 text-white">Remover</Button>
            </div>
          </div>
          </div>
        </Portal>
        )}
      </main>
    );
  }

  // ─── Detalhe do Cliente + Documentos ──────────────────────
  return (
    <main className="max-w-[1600px] mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)} className="mb-4 -ml-2">
        <ChevronLeft className="w-4 h-4 mr-1" />Voltar
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info do Lead */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{selectedLead.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cidade</span>
              <span>{selectedLead.city}{selectedLead.state ? ` - ${selectedLead.state}` : ''}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Responsável</span>
              <span>{selectedLead.responsavel}</span>
            </div>
            {selectedLead.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span>{selectedLead.phone}</span>
              </div>
            )}
            {selectedLead.website && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site</span>
                <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-gold-500 hover:underline truncate max-w-[180px]">{selectedLead.website}</a>
              </div>
            )}
            {selectedLead.instagram && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instagram</span>
                <span>{selectedLead.instagram}</span>
              </div>
            )}
            {selectedLead.descricao && (
              <div className="pt-2 border-t border-border">
                <p className="text-muted-foreground text-xs mb-1">Observações</p>
                <p className="text-xs">{selectedLead.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Documentos</h2>
            <Button size="sm" onClick={() => setShowUpload(true)} className="bg-gold-500 text-black hover:bg-gold-600">
              <Upload className="w-4 h-4 mr-1" />Enviar
            </Button>
          </div>

          {docsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gold-500" />
            </div>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <File className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum documento enviado para este cliente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/40 transition-colors">
                  <FileText className={`w-5 h-5 shrink-0 ${getDocTypeColor(doc.doc_type)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {getDocTypeLabel(doc.doc_type)} · {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handlePreview(doc)} title="Visualizar">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Baixar" onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage.from('client-docs').createSignedUrl(doc.file_path, 3600);
                        if (error) throw error;
                        const res = await fetch(data.signedUrl);
                        if (!res.ok) throw new Error('download failed');
                        const blob = await res.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = doc.file_name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                      } catch {
                        toast.error('Erro ao baixar documento.');
                      }
                    }}>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDeleteDoc(doc)} title="Excluir">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de documento</Label>
              <select
                className="w-full bg-accent border border-border rounded-xl px-3 py-2 text-sm"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Ex.: Contrato 2024"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arquivo (PDF)</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile && (
                <p className="text-xs text-muted-foreground">
                  {uploadFile.name} · {formatFileSize(uploadFile.size)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button
              className="bg-gold-500 text-black hover:bg-gold-600"
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {deleteDoc && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={() => setDeleteDoc(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full my-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <DialogTitle className="text-lg font-semibold mb-2">Excluir documento?</DialogTitle>
            <p className="text-sm text-muted-foreground mb-4">
              Excluir <strong>{deleteDoc.title}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancelar</Button>
              <Button onClick={handleDeleteDoc} className="bg-red-500 hover:bg-red-600 text-white">Excluir</Button>
            </div>
          </div>
          </div>
        </Portal>
      )}
    </main>
  );
}
