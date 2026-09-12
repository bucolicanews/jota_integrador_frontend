import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyRound, Loader2, PlusCircle, Power } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listarEmpresas } from '../servicos/empresas';
import { listarPacotesModulos } from '../servicos/pacotesModulos';
import { ativarLicenca, desativarLicenca, iniciarCheckoutLicenca, listarLicencasModulo } from '../servicos/licencasModulo';
import { showError, showSuccess } from '../utils/toast';

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  disponivel: { label: 'Disponível', variant: 'secondary' },
  ativa: { label: 'Ativa', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

function DialogAtivar({ licenca, empresas, onClose, onAtivada }: { licenca: any; empresas: any[]; onClose: () => void; onAtivada: () => void }) {
  const [empresaId, setEmpresaId] = useState('');
  const [valorCobrado, setValorCobrado] = useState('');
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('1');
  const [primeiroVencimento, setPrimeiroVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function ativar() {
    if (!empresaId) {
      setErro('Selecione a empresa.');
      return;
    }
    const valor = valorCobrado.trim() === '' ? null : Number(valorCobrado);
    const quantidade = Number(quantidadeParcelas) || 1;

    setEnviando(true);
    setErro(null);
    try {
      await ativarLicenca(licenca.contadorId, licenca.id, {
        empresaId,
        valorCobrado: valor,
        parcelamento:
          valor && valor > 0
            ? { modo: quantidade > 1 ? 'parcelar' : 'unico', quantidadeParcelas: quantidade, primeiroVencimento, intervaloDias: 30 }
            : null,
      });
      showSuccess('Licença ativada -- módulos liberados nessa empresa.');
      onAtivada();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível ativar a licença');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Empresa da carteira *</Label>
        <Select value={empresaId} onValueChange={setEmpresaId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a empresa" />
          </SelectTrigger>
          <SelectContent>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.razaoSocial}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Valor a cobrar da empresa (opcional)</Label>
        <Input type="number" step="0.01" min="0" placeholder="Deixe em branco para ativar sem cobrar" value={valorCobrado} onChange={(e) => setValorCobrado(e.target.value)} />
      </div>

      {valorCobrado.trim() !== '' && Number(valorCobrado) > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Quantidade de parcelas</Label>
            <Input type="number" min="1" max="360" value={quantidadeParcelas} onChange={(e) => setQuantidadeParcelas(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>1º vencimento</Label>
            <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button onClick={ativar} disabled={enviando} className="w-full">
        {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Ativar licença
      </Button>
    </div>
  );
}

export default function MinhasLicencas() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const contadorId = usuario?.contadorId ?? null;

  const [pacotes, setPacotes] = useState<any[]>([]);
  const [licencas, setLicencas] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [licencaParaAtivar, setLicencaParaAtivar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    if (!contadorId) return;
    setCarregando(true);
    Promise.all([listarPacotesModulos(true), listarLicencasModulo(contadorId), listarEmpresas()])
      .then(([listaPacotes, listaLicencas, listaEmpresas]) => {
        setPacotes(listaPacotes);
        setLicencas(listaLicencas);
        setEmpresas(listaEmpresas);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [contadorId]);

  async function comprar(pacoteId: string) {
    try {
      const origem = window.location.origin;
      const { url } = await iniciarCheckoutLicenca(contadorId, {
        pacoteId,
        successUrl: `${origem}/minhas-licencas?checkout=sucesso`,
        cancelUrl: `${origem}/minhas-licencas?checkout=cancelado`,
      });
      window.location.href = url;
    } catch (e: any) {
      showError(e.message);
    }
  }

  async function desativar(licenca: any) {
    setProcessando(licenca.id);
    try {
      await desativarLicenca(contadorId, licenca.id);
      showSuccess('Licença desativada -- a empresa perdeu acesso aos módulos.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(null);
    }
  }

  if (!contadorId) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Esta tela é para contadores comprarem e ativarem pacotes de módulos nas empresas da carteira.</p>
      </LayoutPrincipal>
    );
  }

  const empresaDoId = (id: string | null) => empresas.find((e) => e.id === id);

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <KeyRound className="mr-2 h-6 w-6" /> Minhas Licenças
        </h1>
      </div>

      {carregando ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pacotes disponíveis para compra</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pacotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pacote disponível no momento.</p>
                ) : (
                  pacotes.map((p) => (
                    <Card key={p.id} className="border-primary/30">
                      <CardContent className="p-4">
                        <p className="font-semibold">{p.nome}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{p.modulos.join(', ')}</p>
                        <p className="mt-2 text-lg font-bold text-primary">
                          {formatarMoeda(p.preco)}
                          <span className="text-xs font-normal text-muted-foreground">/{p.periodicidade === 'mensal' ? 'mês' : 'ano'}</span>
                        </p>
                        <Button size="sm" className="mt-2 w-full" onClick={() => comprar(p.id)}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Comprar
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pacote</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ativada em</TableHead>
                      <TableHead className="w-[220px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licencas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          Nenhuma licença comprada ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      licencas.map((l) => {
                        const pacote = pacotes.find((p) => p.id === l.pacoteId);
                        const badge = STATUS_BADGE[l.status] ?? { label: l.status, variant: 'secondary' };
                        const empresaAtivada = empresaDoId(l.empresaId);
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{pacote?.nome ?? l.pacoteId}</TableCell>
                            <TableCell>
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                              {empresaAtivada && <span className="ml-2 text-xs text-muted-foreground">em {empresaAtivada.razaoSocial}</span>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{l.ativadoEm ? new Date(l.ativadoEm).toLocaleDateString('pt-BR') : '—'}</TableCell>
                            <TableCell className="text-right">
                              {l.status === 'disponivel' && (
                                <Button size="sm" onClick={() => setLicencaParaAtivar(l)}>
                                  Ativar numa empresa
                                </Button>
                              )}
                              {l.status === 'ativa' && (
                                <Button size="sm" variant="ghost" onClick={() => desativar(l)} disabled={processando === l.id}>
                                  {processando === l.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Power className="mr-2 h-3.5 w-3.5" />}
                                  Desativar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!licencaParaAtivar} onOpenChange={(aberto) => !aberto && setLicencaParaAtivar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ativar licença numa empresa</DialogTitle>
          </DialogHeader>
          {licencaParaAtivar && (
            <DialogAtivar
              licenca={licencaParaAtivar}
              empresas={empresas}
              onClose={() => setLicencaParaAtivar(null)}
              onAtivada={() => {
                setLicencaParaAtivar(null);
                carregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
