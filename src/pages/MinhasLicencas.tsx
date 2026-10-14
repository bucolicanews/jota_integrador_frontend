import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { CreditCard, KeyRound, Loader2, PlusCircle, Power } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listarEmpresas } from '../servicos/empresas';
import { listarPacotesModulos } from '../servicos/pacotesModulos';
import { ativarLicenca, desativarLicenca, iniciarCheckoutLicenca, listarLicencasModulo } from '../servicos/licencasModulo';
import { criarPlanoRevenda, listarPlanosRevenda } from '../servicos/planosRevendaPacote';
import { atualizarPagbankConta, iniciarPagamentoAtivacao, obterStatusPagbankConta } from '../servicos/pagbankLicencas';
import { showError, showSuccess } from '../utils/toast';

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  disponivel: { label: 'Disponível', variant: 'secondary' },
  ativa: { label: 'Ativa', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

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

interface DadosFormPlanoRevenda {
  pacoteId: string;
  valorVenda: number;
}

/** "Meu plano de revenda" de um pacote -- preço final cobrado do cliente, com margem sobre pacote.preco. */
function CardPlanosRevenda({
  contadorId,
  pacotes,
  planosRevenda,
  onSalvo,
}: {
  contadorId: string;
  pacotes: any[];
  planosRevenda: any[];
  onSalvo: () => void;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormPlanoRevenda>({ defaultValues: { pacoteId: '', valorVenda: 0 } });

  const pacoteId = watch('pacoteId');
  const pacoteSelecionado = pacotes.find((p) => p.id === pacoteId);

  async function aoSubmeter(dados: DadosFormPlanoRevenda) {
    try {
      await criarPlanoRevenda(contadorId, { pacoteId: dados.pacoteId, valorVenda: Number(dados.valorVenda) });
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
          <CardTitle className="text-base">Meus planos de revenda</CardTitle>
          <CardDescription>Seu preço final pra cada pacote -- a margem sobre o repasse da plataforma.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogAberto(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo plano
        </Button>
      </CardHeader>
      <CardContent>
        {planosRevenda.length === 0 ? (
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
              {planosRevenda.map((plano) => {
                const pacote = pacotes.find((p) => p.id === plano.pacoteId);
                return (
                  <TableRow key={plano.id}>
                    <TableCell className="font-medium">{pacote?.nome ?? plano.pacoteId}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{pacote ? formatarMoeda(pacote.preco) : '—'}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(plano.valorVenda)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {pacote ? formatarMoeda(plano.valorVenda - pacote.preco) : '—'}
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
            <DialogTitle>Novo plano de revenda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pacote *</Label>
              <select {...register('pacoteId', { required: true })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Selecione...</option>
                {pacotes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({formatarMoeda(p.preco)})
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
                min={pacoteSelecionado?.preco ?? 0.01}
                {...register('valorVenda', { required: true, valueAsNumber: true, min: pacoteSelecionado?.preco ?? 0.01 })}
              />
              {pacoteSelecionado && (
                <p className="text-xs text-muted-foreground">Não pode ser menor que {formatarMoeda(pacoteSelecionado.preco)}.</p>
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

function DialogAtivar({
  licenca,
  empresas,
  planosRevenda,
  pagbankDisponivel,
  contadorId,
  onClose,
  onAtivada,
}: {
  licenca: any;
  empresas: any[];
  planosRevenda: any[];
  pagbankDisponivel: boolean;
  contadorId: string;
  onClose: () => void;
  onAtivada: () => void;
}) {
  const [empresaId, setEmpresaId] = useState('');
  const [cobrarComSplit, setCobrarComSplit] = useState(false);
  const [planoRevendaId, setPlanoRevendaId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerTelefone, setCustomerTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pagamentoIniciado, setPagamentoIniciado] = useState<{ pixCode: string | null; pixQrUrl: string | null } | null>(null);

  const planosDoPacote = planosRevenda.filter((p) => p.pacoteId === licenca.pacoteId && p.ativo);

  async function ativarGratis() {
    if (!empresaId) {
      setErro('Selecione a empresa.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await ativarLicenca(licenca.contadorId, licenca.id, { empresaId, valorCobrado: null, parcelamento: null });
      showSuccess('Licença ativada -- módulos liberados nessa empresa.');
      onAtivada();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível ativar a licença');
    } finally {
      setEnviando(false);
    }
  }

  async function cobrarCliente() {
    if (!empresaId) {
      setErro('Selecione a empresa.');
      return;
    }
    if (!planoRevendaId) {
      setErro('Selecione o plano de revenda.');
      return;
    }
    if (!customerEmail.trim()) {
      setErro('Informe o e-mail da empresa pra receber a cobrança.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await iniciarPagamentoAtivacao(contadorId, licenca.id, {
        empresaId,
        metodo: 'pix',
        customerEmail: customerEmail.trim(),
        customerTelefoneE164: customerTelefone.trim() || undefined,
      });
      setPagamentoIniciado({ pixCode: resultado.pixCode, pixQrUrl: resultado.pixQrUrl });
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível iniciar o pagamento');
    } finally {
      setEnviando(false);
    }
  }

  if (pagamentoIniciado) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          Pendência criada -- a empresa paga o PIX abaixo pra liberar o módulo automaticamente (split confirmado via
          webhook).
        </p>
        {pagamentoIniciado.pixQrUrl && (
          <img src={pagamentoIniciado.pixQrUrl} alt="QR code PIX" className="mx-auto h-48 w-48" />
        )}
        {pagamentoIniciado.pixCode && (
          <div className="space-y-1">
            <Label className="text-xs">Código PIX (copiar e colar)</Label>
            <Input readOnly value={pagamentoIniciado.pixCode} onClick={(e) => (e.target as HTMLInputElement).select()} />
          </div>
        )}
        <Button
          className="w-full"
          onClick={() => {
            setPagamentoIniciado(null);
            onAtivada();
          }}
        >
          Fechar
        </Button>
      </div>
    );
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

      {pagbankDisponivel && planosDoPacote.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox checked={cobrarComSplit} onCheckedChange={(v) => setCobrarComSplit(Boolean(v))} id="cobrar-split" />
          <Label htmlFor="cobrar-split" className="cursor-pointer font-normal">
            Cobrar a empresa (split automático via PagBank)
          </Label>
        </div>
      )}

      {cobrarComSplit ? (
        <>
          <div className="space-y-1.5">
            <Label>Plano de revenda *</Label>
            <Select value={planoRevendaId} onValueChange={setPlanoRevendaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {planosDoPacote.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatarMoeda(p.valorVenda)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>E-mail da empresa (cobrança) *</Label>
            <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone da empresa (opcional)</Label>
            <Input placeholder="+5511999998888" value={customerTelefone} onChange={(e) => setCustomerTelefone(e.target.value)} />
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Ativação gratuita -- a empresa não paga nada por este módulo.</p>
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <Button onClick={cobrarComSplit ? cobrarCliente : ativarGratis} disabled={enviando} className="w-full">
        {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {cobrarComSplit ? 'Gerar PIX pra empresa pagar' : 'Ativar licença (grátis)'}
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
  const [planosRevenda, setPlanosRevenda] = useState<any[]>([]);
  const [pagbankStatus, setPagbankStatus] = useState<{ temContaCadastrada: boolean; splitHabilitado: boolean } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [licencaParaAtivar, setLicencaParaAtivar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    if (!contadorId) return;
    setCarregando(true);
    Promise.all([
      listarPacotesModulos(true),
      listarLicencasModulo(contadorId),
      listarEmpresas(),
      listarPlanosRevenda(contadorId),
      obterStatusPagbankConta(contadorId),
    ])
      .then(([listaPacotes, listaLicencas, listaEmpresas, listaPlanosRevenda, statusPagbank]) => {
        setPacotes(listaPacotes);
        setLicencas(listaLicencas);
        setEmpresas(listaEmpresas);
        setPlanosRevenda(listaPlanosRevenda);
        setPagbankStatus(statusPagbank);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [contadorId]);

  const pagbankDisponivel = Boolean(pagbankStatus?.temContaCadastrada && pagbankStatus?.splitHabilitado);
  // Comprar no atacado (Stripe Subscription) é o "Plano B" -- some quando o contador já
  // está pronto pra vender com split (conta PagBank + ao menos 1 plano de revenda), volta
  // a aparecer se faltar qualquer um dos dois (nunca deixa o contador sem opção nenhuma).
  const mostrarComprarAtacado = !pagbankDisponivel || planosRevenda.length === 0;

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
          <CardConfiguracaoRecebimento contadorId={contadorId} onAtualizado={carregar} />
          <CardPlanosRevenda contadorId={contadorId} pacotes={pacotes} planosRevenda={planosRevenda} onSalvo={carregar} />

          {mostrarComprarAtacado && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pacotes disponíveis para compra (no atacado)</h2>
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
          )}

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
              planosRevenda={planosRevenda}
              pagbankDisponivel={pagbankDisponivel}
              contadorId={contadorId}
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
