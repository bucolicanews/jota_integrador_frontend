import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Loader2, Search, Settings, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { atualizarComissaoHonorarios, obterComissaoHonorarios } from '../servicos/configuracoesPlataforma';
import {
  definirCustoConsultaSerpro,
  listarCustosConsultasSerpro,
  listarRelatorioConsultasSerpro,
  removerCustoConsultaSerpro,
} from '../servicos/custosConsultasSerpro';
import { showError, showSuccess } from '../utils/toast';

interface DadosComissao {
  comissaoHonorariosPct: number;
}

interface DadosNovoCusto {
  idSistema: string;
  custoReais: number;
}

const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v ?? 0);

function CardComissaoHonorarios() {
  const [carregando, setCarregando] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DadosComissao>();

  function carregar() {
    setCarregando(true);
    obterComissaoHonorarios()
      .then((dados) => reset(dados))
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function aoSalvar(dados: DadosComissao) {
    try {
      await atualizarComissaoHonorarios(Number(dados.comissaoHonorariosPct));
      showSuccess('Comissão atualizada com sucesso.');
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível atualizar a comissão');
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-base">Comissão de Honorários da Plataforma</CardTitle>
        <CardDescription>
          Percentual retido pela Jota sobre cada cobrança de honorário (contador → empresa cliente). Vale só pra
          cobranças novas -- as já emitidas mantêm o percentual congelado no momento da criação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(aoSalvar)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('comissaoHonorariosPct', { required: true, valueAsNumber: true, min: 0, max: 100 })}
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Custo real da Jota (R$) por tipo de consulta ao SERPRO -- uso 100% interno do admin,
 * nunca exposto ao contador (mantém a decisão já documentada de não detalhar custo
 * granular pro cliente final). Serve pra acompanhar margem, não pra cobrança.
 */
function CardCustosConsultasSerpro() {
  const [custos, setCustos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<DadosNovoCusto>({ defaultValues: { idSistema: '', custoReais: 0 } });

  function carregar() {
    setCarregando(true);
    listarCustosConsultasSerpro()
      .then(setCustos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function aoSalvar(dados: DadosNovoCusto) {
    try {
      await definirCustoConsultaSerpro(dados.idSistema.trim().toUpperCase(), Number(dados.custoReais));
      showSuccess('Custo salvo com sucesso.');
      reset({ idSistema: '', custoReais: 0 });
      carregar();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível salvar o custo');
    }
  }

  async function aoRemover(idSistema: string) {
    if (!window.confirm(`Remover o custo configurado pra "${idSistema}"?`)) return;
    setRemovendo(idSistema);
    try {
      await removerCustoConsultaSerpro(idSistema);
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Custo por tipo de consulta SERPRO</CardTitle>
        <CardDescription>
          Custo real (R$) que a Jota paga por chamada bem-sucedida a cada sistema do SERPRO (ex: CCMEI, CAIXAPOSTAL)
          -- uso interno pra acompanhar margem, nunca mostrado ao contador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(aoSalvar)} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">id_sistema</Label>
            <Input placeholder="Ex: CCMEI" className="w-40" {...register('idSistema', { required: true, minLength: 1 })} />
            {errors.idSistema && <p className="text-xs text-destructive">Obrigatório</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Custo (R$)</Label>
            <Input type="number" step="0.01" min="0" className="w-32" {...register('custoReais', { required: true, valueAsNumber: true, min: 0 })} />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </form>

        {carregando ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>id_sistema</TableHead>
                <TableHead className="text-right">Custo (R$)</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {custos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                    Nenhum custo configurado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                custos.map((c) => (
                  <TableRow key={c.idSistema}>
                    <TableCell className="font-mono text-sm">{c.idSistema}</TableCell>
                    <TableCell className="text-right">{formatarMoeda(c.custoReais)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => aoRemover(c.idSistema)}
                        disabled={removendo === c.idSistema}
                      >
                        {removendo === c.idSistema ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Relatório agregado de consultas_serpro -- mesma restrição de uso interno do custo. */
function CardRelatorioConsultasSerpro() {
  const [filtro, setFiltro] = useState({ idSistema: '', contadorId: '', empresaId: '', dataInicio: '', dataFim: '' });
  const [linhas, setLinhas] = useState<any[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function buscar() {
    setCarregando(true);
    try {
      const resultado = await listarRelatorioConsultasSerpro(filtro);
      setLinhas(resultado);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível gerar o relatório');
    } finally {
      setCarregando(false);
    }
  }

  const totalGeral = (linhas ?? []).reduce((soma, l) => soma + l.custoTotalReais, 0);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">Relatório de consultas SERPRO</CardTitle>
        <CardDescription>Quantas consultas foram feitas, por quem, e o custo total (R$) -- uso interno.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">id_sistema</Label>
            <Input
              placeholder="Todos"
              className="w-32"
              value={filtro.idSistema}
              onChange={(e) => setFiltro((f) => ({ ...f, idSistema: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contador (UUID)</Label>
            <Input
              placeholder="Todos"
              className="w-48"
              value={filtro.contadorId}
              onChange={(e) => setFiltro((f) => ({ ...f, contadorId: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Empresa (UUID)</Label>
            <Input
              placeholder="Todas"
              className="w-48"
              value={filtro.empresaId}
              onChange={(e) => setFiltro((f) => ({ ...f, empresaId: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">De</Label>
            <Input type="date" value={filtro.dataInicio} onChange={(e) => setFiltro((f) => ({ ...f, dataInicio: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filtro.dataFim} onChange={(e) => setFiltro((f) => ({ ...f, dataFim: e.target.value }))} />
          </div>
          <Button onClick={buscar} disabled={carregando}>
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>

        {linhas !== null && (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Contador</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Sucesso</TableHead>
                  <TableHead className="text-right">Custo total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                      Nenhuma consulta encontrada com esses filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  linhas.map((l, i) => (
                    <TableRow key={`${l.idSistema}-${l.contadorId}-${l.empresaId}-${i}`}>
                      <TableCell className="font-mono text-sm">{l.idSistema}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.contadorId}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.empresaId}</TableCell>
                      <TableCell className="text-right">{l.totalConsultas}</TableCell>
                      <TableCell className="text-right">{l.totalSucesso}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(l.custoTotalReais)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {linhas.length > 0 && (
              <p className="text-right text-sm font-medium text-foreground">Total: {formatarMoeda(totalGeral)}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Configuracoes() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const podeVer = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO'].includes(usuario?.papel);

  if (!usuario) return null;

  if (!podeVer) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Você não tem acesso a esta tela.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <h1 className="mb-6 flex items-center text-2xl font-bold md:text-3xl">
        <Settings className="mr-2 h-6 w-6" /> Configurações
      </h1>

      <div className="space-y-6">
        <CardComissaoHonorarios />
        <CardCustosConsultasSerpro />
        <CardRelatorioConsultasSerpro />
      </div>
    </LayoutPrincipal>
  );
}
