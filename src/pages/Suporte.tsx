import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AlertTriangle, CheckCircle2, Clock, Loader2, MessageSquare, Paperclip, Pause, PlusCircle, LifeBuoy } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  atualizarPrioridadeTicket,
  atualizarStatusTicket,
  criarTicket,
  enviarMensagem,
  listarMensagens,
  listarTickets,
  obterResumoSuporte,
  obterUrlAnexoMensagem,
} from '../servicos/suporte';
import { showError, showSuccess } from '../utils/toast';

const INTERVALO_POLLING_MS = 15000;

const PAPEIS_DESTINATARIO: Record<string, string[]> = {
  contador: ['CONTADOR_DONO', 'OPERADOR_CONTADOR', 'SUPER_ADMIN'],
  plataforma: ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'],
};

// Mesma regra de src/suporte/dominio/ticket.ts (backend) -- espelhada aqui só pra UI (o backend sempre revalida).
function ladoDoRemetente(papel: string, destinatarioTipo: string): 'solicitante' | 'destinatario' {
  return (PAPEIS_DESTINATARIO[destinatarioTipo] ?? []).includes(papel) ? 'destinatario' : 'solicitante';
}

const ROTULO_STATUS: Record<string, { label: string; variant: any }> = {
  aberto: { label: 'Aberto', variant: 'destructive' },
  em_progresso: { label: 'Em Progresso', variant: 'default' },
  pausado: { label: 'Pausado', variant: 'warning' },
  fechado: { label: 'Fechado', variant: 'secondary' },
};

const ROTULO_PRIORIDADE: Record<string, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
const PRIORIDADES: string[] = ['baixa', 'media', 'alta'];

function CardKpi({ label, valor, icone: Icone, cor }: { label: string; valor: number | undefined; icone: any; cor: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icone className={cn('h-5 w-5 shrink-0', cor)} />
        <div>
          <p className="text-xl font-bold leading-none">{valor ?? '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DialogNovoTicket({
  ehContador,
  ticketsDeEmpresasParaReferenciar,
  onSaveComplete,
}: {
  ehContador: boolean;
  ticketsDeEmpresasParaReferenciar: any[];
  onSaveComplete: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [mensagemInicial, setMensagemInicial] = useState('');
  const [ticketReferenciaId, setTicketReferenciaId] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!titulo.trim() || !mensagemInicial.trim()) {
      setErro('Preencha título e mensagem.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await criarTicket({
        titulo: titulo.trim(),
        prioridade,
        mensagemInicial: mensagemInicial.trim(),
        ticketReferenciaId: ticketReferenciaId || undefined,
        anexo,
      });
      showSuccess('Ticket aberto com sucesso.');
      onSaveComplete();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível abrir o ticket');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={300} />
      </div>
      <div className="space-y-1.5">
        <Label>Prioridade</Label>
        <Select value={prioridade} onValueChange={setPrioridade}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p} value={p}>
                {ROTULO_PRIORIDADE[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {ehContador && (
        <div className="space-y-1.5">
          <Label>Referenciar ticket de uma empresa (opcional)</Label>
          <Select value={ticketReferenciaId} onValueChange={setTicketReferenciaId}>
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              {ticketsDeEmpresasParaReferenciar.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Mensagem *</Label>
        <Textarea rows={4} value={mensagemInicial} onChange={(e) => setMensagemInicial(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Anexo (opcional)</Label>
        <Input type="file" onChange={(e) => setAnexo(e.target.files?.[0] ?? null)} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button onClick={salvar} disabled={enviando} className="w-full">
        {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Abrir ticket
      </Button>
    </div>
  );
}

function DialogThreadTicket({ ticket, papelAtual, onChanged }: { ticket: any; papelAtual: string; onChanged: () => void }) {
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [conteudo, setConteudo] = useState('');
  const [anexo, setAnexo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [processando, setProcessando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ladoAtual = ladoDoRemetente(papelAtual, ticket.destinatarioTipo);
  const podeMudarPrioridade = ladoAtual === 'destinatario';
  const fechado = ticket.status === 'fechado';

  function carregar() {
    listarMensagens(ticket.id)
      .then(setMensagens)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_POLLING_MS);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensagens.length]);

  const ultimaMensagem = mensagens[mensagens.length - 1];
  const minhaVez = !ultimaMensagem || ultimaMensagem.remetenteLado !== ladoAtual;

  async function enviar() {
    if (!conteudo.trim()) return;
    setEnviando(true);
    try {
      await enviarMensagem(ticket.id, { conteudo: conteudo.trim(), anexo });
      setConteudo('');
      setAnexo(null);
      carregar();
      onChanged();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function mudarStatus(novoStatus: string) {
    setProcessando(true);
    try {
      await atualizarStatusTicket(ticket.id, novoStatus);
      showSuccess('Status atualizado.');
      onChanged();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function mudarPrioridade(novaPrioridade: string) {
    setProcessando(true);
    try {
      await atualizarPrioridadeTicket(ticket.id, novaPrioridade);
      showSuccess('Prioridade atualizada.');
      onChanged();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(false);
    }
  }

  async function baixarAnexo(mensagemId: string) {
    try {
      const { url } = await obterUrlAnexoMensagem(ticket.id, mensagemId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      showError(e.message);
    }
  }

  return (
    <div className="flex h-[65vh] flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b pb-3">
        <Badge variant={ROTULO_STATUS[ticket.status]?.variant}>{ROTULO_STATUS[ticket.status]?.label}</Badge>
        {podeMudarPrioridade ? (
          <Select value={ticket.prioridade} onValueChange={mudarPrioridade}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p} value={p}>
                  {ROTULO_PRIORIDADE[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline">{ROTULO_PRIORIDADE[ticket.prioridade]}</Badge>
        )}
        <div className="ml-auto flex gap-1">
          {ticket.status === 'pausado' && (
            <Button size="sm" variant="ghost" disabled={processando} onClick={() => mudarStatus('em_progresso')}>
              Retomar
            </Button>
          )}
          {ticket.status !== 'fechado' && ticket.status !== 'pausado' && (
            <Button size="sm" variant="ghost" disabled={processando} onClick={() => mudarStatus('pausado')}>
              Pausar
            </Button>
          )}
          {ticket.status !== 'fechado' && (
            <Button size="sm" variant="ghost" disabled={processando} onClick={() => mudarStatus('fechado')}>
              Fechar
            </Button>
          )}
          {ticket.status === 'fechado' && (
            <Button size="sm" variant="ghost" disabled={processando} onClick={() => mudarStatus('aberto')}>
              Reabrir
            </Button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-1">
        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          mensagens.map((m) => (
            <div
              key={m.id}
              className={cn(
                'max-w-[80%] rounded-lg p-3 text-sm',
                m.remetenteLado === ladoAtual ? 'ml-auto bg-primary text-primary-foreground' : 'bg-secondary',
              )}
            >
              <p className="whitespace-pre-wrap">{m.conteudo}</p>
              {m.anexoStorageRef && (
                <button type="button" onClick={() => baixarAnexo(m.id)} className="mt-1 flex items-center gap-1 text-xs underline opacity-90">
                  <Paperclip className="h-3 w-3" /> {m.anexoNome ?? 'Anexo'}
                </button>
              )}
              <p className="mt-1 text-right text-[10px] opacity-70">{new Date(m.criadoEm).toLocaleString('pt-BR')}</p>
            </div>
          ))
        )}
      </div>

      {fechado ? (
        <p className="mt-3 rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">
          Este ticket está fechado. Reabra pra enviar novas mensagens.
        </p>
      ) : (
        <div className="mt-3 space-y-2 border-t pt-3">
          <p className={cn('text-xs font-medium', minhaVez ? 'text-green-600' : 'text-amber-600')}>
            {minhaVez ? 'Sua vez de responder.' : 'Aguardando resposta do outro lado.'}
          </p>
          <Textarea
            rows={3}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            disabled={!minhaVez || enviando}
            placeholder="Escreva sua mensagem..."
          />
          <div className="flex items-center gap-2">
            <Input type="file" className="max-w-[220px]" disabled={!minhaVez || enviando} onChange={(e) => setAnexo(e.target.files?.[0] ?? null)} />
            <Button onClick={enviar} disabled={!minhaVez || enviando || !conteudo.trim()} className="ml-auto">
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Suporte() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const papelAtual = usuario?.papel;
  const ehContador = papelAtual === 'CONTADOR_DONO' || papelAtual === 'OPERADOR_CONTADOR';
  const podeAbrirTicket = ['CONTADOR_DONO', 'OPERADOR_CONTADOR', 'EMPRESARIO_DONO', 'OPERADOR_EMPRESA'].includes(papelAtual);

  const [aba, setAba] = useState<'empresas' | 'proprios'>('empresas');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>(null);
  const [ticketsParaReferenciar, setTicketsParaReferenciar] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [ticketAberto, setTicketAberto] = useState<any | null>(null);
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);

  const paramsEscopo = ehContador ? { origem: aba } : {};

  function carregar() {
    setCarregando(true);
    Promise.all([
      listarTickets({ ...paramsEscopo, status: statusFiltro || undefined }),
      obterResumoSuporte(paramsEscopo),
    ])
      .then(([listaTickets, resumoDados]) => {
        setTickets(listaTickets);
        setResumo(resumoDados);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, INTERVALO_POLLING_MS);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, statusFiltro]);

  useEffect(() => {
    if (ehContador) {
      listarTickets({ origem: 'empresas' }).then(setTicketsParaReferenciar).catch(() => {});
    }
  }, [ehContador, dialogNovoAberto]);

  // Mantém o dialog de thread sincronizado com a lista (status/prioridade mudam via polling).
  useEffect(() => {
    if (!ticketAberto) return;
    const atualizado = tickets.find((t) => t.id === ticketAberto.id);
    if (atualizado) setTicketAberto(atualizado);
  }, [tickets, ticketAberto]);

  const ticketsFiltrados = busca ? tickets.filter((t) => t.titulo.toLowerCase().includes(busca.toLowerCase())) : tickets;

  if (!usuario) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <LifeBuoy className="mr-2 h-6 w-6" /> Suporte
        </h1>
        {podeAbrirTicket && (
          <Button onClick={() => setDialogNovoAberto(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Ticket
          </Button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <CardKpi label="Abertos" valor={resumo?.abertos} icone={AlertTriangle} cor="text-destructive" />
        <CardKpi label="Em Progresso" valor={resumo?.emProgresso} icone={Clock} cor="text-primary" />
        <CardKpi label="Pausados" valor={resumo?.pausados} icone={Pause} cor="text-amber-500" />
        <CardKpi label="Fechados" valor={resumo?.fechados} icone={CheckCircle2} cor="text-muted-foreground" />
        <CardKpi label="Para Responder" valor={resumo?.paraResponder} icone={MessageSquare} cor="text-green-600" />
      </div>

      {ehContador && (
        <Tabs value={aba} onValueChange={(v) => setAba(v as 'empresas' | 'proprios')} className="mb-4">
          <TabsList>
            <TabsTrigger value="empresas">Recebidos das Empresas</TabsTrigger>
            <TabsTrigger value="proprios">Meus tickets pra Jota</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Buscar por título..." value={busca} onChange={(e) => setBusca(e.target.value)} className="sm:max-w-xs" />
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v === 'todos' ? '' : v)}>
          <SelectTrigger className="sm:max-w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.keys(ROTULO_STATUS).map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando && tickets.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Atualizado em</TableHead>
                    <TableHead className="w-[100px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketsFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum ticket encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ticketsFiltrados.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.titulo}</TableCell>
                        <TableCell>
                          <Badge variant={ROTULO_STATUS[t.status]?.variant}>{ROTULO_STATUS[t.status]?.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ROTULO_PRIORIDADE[t.prioridade]}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(t.atualizadoEm).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setTicketAberto(t)}>
                            Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogNovoAberto} onOpenChange={setDialogNovoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Ticket</DialogTitle>
          </DialogHeader>
          <DialogNovoTicket
            ehContador={ehContador}
            ticketsDeEmpresasParaReferenciar={ticketsParaReferenciar}
            onSaveComplete={() => {
              setDialogNovoAberto(false);
              carregar();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!ticketAberto} onOpenChange={(aberto) => !aberto && setTicketAberto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ticketAberto?.titulo}</DialogTitle>
          </DialogHeader>
          {ticketAberto && <DialogThreadTicket ticket={ticketAberto} papelAtual={papelAtual} onChanged={carregar} />}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
