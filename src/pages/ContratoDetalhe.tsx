import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Lock, LockOpen, Loader2, Mail, MessageCircle, Plus, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  obterContrato,
  excluirContrato,
  bloquearContrato,
  desbloquearContrato,
  gerarLinkAssinatura,
  registrarAditivo,
  obterUrlSelfie,
} from '../servicos/contratos';
import { showError, showSuccess } from '../utils/toast';

const fmt = (v: number | null) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v));

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_assinatura: { label: 'Aguardando assinatura', variant: 'warning' },
  ativo: { label: 'Ativo', variant: 'success' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
  concluido: { label: 'Concluído', variant: 'outline' },
  bloqueado: { label: 'Bloqueado', variant: 'destructive' },
};

function DialogAditivo({ aberto, onOpenChange, empresaId, contratoId, onSalvo }: any) {
  const [descricao, setDescricao] = useState('');
  const [comMudancaFinanceira, setComMudancaFinanceira] = useState(false);
  const [valorTotalNovo, setValorTotalNovo] = useState('');
  const [modo, setModo] = useState<'unico' | 'parcelar' | 'repetir'>('parcelar');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('2');
  const [primeiroVencimento, setPrimeiroVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [intervaloDias, setIntervaloDias] = useState('30');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!descricao.trim()) {
      setErro('Descrição é obrigatória');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      await registrarAditivo(empresaId, contratoId, {
        descricao,
        mudancaFinanceira: comMudancaFinanceira
          ? { valorTotalNovo: Number(valorTotalNovo), modo, quantidadeParcelas: modo === 'unico' ? 1 : Number(quantidadeParcelas), primeiroVencimento, intervaloDias: Number(intervaloDias) }
          : undefined,
      });
      showSuccess('Aditivo registrado.');
      onSalvo();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível registrar o aditivo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md md:max-w-[70%]">
        <DialogHeader>
          <DialogTitle>Novo aditivo contratual</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="Ex: Prorrogação de prazo por 6 meses" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Muda valor/parcelamento?</Label>
            <Switch checked={comMudancaFinanceira} onCheckedChange={setComMudancaFinanceira} />
          </div>
          {comMudancaFinanceira && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Cancela a conta a receber atual e cria uma nova -- só funciona se ainda não houver recebimento registrado.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Novo valor total *</Label>
                  <Input type="number" step="0.01" min="0.01" value={valorTotalNovo} onChange={(e) => setValorTotalNovo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <select value={modo} onChange={(e) => setModo(e.target.value as any)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="unico">À vista</option>
                    <option value="parcelar">Parcelar</option>
                    <option value="repetir">Repetir valor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>1º vencimento *</Label>
                  <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
                </div>
                {modo !== 'unico' && (
                  <div className="space-y-1.5">
                    <Label>Nº de parcelas *</Label>
                    <Input type="number" min="2" max="360" value={quantidadeParcelas} onChange={(e) => setQuantidadeParcelas(e.target.value)} />
                  </div>
                )}
              </div>
              {modo !== 'unico' && (
                <div className="space-y-1.5">
                  <Label>Intervalo (dias) *</Label>
                  <Input type="number" min="1" max="365" value={intervaloDias} onChange={(e) => setIntervaloDias(e.target.value)} />
                </div>
              )}
            </div>
          )}
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <Button className="w-full" disabled={salvando} onClick={salvar}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar aditivo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ContratoDetalhe() {
  const { empresaId } = useEmpresaAtiva();
  const { id } = useParams();
  const navigate = useNavigate();
  const [contrato, setContrato] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [linkAssinatura, setLinkAssinatura] = useState<string | null>(null);
  const [urlSelfie, setUrlSelfie] = useState<string | null>(null);
  const [dialogAditivoAberto, setDialogAditivoAberto] = useState(false);

  function carregar() {
    if (!empresaId || !id) return;
    setCarregando(true);
    obterContrato(empresaId, id)
      .then(setContrato)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, id]);

  useEffect(() => {
    if (contrato?.assinaturaSelfieRef) {
      obterUrlSelfie(empresaId!, id!)
        .then((r: any) => setUrlSelfie(r.url))
        .catch(() => {});
    }
  }, [contrato?.assinaturaSelfieRef, empresaId, id]);

  async function gerarLink() {
    setProcessando(true);
    try {
      const r: any = await gerarLinkAssinatura(empresaId!, id!);
      setLinkAssinatura(r.url);
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function alternarBloqueio() {
    setProcessando(true);
    try {
      if (contrato.status === 'bloqueado') {
        await desbloquearContrato(empresaId!, id!);
        showSuccess('Contrato desbloqueado.');
      } else {
        await bloquearContrato(empresaId!, id!);
        showSuccess('Contrato bloqueado.');
      }
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function excluir() {
    if (!confirm('Excluir este contrato? Esta ação não pode ser desfeita.')) return;
    setProcessando(true);
    try {
      await excluirContrato(empresaId!, id!);
      showSuccess('Contrato excluído.');
      navigate('/contratos');
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  function copiarLink() {
    if (!linkAssinatura) return;
    navigator.clipboard.writeText(linkAssinatura);
    showSuccess('Link copiado.');
  }

  if (!empresaId) return null;
  if (carregando || !contrato) {
    return (
      <LayoutPrincipal>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </LayoutPrincipal>
    );
  }

  const badge = STATUS_BADGE[contrato.status] ?? { label: contrato.status, variant: 'secondary' };
  const podeGerarLink = contrato.status === 'rascunho' || contrato.status === 'pendente_assinatura';
  const podeExcluir = contrato.status === 'rascunho' || contrato.status === 'pendente_assinatura';
  const podeBloquear = !['cancelado', 'concluido'].includes(contrato.status) && contrato.status !== 'bloqueado';
  const linkParaCompartilhar = linkAssinatura;

  return (
    <LayoutPrincipal>
      <Link to="/contratos" className="mb-1 flex items-center text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar pra Contratos
      </Link>
      <div className="mb-6 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{contrato.titulo}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {contrato.valorTotal != null && <span className="text-sm text-muted-foreground">{fmt(contrato.valorTotal)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeGerarLink && (
            <Button variant="outline" onClick={gerarLink} disabled={processando}>
              Gerar link de assinatura
            </Button>
          )}
          {podeBloquear || contrato.status === 'bloqueado' ? (
            <Button variant="outline" onClick={alternarBloqueio} disabled={processando}>
              {contrato.status === 'bloqueado' ? <LockOpen className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
              {contrato.status === 'bloqueado' ? 'Desbloquear' : 'Bloquear'}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setDialogAditivoAberto(true)}>
            <Plus className="mr-2 h-4 w-4" /> Aditivo
          </Button>
          {podeExcluir && (
            <Button variant="destructive" onClick={excluir} disabled={processando}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          )}
        </div>
      </div>

      {linkParaCompartilhar && (
        <Card className="mb-4">
          <CardContent className="space-y-2 p-4">
            <Label>Link de assinatura</Label>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">{linkParaCompartilhar}</code>
              <Button size="sm" variant="outline" onClick={copiarLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(`Segue o link para assinatura do contrato: ${linkParaCompartilhar}`)}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:?subject=${encodeURIComponent('Assinatura de contrato')}&body=${encodeURIComponent(`Segue o link para assinatura do contrato: ${linkParaCompartilhar}`)}`}>
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> E-mail
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Label className="mb-2 block">Conteúdo do contrato</Label>
            <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">{contrato.conteudoRenderizado}</div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {contrato.assinadoEm && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <Label>Assinatura</Label>
                <p className="text-sm">
                  <span className="font-medium">{contrato.assinaturaNome}</span>
                  <br />
                  <span className="text-muted-foreground">{new Date(contrato.assinadoEm).toLocaleString('pt-BR')}</span>
                </p>
                {urlSelfie && (
                  <a href={urlSelfie} target="_blank" rel="noreferrer">
                    <img src={urlSelfie} alt="Selfie de assinatura" className="mt-2 h-32 w-full rounded-md border object-cover" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <Label className="mb-2 block">Aditivos ({contrato.aditivos?.length ?? 0})</Label>
              {(contrato.aditivos ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aditivo registrado.</p>
              ) : (
                <div className="space-y-3">
                  {contrato.aditivos.map((a: any) => (
                    <div key={a.id} className="rounded-md border p-2.5 text-sm">
                      <p>{a.descricao}</p>
                      {a.valorTotalNovo != null && <p className="mt-1 text-xs text-muted-foreground">Novo valor: {fmt(a.valorTotalNovo)} em {a.numeroParcelasNovo}x</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(a.criadoEm).toLocaleDateString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DialogAditivo aberto={dialogAditivoAberto} onOpenChange={setDialogAditivoAberto} empresaId={empresaId} contratoId={id} onSalvo={() => { setDialogAditivoAberto(false); carregar(); }} />
    </LayoutPrincipal>
  );
}
