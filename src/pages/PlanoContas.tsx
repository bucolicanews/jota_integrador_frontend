import { Fragment, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BookOpen, ChevronDown, Loader2, PlusCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import EditableCell from '../components/contabilidade/EditableCell';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import {
  atualizarContaContabil,
  criarContaContabil,
  desativarContaContabil,
  listarPlanoContas,
  reativarContaContabil,
} from '../servicos/planoContas';
import { obterSaldoConta } from '../servicos/lancamentos';
import { showError, showSuccess } from '../utils/toast';

const ROTULO_GRUPO: Record<string, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_liquido: 'Patrimônio Líquido',
  receita: 'Receita',
  custo: 'Custo',
  despesa: 'Despesa',
};
const GRUPOS = Object.keys(ROTULO_GRUPO);

const NIVEL_CLASSES: Record<number, string> = {
  1: 'bg-blue-500/10',
  2: 'bg-green-500/10',
  3: 'bg-yellow-500/10',
  4: 'bg-red-500/10',
};

const formatarMoeda = (valor: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

interface Conta {
  id: string;
  codigo: string;
  nome: string;
  grupo: string;
  sintetica: boolean;
  contaPaiId: string | null;
  contaCaixaBanco: boolean;
  contaAReceber: boolean;
  contaAPagar: boolean;
  ativa: boolean;
}

function calcularNivel(conta: Conta, mapa: Map<string, Conta>): number {
  let nivel = 1;
  let atual = conta;
  while (atual.contaPaiId) {
    const pai = mapa.get(atual.contaPaiId);
    if (!pai) break;
    nivel += 1;
    atual = pai;
  }
  return nivel;
}

interface DadosFormulario {
  codigo: string;
  nome: string;
  grupo: string;
  sintetica: 'true' | 'false';
  contaPaiId: string;
  contaCaixaBanco: boolean;
  contaAReceber: boolean;
  contaAPagar: boolean;
}

function ModalConta({
  conta,
  contaPaiSugerida,
  contasSinteticas,
  aoFechar,
  aoSalvar,
}: {
  conta: Conta | null;
  contaPaiSugerida: Conta | null;
  contasSinteticas: Conta[];
  aoFechar: () => void;
  aoSalvar: (contaId: string | null, dados: any) => Promise<void>;
}) {
  const editando = Boolean(conta);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<DadosFormulario>({
    defaultValues: {
      codigo: conta?.codigo ?? '',
      nome: conta?.nome ?? '',
      grupo: conta?.grupo ?? contaPaiSugerida?.grupo ?? 'ativo',
      sintetica: conta ? (conta.sintetica ? 'true' : 'false') : 'false',
      contaPaiId: conta?.contaPaiId ?? contaPaiSugerida?.id ?? '',
      contaCaixaBanco: conta?.contaCaixaBanco ?? false,
      contaAReceber: conta?.contaAReceber ?? false,
      contaAPagar: conta?.contaAPagar ?? false,
    },
  });

  async function aoSubmeter(dados: DadosFormulario) {
    try {
      if (editando && conta) {
        await aoSalvar(conta.id, {
          nome: dados.nome,
          contaCaixaBanco: dados.contaCaixaBanco,
          contaAReceber: dados.contaAReceber,
          contaAPagar: dados.contaAPagar,
        });
      } else {
        await aoSalvar(null, {
          codigo: dados.codigo,
          nome: dados.nome,
          grupo: dados.grupo,
          sintetica: dados.sintetica === 'true',
          contaPaiId: dados.contaPaiId || null,
          contaCaixaBanco: dados.contaCaixaBanco,
          contaAReceber: dados.contaAReceber,
          contaAPagar: dados.contaAPagar,
        });
      }
    } catch (erro: any) {
      setError('root', { message: erro.message ?? 'Não foi possível salvar' });
    }
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{editando ? 'Editar conta' : 'Nova conta contábil'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Código *</Label>
          <Input {...register('codigo', { required: 'Obrigatório' })} disabled={editando} placeholder="Ex: 1.1.01" />
          {editando && <p className="text-xs text-muted-foreground">Código não pode ser alterado depois de criado.</p>}
          {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input {...register('nome', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })} />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
        </div>

        {!editando && (
          <>
            <div className="space-y-1.5">
              <Label>Grupo *</Label>
              <select {...register('grupo')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {GRUPOS.map((grupo) => (
                  <option key={grupo} value={grupo}>
                    {ROTULO_GRUPO[grupo]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <select {...register('sintetica')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="false">Analítica (recebe lançamento)</option>
                <option value="true">Sintética (só agrupa outras contas)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Conta pai (opcional)</Label>
              <select {...register('contaPaiId')} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Nenhuma</option>
                {contasSinteticas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {watch('sintetica') !== 'true' && (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium text-muted-foreground">Uso especial (opcional)</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('contaCaixaBanco')} /> Caixa/Banco (usada na conciliação bancária)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('contaAReceber')} /> Contas a receber
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('contaAPagar')} /> Contas a pagar
            </label>
          </div>
        )}

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export default function PlanoContas() {
  const { empresaId } = useEmpresaAtiva();
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [busca, setBusca] = useState('');
  const [filtroGrupo, setFiltroGrupo] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [contaEditando, setContaEditando] = useState<Conta | null>(null);
  const [contaPaiSugerida, setContaPaiSugerida] = useState<Conta | null>(null);
  const [saldos, setSaldos] = useState<Record<string, number | 'carregando' | 'erro'>>({});

  async function carregar() {
    if (!empresaId) return;
    try {
      const dados = await listarPlanoContas(empresaId);
      setContas(dados);
    } catch (erro: any) {
      showError(erro.message);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  const mapaContas = useMemo(() => new Map((contas ?? []).map((c) => [c.id, c])), [contas]);
  const contasSinteticas = useMemo(() => (contas ?? []).filter((c) => c.sintetica && c.ativa), [contas]);

  const contasFiltradas = useMemo(() => {
    if (!contas) return [];
    const termo = busca.trim().toLowerCase();
    return contas.filter((conta) => {
      if (termo && !`${conta.codigo} ${conta.nome}`.toLowerCase().includes(termo)) return false;
      if (filtroGrupo !== 'todos' && conta.grupo !== filtroGrupo) return false;
      if (filtroTipo !== 'todos' && (filtroTipo === 'sintetica') !== conta.sintetica) return false;
      return true;
    });
  }, [contas, busca, filtroGrupo, filtroTipo]);

  async function verSaldo(contaId: string) {
    if (!empresaId) return;
    setSaldos((atual) => ({ ...atual, [contaId]: 'carregando' }));
    try {
      const { saldo } = await obterSaldoConta(empresaId, contaId);
      setSaldos((atual) => ({ ...atual, [contaId]: saldo }));
    } catch {
      setSaldos((atual) => ({ ...atual, [contaId]: 'erro' }));
    }
  }

  async function aoSalvarConta(contaId: string | null, dados: any) {
    if (!empresaId) return;
    if (contaId) await atualizarContaContabil(empresaId, contaId, dados);
    else await criarContaContabil(empresaId, dados);
    showSuccess('Conta salva com sucesso.');
    setDialogAberto(false);
    setContaEditando(null);
    setContaPaiSugerida(null);
    carregar();
  }

  async function aoAlternarAtiva(conta: Conta) {
    if (!empresaId) return;
    if (!window.confirm(`${conta.ativa ? 'Desativar' : 'Reativar'} a conta ${conta.codigo} — ${conta.nome}?`)) return;
    try {
      if (conta.ativa) await desativarContaContabil(empresaId, conta.id);
      else await reativarContaContabil(empresaId, conta.id);
      carregar();
    } catch (erro: any) {
      showError(erro.message);
    }
  }

  function abrirNovaConta(contaPai: Conta | null = null) {
    setContaEditando(null);
    setContaPaiSugerida(contaPai);
    setDialogAberto(true);
  }

  if (!empresaId) return null;

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <BookOpen className="mr-2 h-6 w-6" /> Plano de Contas
        </h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <Button onClick={() => abrirNovaConta(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nova conta
          </Button>
          <ModalConta
            conta={contaEditando}
            contaPaiSugerida={contaPaiSugerida}
            contasSinteticas={contasSinteticas}
            aoFechar={() => setDialogAberto(false)}
            aoSalvar={aoSalvarConta}
          />
        </Dialog>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input placeholder="Buscar por código ou nome..." className="w-64" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os grupos</SelectItem>
            {GRUPOS.map((grupo) => (
              <SelectItem key={grupo} value={grupo}>
                {ROTULO_GRUPO[grupo]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Analíticas e sintéticas</SelectItem>
            <SelectItem value="analitica">Só analíticas</SelectItem>
            <SelectItem value="sintetica">Só sintéticas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Contas cadastradas ({contasFiltradas.length})</CardTitle>
          {contas === null && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[140px]">Grupo</TableHead>
                  <TableHead className="w-[90px] text-center">Tipo</TableHead>
                  <TableHead className="w-[90px] text-center">Caixa/Banco</TableHead>
                  <TableHead className="w-[90px] text-center">A receber</TableHead>
                  <TableHead className="w-[90px] text-center">A pagar</TableHead>
                  <TableHead className="w-[120px]">Saldo</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas === null ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : contasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                      {contas.length === 0 ? 'Nenhuma conta cadastrada ainda.' : 'Nenhuma conta encontrada com esses filtros.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  contasFiltradas.map((conta) => {
                    const nivel = calcularNivel(conta, mapaContas);
                    const saldo = saldos[conta.id];
                    const linha = (
                      <TableRow className={cn(conta.sintetica && 'cursor-pointer', NIVEL_CLASSES[nivel])}>
                            <TableCell className="font-mono text-sm" style={{ paddingLeft: `${(nivel - 1) * 16 + 16}px` }}>
                              {conta.codigo}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <EditableCell empresaId={empresaId} contaId={conta.id} campo="nome" valor={conta.nome} onSalvo={carregar} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">{ROTULO_GRUPO[conta.grupo]}</TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">{conta.sintetica ? 'Sint.' : 'Anal.'}</TableCell>
                            {(['contaCaixaBanco', 'contaAReceber', 'contaAPagar'] as const).map((campo) => (
                              <TableCell key={campo} onClick={(e) => e.stopPropagation()}>
                                {conta.sintetica ? (
                                  <span className="block text-center text-muted-foreground">—</span>
                                ) : (
                                  <EditableCell
                                    empresaId={empresaId}
                                    contaId={conta.id}
                                    campo={campo}
                                    tipo="booleano"
                                    valor={conta[campo]}
                                    onSalvo={carregar}
                                  />
                                )}
                              </TableCell>
                            ))}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {conta.sintetica ? (
                                <span className="text-muted-foreground">—</span>
                              ) : saldo === undefined ? (
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => verSaldo(conta.id)}>
                                  Ver saldo
                                </Button>
                              ) : saldo === 'carregando' ? (
                                '...'
                              ) : saldo === 'erro' ? (
                                <span className="text-xs text-destructive">erro</span>
                              ) : (
                                <span className="text-sm">{formatarMoeda(saldo)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={conta.ativa ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''} variant={conta.ativa ? 'default' : 'secondary'}>
                                {conta.ativa ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setContaEditando(conta);
                                    setContaPaiSugerida(null);
                                    setDialogAberto(true);
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={conta.ativa ? 'text-destructive' : 'text-green-700'}
                                  onClick={() => aoAlternarAtiva(conta)}
                                >
                                  {conta.ativa ? 'Desativar' : 'Reativar'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                    );

                    if (!conta.sintetica) {
                      return <Fragment key={conta.id}>{linha}</Fragment>;
                    }

                    return (
                      <Popover key={conta.id}>
                        <PopoverTrigger asChild>{linha}</PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-2">
                          <Button variant="ghost" size="sm" onClick={() => abrirNovaConta(conta)}>
                            <ChevronDown className="mr-2 h-4 w-4" /> Criar conta filha
                          </Button>
                        </PopoverContent>
                      </Popover>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </LayoutPrincipal>
  );
}
