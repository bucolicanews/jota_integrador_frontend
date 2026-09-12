import { useEffect, useState } from 'react';
import { Loader2, PlusCircle, FileStack } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProtocoloCard from '../components/protocolos/ProtocoloCard';
import ProtocoloAcoesMenu from '../components/protocolos/ProtocoloAcoesMenu';
import FormProtocolo from '../components/protocolos/FormProtocolo';
import DialogDetalheProtocolo from '../components/protocolos/DialogDetalheProtocolo';
import DialogRegistrarEntrega from '../components/protocolos/DialogRegistrarEntrega';
import DialogCancelarOuProblema from '../components/protocolos/DialogCancelarOuProblema';
import DialogImprimirProtocolo from '../components/protocolos/DialogImprimirProtocolo';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarClientes } from '../servicos/clientes';
import { listarProtocolos, avancarStatusProtocolo, excluirProtocolo } from '../servicos/protocolos';
import { showError, showSuccess } from '../utils/toast';

const COLUNAS_KANBAN = ['criado', 'impresso', 'transito', 'entregue'] as const;
const ROTULO_COLUNA: Record<string, string> = { criado: 'Criado', impresso: 'Impresso', transito: 'Trânsito', entregue: 'Entregue' };

const ROTULO_STATUS: Record<string, { texto: string; variante: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  criado: { texto: 'Criado', variante: 'secondary' },
  impresso: { texto: 'Impresso', variante: 'warning' },
  transito: { texto: 'Trânsito', variante: 'warning' },
  entregue: { texto: 'Entregue', variante: 'success' },
  cancelado: { texto: 'Cancelado', variante: 'destructive' },
  problema: { texto: 'Problema', variante: 'destructive' },
};

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

export default function Protocolos() {
  const { empresaId } = useEmpresaAtiva();
  const [clientes, setClientes] = useState<any[]>([]);
  const [protocolos, setProtocolos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [dialogFormAberto, setDialogFormAberto] = useState(false);
  const [protocoloParaEditar, setProtocoloParaEditar] = useState<any | null>(null);
  const [protocoloParaDetalhe, setProtocoloParaDetalhe] = useState<string | null>(null);
  const [protocoloParaEntrega, setProtocoloParaEntrega] = useState<any | null>(null);
  const [protocoloParaImprimir, setProtocoloParaImprimir] = useState<any | null>(null);
  const [cancelamento, setCancelamento] = useState<{ protocolo: any; status: 'cancelado' | 'problema' } | null>(null);
  const [protocoloParaExcluir, setProtocoloParaExcluir] = useState<any | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    listarClientes(empresaId, true)
      .then(setClientes)
      .catch((erro) => showError(erro.message));
  }, [empresaId]);

  function carregar() {
    if (!empresaId) return;
    setCarregando(true);
    listarProtocolos(empresaId, filtroStatus || undefined)
      .then(setProtocolos)
      .catch((erro) => showError(erro.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [empresaId, filtroStatus]);

  const protocolosFiltrados = protocolos.filter((p) => {
    if (!filtroTexto.trim()) return true;
    const termo = filtroTexto.toLowerCase();
    const cliente = clientes.find((c) => c.id === p.clienteId);
    const clienteNome = (cliente?.razaoSocial || cliente?.nome || '').toLowerCase();
    return p.numeroProtocolo.toLowerCase().includes(termo) || p.titulo.toLowerCase().includes(termo) || clienteNome.includes(termo);
  });

  async function aoAvancar(protocolo: any) {
    const proximo = protocolo.status === 'criado' ? 'impresso' : 'transito';
    try {
      await avancarStatusProtocolo(empresaId!, protocolo.id, proximo);
      showSuccess('Status atualizado.');
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível avançar o status');
    }
  }

  async function confirmarExclusao() {
    if (!protocoloParaExcluir) return;
    setExcluindo(true);
    try {
      await excluirProtocolo(empresaId!, protocoloParaExcluir.id);
      showSuccess('Protocolo excluído.');
      setProtocoloParaExcluir(null);
      carregar();
    } catch (erro: any) {
      showError(erro.message ?? 'Não foi possível excluir o protocolo');
    } finally {
      setExcluindo(false);
    }
  }

  function acoesPara(protocolo: any) {
    return {
      onVerDetalhes: () => setProtocoloParaDetalhe(protocolo.id),
      onEditar: () => {
        setProtocoloParaEditar(protocolo);
        setDialogFormAberto(true);
      },
      onImprimir: () => setProtocoloParaImprimir(protocolo),
      onAvancar: () => aoAvancar(protocolo),
      onDarBaixa: () => setProtocoloParaEntrega(protocolo),
      onCancelar: () => setCancelamento({ protocolo, status: 'cancelado' }),
      onProblema: () => setCancelamento({ protocolo, status: 'problema' }),
      onExcluir: () => setProtocoloParaExcluir(protocolo),
    };
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <FileStack className="mr-2 h-6 w-6" /> Protocolos
        </h1>
        <Button
          onClick={() => {
            setProtocoloParaEditar(null);
            setDialogFormAberto(true);
          }}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo protocolo
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Buscar por número, título ou cliente..." value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="flex-1" />
        <Select value={filtroStatus || 'todos'} onValueChange={(v) => setFiltroStatus(v === 'todos' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="criado">Criado</SelectItem>
            <SelectItem value="impresso">Impresso</SelectItem>
            <SelectItem value="transito">Trânsito</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="problema">Problema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="kanban" className="w-full">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {COLUNAS_KANBAN.map((status) => {
                const doColuna = protocolosFiltrados.filter((p) => p.status === status);
                return (
                  <div key={status} className="flex flex-col">
                    <h3 className="mb-2 text-sm font-semibold">
                      {ROTULO_COLUNA[status]} <span className="text-muted-foreground">({doColuna.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {doColuna.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed py-8 text-center text-xs text-muted-foreground">Nenhum protocolo</div>
                      ) : (
                        doColuna.map((p) => <ProtocoloCard key={p.id} protocolo={p} clientes={clientes} {...acoesPara(p)} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="lista" className="mt-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Protocolo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[110px]">Criado em</TableHead>
                    <TableHead className="w-[70px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocolosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum protocolo encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    protocolosFiltrados.map((p) => {
                      const cliente = clientes.find((c) => c.id === p.clienteId);
                      return (
                        <TableRow key={p.id} className="cursor-pointer" onClick={() => setProtocoloParaDetalhe(p.id)}>
                          <TableCell className="font-mono text-xs">{p.numeroProtocolo}</TableCell>
                          <TableCell className="text-sm">{cliente ? cliente.razaoSocial || cliente.nome : '—'}</TableCell>
                          <TableCell className="text-sm">{p.titulo}</TableCell>
                          <TableCell>
                            <Badge variant={ROTULO_STATUS[p.status].variante}>{ROTULO_STATUS[p.status].texto}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{formatarData(p.dataCriacao)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <ProtocoloAcoesMenu status={p.status} {...acoesPara(p)} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogFormAberto} onOpenChange={setDialogFormAberto}>
        <DialogContent className="max-w-md md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>{protocoloParaEditar ? 'Editar protocolo' : 'Novo protocolo'}</DialogTitle>
          </DialogHeader>
          <FormProtocolo
            empresaId={empresaId}
            clientes={clientes}
            protocoloInicial={protocoloParaEditar}
            onSaveComplete={() => {
              setDialogFormAberto(false);
              carregar();
            }}
          />
        </DialogContent>
      </Dialog>

      <DialogDetalheProtocolo
        empresaId={empresaId}
        protocoloId={protocoloParaDetalhe}
        open={protocoloParaDetalhe !== null}
        onOpenChange={(open) => !open && setProtocoloParaDetalhe(null)}
      />

      <DialogRegistrarEntrega
        empresaId={empresaId}
        protocolo={protocoloParaEntrega}
        open={protocoloParaEntrega !== null}
        onOpenChange={(open) => !open && setProtocoloParaEntrega(null)}
        onSaveComplete={carregar}
      />

      <DialogCancelarOuProblema
        empresaId={empresaId}
        protocolo={cancelamento?.protocolo ?? null}
        status={cancelamento?.status ?? null}
        open={cancelamento !== null}
        onOpenChange={(open) => !open && setCancelamento(null)}
        onSaveComplete={carregar}
      />

      <DialogImprimirProtocolo
        empresaId={empresaId}
        protocolo={protocoloParaImprimir}
        clientes={clientes}
        open={protocoloParaImprimir !== null}
        onOpenChange={(open) => !open && setProtocoloParaImprimir(null)}
        onImpresso={carregar}
      />

      <AlertDialog open={protocoloParaExcluir !== null} onOpenChange={(open) => !open && setProtocoloParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este protocolo?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutPrincipal>
  );
}
