import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, PlusCircle, ShieldCheck, Trash2 } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { atualizarPapel, criarPapel, deletarPapel, listarPapeis, obterPermissoesDoPapel } from '../servicos/papeis';
import { listarCatalogoPermissoes } from '../servicos/usuarios';
import { showError, showSuccess } from '../utils/toast';

const ROTULO_ESCOPO: Record<string, string> = {
  plataforma: 'Plataforma',
  contador: 'Escritório de contador',
  empresa: 'Empresa cliente',
};

interface DadosFormulario {
  nome: string;
  escopo: 'plataforma' | 'contador' | 'empresa';
  descricao: string;
  permissaoIds: string[];
}

function FormPapel({
  papelInicial,
  papelCriador,
  agindoComoEmpresaId,
  onSaveComplete,
}: {
  papelInicial?: any | null;
  papelCriador: string;
  agindoComoEmpresaId?: string | null;
  onSaveComplete: () => void;
}) {
  const podeEscolherEscopo = papelCriador === 'SUPER_ADMIN';
  const escopoFixo = agindoComoEmpresaId
    ? 'empresa'
    : papelCriador === 'CONTADOR_DONO'
      ? 'contador'
      : papelCriador === 'EMPRESARIO_DONO'
        ? 'empresa'
        : null;
  const isEditing = !!papelInicial;
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [catalogoPermissoes, setCatalogoPermissoes] = useState<any[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);

  useEffect(() => {
    Promise.all([listarCatalogoPermissoes(), isEditing ? obterPermissoesDoPapel(papelInicial.id) : Promise.resolve([])])
      .then(([catalogo, tetoAtual]) => {
        setCatalogoPermissoes(catalogo);
        if (isEditing) setValue('permissaoIds', tetoAtual.map((p: any) => p.id));
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregandoCatalogo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosFormulario>({
    defaultValues: {
      nome: papelInicial?.nome ?? '',
      escopo: papelInicial?.escopo ?? escopoFixo ?? 'plataforma',
      descricao: papelInicial?.descricao ?? '',
      permissaoIds: [],
    },
  });

  const permissaoIdsSelecionados = watch('permissaoIds') ?? [];

  const permissoesPorRecurso = catalogoPermissoes.reduce<Record<string, any[]>>((acc, p) => {
    if (!acc[p.recurso]) acc[p.recurso] = [];
    acc[p.recurso].push(p);
    return acc;
  }, {});

  async function aoSubmeter(dados: DadosFormulario) {
    setErroGeral(null);
    try {
      if (isEditing) {
        await atualizarPapel(papelInicial.id, {
          nome: dados.nome,
          escopo: podeEscolherEscopo ? dados.escopo : undefined,
          descricao: dados.descricao || null,
          permissaoIds: dados.permissaoIds ?? [],
        });
      } else {
        await criarPapel({
          nome: dados.nome,
          escopo: dados.escopo,
          descricao: dados.descricao || null,
          permissaoIds: dados.permissaoIds ?? [],
          empresaId: agindoComoEmpresaId ?? undefined,
        });
      }
      showSuccess(`Papel ${isEditing ? 'atualizado' : 'criado'} com sucesso.`);
      onSaveComplete();
    } catch (e: any) {
      setErroGeral(e.message ?? 'Não foi possível salvar o papel');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      {isEditing && papelInicial.sistema && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          Papel de sistema. Renomear ou trocar o escopo pode travar o acesso de quem já tem este papel -- só altere se
          tiver certeza.
        </p>
      )}
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input placeholder="Ex: Suporte N2" {...register('nome', { required: true, minLength: 2 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório (mín. 2 caracteres)</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Escopo *</Label>
        {podeEscolherEscopo ? (
          <Controller
            control={control}
            name="escopo"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plataforma">Plataforma</SelectItem>
                  <SelectItem value="contador">Escritório de contador</SelectItem>
                  <SelectItem value="empresa">Empresa cliente</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <Input disabled value={ROTULO_ESCOPO[escopoFixo ?? '']} />
        )}
        {!podeEscolherEscopo && (
          <p className="text-xs text-muted-foreground">Papel criado por você vale só pra sua própria equipe.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea placeholder="Pra que serve este papel (opcional)" rows={2} {...register('descricao')} />
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Permissões</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => setValue('permissaoIds', catalogoPermissoes.map((p) => p.id))}
            >
              Marcar todos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="px-2 text-xs sm:px-3 sm:text-sm"
              onClick={() => setValue('permissaoIds', [])}
            >
              Desmarcar todos
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ao criar um usuário com este papel, essas permissões já são concedidas automaticamente -- podem ser ajustadas
          individualmente depois, na tela de Usuários.
        </p>
        <Controller
          control={control}
          name="permissaoIds"
          render={({ field }) => (
            <div className="rounded-md border p-2">
              {carregandoCatalogo ? (
                <p className="p-2 text-xs text-muted-foreground">Carregando catálogo...</p>
              ) : (
                Object.entries(permissoesPorRecurso).map(([recurso, permissoes]) => (
                  <div key={recurso} className="border-b py-1 last:border-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{recurso}</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {permissoes.map((p) => (
                        <label key={p.id} className="flex items-center gap-1.5 text-sm">
                          <Checkbox
                            checked={field.value?.includes(p.id)}
                            onCheckedChange={(marcado) => {
                              const atual = field.value ?? [];
                              field.onChange(marcado ? [...atual, p.id] : atual.filter((v: string) => v !== p.id));
                            }}
                          />
                          {p.acao}
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        />
        <p className="text-xs text-muted-foreground">{permissaoIdsSelecionados.length} permissão(ões) selecionada(s).</p>
      </div>

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isEditing ? 'Salvar alterações' : 'Criar papel'}
      </Button>
    </form>
  );
}

export default function GerenciarPapeis() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const papelAtual = usuario?.papel;
  const podeGerenciar = ['SUPER_ADMIN', 'CONTADOR_DONO', 'EMPRESARIO_DONO'].includes(papelAtual);
  const { empresaAtiva, carteira } = useEmpresaAtiva();

  // CONTADOR_DONO com uma empresa-CLIENTE selecionada no Header (não a própria
  // contabilidade) está "agindo em nome dela" -- gerencia o papel PRIVADO daquela
  // empresa, não o próprio. Selecionar "a própria contabilidade" (ehPropria) ou nada
  // ainda volta pro modo normal (papel do próprio contador).
  const propria = (carteira as any[]).find((e: any) => e.ehPropria);
  const agindoComoEmpresa =
    papelAtual === 'CONTADOR_DONO' && empresaAtiva && empresaAtiva.id !== propria?.id ? empresaAtiva : null;

  const [papeis, setPapeis] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [papelParaEditar, setPapelParaEditar] = useState<any | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listarPapeis(agindoComoEmpresa?.id)
      .then(setPapeis)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [agindoComoEmpresa?.id]);

  async function aoExcluir(id: string) {
    setExcluindo(id);
    try {
      await deletarPapel(id);
      showSuccess('Papel excluído.');
      carregar();
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir o papel');
    } finally {
      setExcluindo(null);
    }
  }

  // Backend já devolve global+próprio (ou global+da empresa, se agindoComoEmpresa) pra
  // esse ator -- aqui só escondemos as linhas globais/sistema da TABELA de gestão de
  // contador/empresa (eles nunca editam essas, só as próprias); SUPER_ADMIN vê tudo que
  // recebeu (só global mesmo). Cuidado: `p.contadorId`/`p.empresaId` são AMBOS null pra
  // linha global -- `null === null` dava falso positivo antes. Só conta como "meu" se o
  // campo do papel não for null E bater com o alvo certo (próprio, ou a empresa em nome
  // de quem estou agindo).
  const papeisExibidos =
    papelAtual === 'SUPER_ADMIN'
      ? papeis
      : agindoComoEmpresa
        ? papeis.filter((p) => p.empresaId === agindoComoEmpresa.id)
        : papeis.filter(
            (p) =>
              (p.contadorId !== null && p.contadorId === usuario?.contadorId) ||
              (p.empresaId !== null && p.empresaId === usuario?.empresaId),
          );

  if (!podeGerenciar) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-muted-foreground">Você não tem acesso a esta tela.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center text-2xl font-bold md:text-3xl">
            <ShieldCheck className="mr-2 h-6 w-6" /> Papéis e Permissões
          </h1>
          {agindoComoEmpresa && (
            <p className="text-sm text-muted-foreground">Gerenciando em nome de {agindoComoEmpresa.razaoSocial}</p>
          )}
        </div>
        <Button
          onClick={() => {
            setPapelParaEditar(null);
            setDialogAberto(true);
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo papel
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
                    <TableHead>Escopo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[90px]">Tipo</TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {papeisExibidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum papel próprio cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                  papeisExibidos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ROTULO_ESCOPO[p.escopo] ?? p.escopo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.descricao ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={p.sistema ? 'secondary' : 'success'}>{p.sistema ? 'Sistema' : 'Customizado'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Editar nome, escopo, descrição e permissões"
                            onClick={() => {
                              setPapelParaEditar(p);
                              setDialogAberto(true);
                            }}
                          >
                            Editar
                          </Button>
                          {!p.sistema && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" disabled={excluindo === p.id} title="Excluir">
                                  {excluindo === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir o papel "{p.nome}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Essa ação não pode ser desfeita. Se algum usuário ainda estiver com este papel, a exclusão é bloqueada --
                                    reatribua o papel dele antes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => aoExcluir(p.id)}>Confirmar exclusão</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
        <DialogContent className="h-fit max-h-[90vh] max-w-md overflow-y-auto md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>{papelParaEditar ? `Editar papel -- ${papelParaEditar.nome}` : 'Novo papel'}</DialogTitle>
          </DialogHeader>
          <FormPapel
            papelInicial={papelParaEditar}
            papelCriador={papelAtual}
            agindoComoEmpresaId={agindoComoEmpresa?.id ?? null}
            onSaveComplete={() => {
              setDialogAberto(false);
              carregar();
            }}
          />
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
