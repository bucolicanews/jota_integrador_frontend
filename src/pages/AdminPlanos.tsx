import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { CreditCard, Loader2, Power, PowerOff, PlusCircle, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  atualizarPlano,
  criarPlano,
  definirConsultaIncluida,
  listarConsultasIncluidas,
  listarPlanos,
  removerConsultaIncluida,
} from '../servicos/planos';
import { MODULOS_DISPONIVEIS } from '../constantes/modulosLicenciaveis';
import { SISTEMAS_SERPRO } from '../constantes/sistemasSerpro';
import { showError, showSuccess } from '../utils/toast';

interface DadosFormulario {
  nome: string;
  descricao: string;
  modulos: string[];
  preco: number;
  periodicidade: 'mensal' | 'anual';
  dataValidade: string;
  gratuito: boolean;
}

function FormPlano({ planoInicial, onSaveComplete }: { planoInicial?: any | null; onSaveComplete: () => void }) {
  const isEditing = !!planoInicial;
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      nome: planoInicial?.nome ?? '',
      descricao: planoInicial?.descricao ?? '',
      modulos: planoInicial?.modulos ?? [],
      preco: planoInicial?.preco ?? 0,
      periodicidade: planoInicial?.periodicidade ?? 'mensal',
      dataValidade: planoInicial?.dataValidade ?? '',
      gratuito: planoInicial?.gratuito ?? false,
    },
  });

  const gratuito = watch('gratuito');

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    const payload = {
      nome: dados.nome,
      descricao: dados.descricao || null,
      modulos: dados.modulos ?? [],
      preco: dados.gratuito ? 0 : dados.preco,
      periodicidade: dados.periodicidade,
      dataValidade: dados.dataValidade || null,
      gratuito: dados.gratuito,
    };
    try {
      if (isEditing) {
        await atualizarPlano(planoInicial.id, payload);
      } else {
        await criarPlano(payload);
      }
      showSuccess(`Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (e: any) {
      setErroGeral(e.message ?? 'Não foi possível salvar o plano');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input placeholder="Ex: Plano Essencial" {...register('nome', { required: true, minLength: 2 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório (mín. 2 caracteres)</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea placeholder="Descrição do plano (opcional)" rows={2} {...register('descricao')} />
      </div>

      <div className="space-y-1.5">
        <Label>Módulos anunciados</Label>
        <p className="text-xs text-muted-foreground">
          Vitrine informativa (o que o plano anuncia incluir) -- não libera módulo pra empresa-cliente, isso continua
          sendo exclusivo de pacotes de módulos.
        </p>
        <Controller
          control={control}
          name="modulos"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
              {MODULOS_DISPONIVEIS.map((m) => (
                <label key={m.valor} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value?.includes(m.valor)}
                    onCheckedChange={(marcado) => {
                      const atual = field.value ?? [];
                      field.onChange(marcado ? [...atual, m.valor] : atual.filter((v) => v !== m.valor));
                    }}
                  />
                  {m.rotulo}
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="gratuito"
          render={({ field }) => (
            <Checkbox checked={field.value} onCheckedChange={(marcado) => field.onChange(Boolean(marcado))} id="plano-gratuito" />
          )}
        />
        <Label htmlFor="plano-gratuito" className="cursor-pointer font-normal">
          Plano grátis
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!gratuito && (
          <div className="space-y-1.5">
            <Label>Preço (R$) *</Label>
            <Input type="number" step="0.01" min="0.01" {...register('preco', { required: !gratuito, valueAsNumber: true, min: 0.01 })} />
            {errors.preco && <p className="text-xs text-destructive">Informe um valor válido</p>}
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Periodicidade *</Label>
          <Controller
            control={control}
            name="periodicidade"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Data de validade</Label>
        <Input type="date" {...register('dataValidade')} />
        <p className="text-xs text-muted-foreground">Vazio = sem expiração. Só bloqueia novas assinaturas.</p>
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar plano'}
      </Button>
    </form>
  );
}

interface DadosNovaConsultaIncluida {
  idSistema: string;
  quantidadePorPeriodo: number;
  periodo: 'semanal' | 'mensal' | 'trimestral' | 'anual';
}

const ROTULOS_PERIODO: Record<DadosNovaConsultaIncluida['periodo'], string> = {
  semanal: 'semana',
  mensal: 'mês',
  trimestral: 'trimestre',
  anual: 'ano',
};

/**
 * Cota de consultas SERPRO incluída "de graça" no plano, por id_sistema (ex: 1x PGDASD/mês)
 * -- dentro dela o sync não debita do pool de créditos (ver VerificarCotaIncluidaUseCase no
 * backend). Só existe pra plano já salvo (precisa de planoId).
 */
function SecaoConsultasIncluidas({ planoId }: { planoId: string }) {
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<DadosNovaConsultaIncluida>({ defaultValues: { idSistema: '', quantidadePorPeriodo: 1, periodo: 'mensal' } });

  function carregar() {
    setCarregando(true);
    listarConsultasIncluidas(planoId)
      .then(setItens)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [planoId]);

  async function aoSalvar(dados: DadosNovaConsultaIncluida) {
    try {
      await definirConsultaIncluida(planoId, dados.idSistema.trim().toUpperCase(), Number(dados.quantidadePorPeriodo), dados.periodo);
      showSuccess('Cota incluída salva com sucesso.');
      reset({ idSistema: '', quantidadePorPeriodo: 1, periodo: 'mensal' });
      carregar();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível salvar a cota incluída');
    }
  }

  async function aoRemover(idSistema: string) {
    if (!window.confirm(`Remover a cota incluída de "${idSistema}" deste plano?`)) return;
    setRemovendo(idSistema);
    try {
      await removerConsultaIncluida(planoId, idSistema);
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <Label className="text-sm font-medium">Consultas incluídas no plano</Label>
        <p className="text-xs text-muted-foreground">
          Quantas consultas de cada sistema do SERPRO (ex: PGDASD) o cliente usa sem gastar crédito, a cada período
          -- além disso, consome crédito normalmente.
        </p>
      </div>

      <form onSubmit={handleSubmit(aoSalvar)} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">id_sistema</Label>
            <Controller
              control={control}
              name="idSistema"
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SISTEMAS_SERPRO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.idSistema && <p className="text-xs text-destructive">Obrigatório</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantidade</Label>
            <Input
              type="number"
              step="1"
              min="1"
              {...register('quantidadePorPeriodo', { required: true, valueAsNumber: true, min: 1 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Período</Label>
            <Controller
              control={control}
              name="periodo"
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </form>

      {carregando ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : itens.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma cota incluída configurada ainda.</p>
      ) : (
        <ul className="space-y-1">
          {itens.map((item) => (
            <li key={item.idSistema} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
              <span>
                <span className="font-mono">{item.idSistema}</span> -- {item.quantidadePorPeriodo}x por {ROTULOS_PERIODO[item.periodo as DadosNovaConsultaIncluida['periodo']] ?? item.periodo}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => aoRemover(item.idSistema)}
                disabled={removendo === item.idSistema}
              >
                {removendo === item.idSistema ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminPlanos() {
  const [planos, setPlanos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [planoParaEditar, setPlanoParaEditar] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listarPlanos()
      .then(setPlanos)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

  async function alternarAtivo(plano: any) {
    setProcessando(plano.id);
    try {
      await atualizarPlano(plano.id, { ativo: !plano.ativo });
      showSuccess(plano.ativo ? 'Plano desativado.' : 'Plano reativado.');
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(null);
    }
  }

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <CreditCard className="mr-2 h-6 w-6" /> Planos de Créditos SERPRO
        </h1>
        <Button
          onClick={() => {
            setPlanoParaEditar(null);
            setDialogAberto(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo plano
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Módulos</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum plano cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    planos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.modulos?.length > 0 ? p.modulos.join(', ') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.gratuito ? (
                            <Badge variant="secondary">Grátis</Badge>
                          ) : (
                            <>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco)}/{p.periodicidade === 'mensal' ? 'mês' : 'ano'}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.dataValidade ? new Date(`${p.dataValidade}T00:00:00`).toLocaleDateString('pt-BR') : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.ativo ? 'success' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPlanoParaEditar(p);
                                setDialogAberto(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => alternarAtivo(p)} disabled={processando === p.id}>
                              {processando === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.ativo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto md:max-w-[70%]">
          <DialogHeader>
            <DialogTitle>{planoParaEditar ? 'Editar plano' : 'Novo plano'}</DialogTitle>
          </DialogHeader>
          <FormPlano
            planoInicial={planoParaEditar}
            onSaveComplete={() => {
              setDialogAberto(false);
              carregar();
            }}
          />
          {planoParaEditar && <SecaoConsultasIncluidas planoId={planoParaEditar.id} />}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
