import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Lock, ShieldCheck, Unlock, Users, PlusCircle } from 'lucide-react';
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
import { listarContadores } from '../servicos/contadores';
import { listarEmpresas } from '../servicos/empresas';
import {
  bloquearUsuario,
  concederPermissao,
  criarUsuario,
  desbloquearUsuario,
  listarPermissoesUsuario,
  listarUsuarios,
  revogarPermissao,
} from '../servicos/usuarios';
import { showError, showSuccess } from '../utils/toast';

// Mesmo catálogo do backend (src/auth/dominio/papel.ts)
const ROTULO_PAPEL: Record<string, string> = {
  SUPER_ADMIN: 'Administrador da plataforma',
  ADMIN_FINANCEIRO: 'Administrador financeiro',
  ADMIN_SUPORTE: 'Administrador de suporte',
  CONTADOR_DONO: 'Contador (dono do escritório)',
  OPERADOR_CONTADOR: 'Operador do escritório',
  EMPRESARIO_DONO: 'Empresário (dono da empresa)',
  OPERADOR_EMPRESA: 'Operador da empresa',
};

const TODOS_OS_PAPEIS: { valor: string; escopo: 'plataforma' | 'contador' | 'empresa' }[] = [
  { valor: 'SUPER_ADMIN', escopo: 'plataforma' },
  { valor: 'ADMIN_FINANCEIRO', escopo: 'plataforma' },
  { valor: 'ADMIN_SUPORTE', escopo: 'plataforma' },
  { valor: 'CONTADOR_DONO', escopo: 'contador' },
  { valor: 'OPERADOR_CONTADOR', escopo: 'contador' },
  { valor: 'EMPRESARIO_DONO', escopo: 'empresa' },
  { valor: 'OPERADOR_EMPRESA', escopo: 'empresa' },
];

// Papéis oferecidos na criação, por papel de quem cria -- espelha resolverVinculoPermitido()
// do AuthController (backend), mas só como conveniência de UI: o backend revalida tudo.
function opcoesPapelPara(papelCriador: string) {
  if (papelCriador === 'SUPER_ADMIN') return TODOS_OS_PAPEIS;
  if (papelCriador === 'CONTADOR_DONO') {
    return TODOS_OS_PAPEIS.filter((p) => ['OPERADOR_CONTADOR', 'EMPRESARIO_DONO', 'OPERADOR_EMPRESA'].includes(p.valor));
  }
  if (papelCriador === 'EMPRESARIO_DONO') {
    return TODOS_OS_PAPEIS.filter((p) => p.valor === 'OPERADOR_EMPRESA');
  }
  return [];
}

interface DadosNovoUsuario {
  nome: string;
  email: string;
  papel: string;
  empresaId?: string;
}

function FormNovoUsuario({
  papelCriador,
  empresas,
  onSaveComplete,
}: {
  papelCriador: string;
  empresas: any[];
  onSaveComplete: () => void;
}) {
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const opcoesPapel = opcoesPapelPara(papelCriador);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosNovoUsuario>({
    defaultValues: { nome: '', email: '', papel: opcoesPapel[0]?.valor ?? '' },
  });

  const papelSelecionado = watch('papel');
  const escopoSelecionado = TODOS_OS_PAPEIS.find((p) => p.valor === papelSelecionado)?.escopo;
  const precisaEmpresa = escopoSelecionado === 'empresa' && papelCriador !== 'EMPRESARIO_DONO';

  async function aoSubmeter(dados: DadosNovoUsuario) {
    setErroGeral(null);
    if (precisaEmpresa && !dados.empresaId) {
      setErroGeral('Selecione a empresa.');
      return;
    }
    try {
      await criarUsuario({
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        empresaId: precisaEmpresa ? dados.empresaId : undefined,
      });
      showSuccess('Usuário criado -- um convite foi enviado por email.');
      onSaveComplete();
    } catch (e: any) {
      setErroGeral(e.message ?? 'Não foi possível criar o usuário');
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input {...register('nome', { required: true, minLength: 2 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Email *</Label>
        <Input type="email" {...register('email', { required: true })} />
        {errors.email && <p className="text-xs text-destructive">Obrigatório</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Papel *</Label>
        <Controller
          control={control}
          name="papel"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {opcoesPapel.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {ROTULO_PAPEL[p.valor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {precisaEmpresa && (
        <div className="space-y-1.5">
          <Label>Empresa *</Label>
          <Controller
            control={control}
            name="empresaId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
            )}
          />
        </div>
      )}

      {erroGeral && <p className="text-sm text-destructive">{erroGeral}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar usuário
      </Button>
    </form>
  );
}

function DialogBloquear({ usuario, onClose, onBloqueado }: { usuario: any; onClose: () => void; onBloqueado: () => void }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    if (!motivo.trim()) {
      setErro('Informe o motivo do bloqueio.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await bloquearUsuario(usuario.id, motivo.trim());
      showSuccess(`${usuario.nome} foi bloqueado.`);
      onBloqueado();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível bloquear o usuário');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Motivo do bloqueio *</Label>
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: desligamento, suspeita de uso indevido" />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={confirmar} disabled={enviando}>
          {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Bloquear
        </Button>
      </div>
    </div>
  );
}

function DialogPermissoes({ usuario }: { usuario: any }) {
  const [dados, setDados] = useState<{ catalogoDisponivel: any[]; concedidas: any[] } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [alterando, setAlterando] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    listarPermissoesUsuario(usuario.id)
      .then(setDados)
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [usuario.id]);

  async function alternar(permissaoId: string, concedida: boolean) {
    setAlterando(permissaoId);
    try {
      if (concedida) {
        await revogarPermissao(usuario.id, permissaoId);
      } else {
        await concederPermissao(usuario.id, permissaoId);
      }
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setAlterando(null);
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!dados) return null;

  const porRecurso = dados.catalogoDisponivel.reduce<Record<string, any[]>>((acc, p) => {
    if (!acc[p.recurso]) acc[p.recurso] = [];
    acc[p.recurso].push(p);
    return acc;
  }, {});

  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto">
      {Object.keys(porRecurso).length === 0 && (
        <p className="text-sm text-muted-foreground">O papel deste usuário não tem permissões adicionais assinaláveis.</p>
      )}
      {Object.entries(porRecurso).map(([recurso, permissoes]) => (
        <div key={recurso} className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{recurso}</Label>
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            {permissoes.map((p) => {
              const concedida = dados.concedidas.some((c) => c.id === p.id);
              return (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  {alterando === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Checkbox checked={concedida} onCheckedChange={() => alternar(p.id, concedida)} />
                  )}
                  {p.acao}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GerenciarUsuarios() {
  const { usuario } = useSelector((state: any) => state.autenticacao);
  const papelAtual = usuario?.papel;
  const podeGerenciar = ['SUPER_ADMIN', 'CONTADOR_DONO', 'EMPRESARIO_DONO'].includes(papelAtual);

  const [contadores, setContadores] = useState<any[]>([]);
  const [contadorFiltro, setContadorFiltro] = useState<string>('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [usuarioParaBloquear, setUsuarioParaBloquear] = useState<any | null>(null);
  const [usuarioParaPermissoes, setUsuarioParaPermissoes] = useState<any | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    if (papelAtual === 'SUPER_ADMIN') {
      listarContadores()
        .then(setContadores)
        .catch((e) => showError(e.message));
    }
  }, [papelAtual]);

  const contadorId = papelAtual === 'SUPER_ADMIN' ? contadorFiltro : undefined;

  function carregar() {
    if (papelAtual === 'SUPER_ADMIN' && !contadorFiltro) {
      setUsuarios([]);
      setEmpresas([]);
      return;
    }
    setCarregando(true);
    Promise.all([
      listarUsuarios(contadorId ? { contadorId } : {}),
      papelAtual !== 'EMPRESARIO_DONO' ? listarEmpresas(contadorId) : Promise.resolve([]),
    ])
      .then(([listaUsuarios, listaEmpresas]) => {
        setUsuarios(listaUsuarios);
        setEmpresas(listaEmpresas);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [papelAtual, contadorFiltro]);

  async function alternarBloqueio(alvo: any) {
    if (!alvo.bloqueado) {
      setUsuarioParaBloquear(alvo);
      return;
    }
    setProcessando(alvo.id);
    try {
      await desbloquearUsuario(alvo.id);
      showSuccess(`${alvo.nome} foi desbloqueado.`);
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setProcessando(null);
    }
  }

  function vinculoDe(alvo: any): string {
    if (alvo.contadorId) return 'Próprio escritório';
    if (alvo.empresaId) {
      const empresa = empresas.find((e) => e.id === alvo.empresaId);
      return empresa ? empresa.razaoSocial : 'Empresa da carteira';
    }
    return 'Plataforma';
  }

  if (!papelAtual) return null;

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
          <Users className="mr-2 h-6 w-6" /> Gerenciar Usuários
        </h1>
        <Button
          onClick={() => setDialogNovoAberto(true)}
          disabled={papelAtual === 'SUPER_ADMIN' && !contadorFiltro}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {papelAtual === 'SUPER_ADMIN' && (
        <div className="mb-4 max-w-xs space-y-1.5">
          <Label>Contador</Label>
          <Select value={contadorFiltro} onValueChange={setContadorFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um contador pra ver a carteira" />
            </SelectTrigger>
            <SelectContent>
              {contadores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome ?? c.razaoSocial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {papelAtual === 'SUPER_ADMIN' && !contadorFiltro
                          ? 'Selecione um contador pra ver os usuários.'
                          : 'Nenhum usuário cadastrado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-sm">{ROTULO_PAPEL[u.papel] ?? u.papel}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{vinculoDe(u)}</TableCell>
                        <TableCell>
                          <Badge variant={u.bloqueado ? 'destructive' : 'success'}>{u.bloqueado ? 'Bloqueado' : 'Ativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setUsuarioParaPermissoes(u)} title="Permissões">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => alternarBloqueio(u)}
                              disabled={processando === u.id}
                              title={u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                            >
                              {processando === u.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : u.bloqueado ? (
                                <Unlock className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
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

      <Dialog open={dialogNovoAberto} onOpenChange={setDialogNovoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <FormNovoUsuario
            papelCriador={papelAtual}
            empresas={empresas}
            onSaveComplete={() => {
              setDialogNovoAberto(false);
              carregar();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!usuarioParaBloquear} onOpenChange={(aberto) => !aberto && setUsuarioParaBloquear(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquear usuário</DialogTitle>
          </DialogHeader>
          {usuarioParaBloquear && (
            <DialogBloquear
              usuario={usuarioParaBloquear}
              onClose={() => setUsuarioParaBloquear(null)}
              onBloqueado={() => {
                setUsuarioParaBloquear(null);
                carregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!usuarioParaPermissoes} onOpenChange={(aberto) => !aberto && setUsuarioParaPermissoes(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Permissões de {usuarioParaPermissoes?.nome}</DialogTitle>
          </DialogHeader>
          {usuarioParaPermissoes && <DialogPermissoes usuario={usuarioParaPermissoes} />}
        </DialogContent>
      </Dialog>
    </LayoutPrincipal>
  );
}
