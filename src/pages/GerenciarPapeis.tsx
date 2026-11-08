import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, PlusCircle, ShieldCheck } from 'lucide-react';
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
import { atualizarPapel, criarPapel, listarPapeis, obterPermissoesDoPapel } from '../servicos/papeis';
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

function FormPapel({ papelInicial, onSaveComplete }: { papelInicial?: any | null; onSaveComplete: () => void }) {
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
      escopo: papelInicial?.escopo ?? 'plataforma',
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
          descricao: dados.descricao || null,
          permissaoIds: dados.permissaoIds ?? [],
        });
      } else {
        await criarPapel({
          nome: dados.nome,
          escopo: dados.escopo,
          descricao: dados.descricao || null,
          permissaoIds: dados.permissaoIds ?? [],
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
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input placeholder="Ex: Suporte N2" disabled={isEditing} {...register('nome', { required: true, minLength: 2 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório (mín. 2 caracteres)</p>}
        {isEditing && <p className="text-xs text-muted-foreground">Nome não pode ser alterado depois de criado.</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Escopo *</Label>
        <Controller
          control={control}
          name="escopo"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
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
        {isEditing && <p className="text-xs text-muted-foreground">Escopo não pode ser alterado depois de criado.</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea placeholder="Pra que serve este papel (opcional)" rows={2} {...register('descricao')} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Permissões</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('permissaoIds', catalogoPermissoes.map((p) => p.id))}
            >
              Marcar todos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setValue('permissaoIds', [])}>
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
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
              {carregandoCatalogo ? (
                <p className="text-xs text-muted-foreground">Carregando catálogo...</p>
              ) : (
                Object.entries(permissoesPorRecurso).map(([recurso, permissoes]) => (
                  <div key={recurso} className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{recurso}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {permissoes.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
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
  const podeGerenciar = usuario?.papel === 'SUPER_ADMIN';

  const [papeis, setPapeis] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [papelParaEditar, setPapelParaEditar] = useState<any | null>(null);

  function carregar() {
    setCarregando(true);
    listarPapeis()
      .then(setPapeis)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, []);

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
        <h1 className="flex items-center text-2xl font-bold md:text-3xl">
          <ShieldCheck className="mr-2 h-6 w-6" /> Papéis e Permissões
        </h1>
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
                  {papeis.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ROTULO_ESCOPO[p.escopo] ?? p.escopo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.descricao ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={p.sistema ? 'secondary' : 'success'}>{p.sistema ? 'Sistema' : 'Customizado'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Editar descrição e permissões"
                          onClick={() => {
                            setPapelParaEditar(p);
                            setDialogAberto(true);
                          }}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto md:max-w-[85%]">
          <DialogHeader>
            <DialogTitle>{papelParaEditar ? `Editar papel -- ${papelParaEditar.nome}` : 'Novo papel'}</DialogTitle>
          </DialogHeader>
          <FormPapel
            papelInicial={papelParaEditar}
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
