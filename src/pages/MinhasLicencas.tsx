import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { CreditCard, KeyRound, Loader2, PlusCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { atualizarPagbankConta, obterStatusPagbankConta } from '../servicos/pagbankLicencas';
import { criarPlanoRevendaCredito, listarPlanos, listarPlanosRevendaCreditos } from '../servicos/assinatura';
import { listarPacotesCreditosAvulsos } from '../servicos/creditosAvulsos';
import { criarPlanoRevendaCreditoAvulso, listarPlanosRevendaCreditosAvulsos } from '../servicos/planosRevendaCreditosAvulsos';
import { showError, showSuccess } from '../utils/toast';

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** Cadastro manual da conta PagBank do contador -- sem OAuth, só o account id colado. */
function CardConfiguracaoRecebimento({ contadorId, onAtualizado }: { contadorId: string; onAtualizado: () => void }) {
  const [status, setStatus] = useState<{ temContaCadastrada: boolean; splitHabilitado: boolean } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    obterStatusPagbankConta(contadorId)
      .then(setStatus)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [contadorId]);

  async function salvar() {
    if (!accountId.trim()) {
      showError('Informe o ID da conta PagBank.');
      return;
    }
    setSalvando(true);
    try {
      await atualizarPagbankConta(contadorId, accountId.trim());
      showSuccess('Conta PagBank cadastrada.');
      setAccountId('');
      carregar();
      onAtualizado();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <CreditCard className="mr-2 h-4 w-4" /> Configuração de recebimento (PagBank)
        </CardTitle>
        <CardDescription>
          Pra vender pacotes com split automático (você recebe sua margem, a Jota recebe o repasse), cadastre o ID da
          sua conta PagBank -- encontrado no painel da própria PagBank.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Conta cadastrada:{' '}
              <Badge variant={status?.temContaCadastrada ? 'success' : 'secondary'}>
                {status?.temContaCadastrada ? 'Sim' : 'Não'}
              </Badge>
              {!status?.splitHabilitado && (
                <span className="ml-2 text-xs text-muted-foreground">(split temporariamente indisponível na plataforma)</span>
              )}
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="ID da conta PagBank"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={salvar} disabled={salvando}>
                {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status?.temContaCadastrada ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DadosFormPlanoRevendaCredito {
  planoId: string;
  valorVenda: number;
}

/** "Meu plano de revenda" de créditos SERPRO -- preço final cobrado do cliente, com margem sobre o preço do plano. */
function CardPlanosRevendaCreditos({
  contadorId,
  planosCreditos,
  planosRevendaCreditos,
  onSalvo,
}: {
  contadorId: string;
  planosCreditos: any[];
  planosRevendaCreditos: any[];
  onSalvo: () => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormPlanoRevendaCredito>({ defaultValues: { planoId: '', valorVenda: 0 } });

  const planoId = watch('planoId');
  const planoSelecionado = planosCreditos.find((p) => p.id === planoId);

  async function aoSubmeter(dados: DadosFormPlanoRevendaCredito) {
    try {
      await criarPlanoRevendaCredito(contadorId, { planoId: dados.planoId, nome: null, valorVenda: Number(dados.valorVenda) });
      showSuccess('Plano de revenda salvo.');
      setDialogAberto(false);
      reset({ planoId: '', valorVenda: 0 });
      onSalvo();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível salvar o plano de revenda');
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Meus planos de revenda — Créditos SERPRO</CardTitle>
          <CardDescription>Seu preço final pra cada plano de créditos -- a margem sobre o repasse da plataforma. Use em Assinatura, na empresa selecionada.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo plano
        </Button>
      </CardHeader>
      <CardContent>
        {planosRevendaCreditos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano de revenda cadastrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Repasse plataforma</TableHead>
                <TableHead className="text-right">Meu preço de venda</TableHead>
                <TableHead className="text-right">Minha margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planosRevendaCreditos.map((plano) => {
                const planoCredito = planosCreditos.find((p) => p.id === plano.planoId);
                return (
                  <TableRow key={plano.id}>
                    <TableCell className="font-medium">{planoCredito?.nome ?? plano.planoId}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{planoCredito ? formatarMoeda(planoCredito.preco) : '—'}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(plano.valorVenda)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {planoCredito ? formatarMoeda(plano.valorVenda - planoCredito.preco) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo plano de revenda de créditos</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Plano de créditos *</Label>
              <select {...register('planoId', { required: true })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {planosCreditos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({formatarMoeda(p.preco)})
                  </option>
                ))}
              </select>
              {errors.planoId && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Meu preço de venda (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min={planoSelecionado?.preco ?? 0.01}
                {...register('valorVenda', { required: true, valueAsNumber: true, min: planoSelecionado?.preco ?? 0.01 })}
              />
              {planoSelecionado && (
                <p className="text-xs text-muted-foreground">Não pode ser menor que {formatarMoeda(planoSelecionado.preco)}.</p>
              )}
              {errors.valorVenda && <p className="text-xs text-destructive">Valor abaixo do repasse da plataforma</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface DadosFormPlanoRevendaCreditoAvulso {
  pacoteId: string;
  valorVenda: number;
}

/** "Meu plano de revenda" de crédito avulso (top-up pontual) -- mesmo conceito de CardPlanosRevendaCreditos, aqui pra pacotes avulsos. */
function CardPlanosRevendaCreditosAvulsos({
  contadorId,
  pacotesAvulsos,
  planosRevendaAvulsos,
  onSalvo,
}: {
  contadorId: string;
  pacotesAvulsos: any[];
  planosRevendaAvulsos: any[];
  onSalvo: () => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormPlanoRevendaCreditoAvulso>({ defaultValues: { pacoteId: '', valorVenda: 0 } });

  const pacoteId = watch('pacoteId');
  const pacoteSelecionado = pacotesAvulsos.find((p) => p.id === pacoteId);

  async function aoSubmeter(dados: DadosFormPlanoRevendaCreditoAvulso) {
    try {
      await criarPlanoRevendaCreditoAvulso(contadorId, { pacoteId: dados.pacoteId, nome: null, valorVenda: Number(dados.valorVenda) });
      showSuccess('Plano de revenda salvo.');
      setDialogAberto(false);
      reset({ pacoteId: '', valorVenda: 0 });
      onSalvo();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível salvar o plano de revenda');
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Meus planos de revenda — Crédito avulso</CardTitle>
          <CardDescription>Seu preço final pra cada pacote de top-up pontual -- a margem sobre o repasse da plataforma. A empresa vê e compra isso direto na própria tela de créditos.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo plano
        </Button>
      </CardHeader>
      <CardContent>
        {planosRevendaAvulsos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano de revenda cadastrado ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pacote</TableHead>
                <TableHead className="text-right">Repasse plataforma</TableHead>
                <TableHead className="text-right">Meu preço de venda</TableHead>
                <TableHead className="text-right">Minha margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planosRevendaAvulsos.map((plano) => {
                const pacote = pacotesAvulsos.find((p) => p.id === plano.pacoteId);
                return (
                  <TableRow key={plano.id}>
                    <TableCell className="font-medium">
                      {pacote ? (
                        `${pacote.nome} (${pacote.quantidadeCreditos} créditos)`
                      ) : (
                        <span className="text-muted-foreground">Pacote inativo/removido</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{pacote ? formatarMoeda(pacote.precoReais) : '—'}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(plano.valorVenda)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {pacote ? formatarMoeda(plano.valorVenda - pacote.precoReais) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo plano de revenda de crédito avulso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pacote *</Label>
              <select {...register('pacoteId', { required: true })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {pacotesAvulsos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} -- {p.quantidadeCreditos} créditos ({formatarMoeda(p.precoReais)})
                  </option>
                ))}
              </select>
              {errors.pacoteId && <p className="text-xs text-destructive">Obrigatório</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Meu preço de venda (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min={pacoteSelecionado?.precoReais ?? 0.01}
                {...register('valorVenda', { required: true, valueAsNumber: true, min: pacoteSelecionado?.precoReais ?? 0.01 })}
              />
              {pacoteSelecionado && (
                <p className="text-xs text-muted-foreground">Não pode ser menor que {formatarMoeda(pacoteSelecionado.precoReais)}.</p>
              )}
              {errors.valorVenda && <p className="text-xs text-destructive">Valor abaixo do repasse da plataforma</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function MinhasLicencas() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const contadorId = usuario?.contadorId ?? null;

  const [planosCreditos, setPlanosCreditos] = useState<any[]>([]);
  const [planosRevendaCreditos, setPlanosRevendaCreditos] = useState<any[]>([]);
  const [pacotesAvulsos, setPacotesAvulsos] = useState<any[]>([]);
  const [planosRevendaAvulsos, setPlanosRevendaAvulsos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  function carregar() {
    if (!contadorId) return;
    setCarregando(true);
    Promise.all([
      listarPlanos(),
      listarPlanosRevendaCreditos(contadorId),
      listarPacotesCreditosAvulsos(),
      listarPlanosRevendaCreditosAvulsos(contadorId),
    ])
      .then(([listaPlanosCreditos, listaPlanosRevendaCreditos, listaPacotesAvulsos, listaPlanosRevendaAvulsos]) => {
        setPlanosCreditos(listaPlanosCreditos);
        setPlanosRevendaCreditos(listaPlanosRevendaCreditos);
        setPacotesAvulsos(listaPacotesAvulsos);
        setPlanosRevendaAvulsos(listaPlanosRevendaAvulsos);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [contadorId]);

  if (!contadorId) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Esta tela é pra contador configurar revenda de planos de crédito SERPRO.</p>
      </LayoutPrincipal>
    );
  }

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
          <CardConfiguracaoRecebimento contadorId={contadorId} onAtualizado={carregar} />
          <CardPlanosRevendaCreditos contadorId={contadorId} planosCreditos={planosCreditos} planosRevendaCreditos={planosRevendaCreditos} onSalvo={carregar} />
          <CardPlanosRevendaCreditosAvulsos contadorId={contadorId} pacotesAvulsos={pacotesAvulsos} planosRevendaAvulsos={planosRevendaAvulsos} onSalvo={carregar} />
        </>
      )}
    </LayoutPrincipal>
  );
}
