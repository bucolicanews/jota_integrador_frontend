import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { Edit, Link2, Loader2, Lock, Mail, ShieldCheck, Unlock, Users, PlusCircle } from 'lucide-react';
import LayoutPrincipal from '../components/layout/LayoutPrincipal';
import CartaoLinkAcesso from '../components/auth/CartaoLinkAcesso';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmpresaAtiva } from '../hooks/useEmpresaAtiva';
import { listarContadores } from '../servicos/contadores';
import { listarEmpresas } from '../servicos/empresas';
import { listarPapeis } from '../servicos/papeis';
import {
  atualizarEmailUsuario,
  atualizarNomeUsuario,
  atualizarPapelUsuario,
  bloquearUsuario,
  concederPermissao,
  criarUsuario,
  desbloquearUsuario,
  gerarLinkAcesso,
  listarPermissoesUsuario,
  listarUsuarios,
  revogarPermissao,
} from '../servicos/usuarios';
import { showError, showSuccess } from '../utils/toast';

// Rótulo amigável só pros 7 papéis de sistema -- papel customizado (criado em
// /admin/papeis) exibe a própria `descricao` cadastrada, ou o nome crú se não tiver.
const ROTULO_PAPEL: Record<string, string> = {
  SUPER_ADMIN: 'Administrador da plataforma',
  ADMIN_FINANCEIRO: 'Administrador financeiro',
  ADMIN_SUPORTE: 'Administrador de suporte',
  CONTADOR_DONO: 'Contador (dono do escritório)',
  OPERADOR_CONTADOR: 'Operador do escritório',
  EMPRESARIO_DONO: 'Empresário (dono da empresa)',
  OPERADOR_EMPRESA: 'Operador da empresa',
};

function rotuloDe(papel: any): string {
  return ROTULO_PAPEL[papel.nome] ?? papel.descricao ?? papel.nome;
}

// Sentinela pro Select do filtro -- nunca colide com um id real de contador (uuid).
const FILTRO_PLATAFORMA = '__plataforma__';

// Papéis oferecidos na criação, por papel de quem cria -- espelha resolverVinculoPermitido()
// do AuthController (backend): filtra por ESCOPO (não por nome), então papel customizado
// novo aparece automaticamente pra quem tem autoridade sobre aquele escopo. Só conveniência
// de UI, o backend revalida tudo de novo.
function opcoesPapelPara(papelCriador: string, todosOsPapeis: any[]) {
  if (papelCriador === 'SUPER_ADMIN') {
    // Escopo 'contador' fica fora -- exige escolher QUAL contador, campo que não existe
    // neste form (CONTADOR_DONO já tem fluxo próprio e mais completo em "Contadores";
    // OPERADOR_CONTADOR é sempre criado pelo próprio contador).
    return todosOsPapeis.filter((p) => p.escopo !== 'contador');
  }
  if (papelCriador === 'CONTADOR_DONO') {
    // Nunca o próprio papel de dono (contador não cria outro dono do próprio escritório).
    return todosOsPapeis.filter((p) => (p.escopo === 'contador' || p.escopo === 'empresa') && p.nome !== 'CONTADOR_DONO');
  }
  if (papelCriador === 'EMPRESARIO_DONO') {
    return todosOsPapeis.filter((p) => p.escopo === 'empresa' && p.nome !== 'EMPRESARIO_DONO');
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
  todosOsPapeis,
  empresas,
  onSaveComplete,
}: {
  papelCriador: string;
  todosOsPapeis: any[];
  empresas: any[];
  onSaveComplete: () => void;
}) {
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [confirmouPlataforma, setConfirmouPlataforma] = useState(false);
  const opcoesPapel = opcoesPapelPara(papelCriador, todosOsPapeis);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DadosNovoUsuario>({
    defaultValues: { nome: '', email: '', papel: opcoesPapel[0]?.nome ?? '' },
  });

  const papelSelecionado = watch('papel');
  const escopoSelecionado = todosOsPapeis.find((p) => p.nome === papelSelecionado)?.escopo;
  const precisaEmpresa = escopoSelecionado === 'empresa' && papelCriador !== 'EMPRESARIO_DONO';
  const ehPlataforma = escopoSelecionado === 'plataforma';

  useEffect(() => {
    if (!ehPlataforma) setConfirmouPlataforma(false);
  }, [ehPlataforma]);

  async function aoSubmeter(dados: DadosNovoUsuario) {
    setErroGeral(null);
    if (precisaEmpresa && !dados.empresaId) {
      setErroGeral('Selecione a empresa.');
      return;
    }
    if (ehPlataforma && !confirmouPlataforma) {
      setErroGeral('Confirme que entendeu o aviso acima antes de criar um usuário de plataforma.');
      return;
    }
    try {
      const resultado = await criarUsuario({
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        empresaId: precisaEmpresa ? dados.empresaId : undefined,
      });
      setLinkGerado(resultado.linkAcesso);
    } catch (e: any) {
      setErroGeral(e.message ?? 'Não foi possível criar o usuário');
    }
  }

  if (linkGerado) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Usuário criado.</p>
        <CartaoLinkAcesso link={linkGerado} />
        <Button className="w-full" onClick={onSaveComplete}>
          Concluir
        </Button>
      </div>
    );
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
                  <SelectItem key={p.nome} value={p.nome}>
                    {rotuloDe(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {ehPlataforma && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            ⚠️ Papel de <strong>plataforma</strong> -- nunca tem vínculo com um contador ou empresa, e tem acesso total ao
            sistema inteiro (passa por cima de qualquer restrição de carteira). Se a intenção é um funcionário com acesso
            só a um escritório ou empresa específica, use "Operador do escritório"/"Operador da empresa" + marque as
            permissões de módulo depois de criar -- não este papel.
          </p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={confirmouPlataforma} onCheckedChange={(v) => setConfirmouPlataforma(Boolean(v))} />
            Entendi, quero mesmo criar um usuário de plataforma.
          </label>
        </div>
      )}

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

      <Button type="submit" className="w-full" disabled={isSubmitting || (ehPlataforma && !confirmouPlataforma)}>
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

function DialogEditarEmail({ usuario, onClose, onAtualizado }: { usuario: any; onClose: () => void; onAtualizado: () => void }) {
  const [novoEmail, setNovoEmail] = useState(usuario.email);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await atualizarEmailUsuario(usuario.id, novoEmail.trim());
      showSuccess('E-mail de login atualizado.');
      onAtualizado();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível atualizar o e-mail');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Novo e-mail de login *</Label>
        <Input type="email" value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">
        Vale pro próximo login -- sessões já ativas continuam funcionando até expirar.
      </p>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={enviando || !novoEmail.trim()}>
          {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

interface DadosEditarUsuario {
  nome: string;
  papel: string;
}

/**
 * Nome sempre editável pela mesma autoridade de bloquear/e-mail. Papel só mostra as
 * opções que o ATOR pode atribuir (opcoesPapelPara, igual criação) + o papel ATUAL do
 * usuário (senão o Select abre vazio quando o papel dele não está no catálogo de quem tá
 * editando). Vínculo nunca muda por aqui -- backend rejeita trocar contadorId/empresaId
 * e nunca deixa CONTADOR_DONO/EMPRESARIO_DONO promoverem alguém a dono.
 */
function DialogEditarUsuario({
  usuario,
  papelAtor,
  todosOsPapeis,
  onClose,
  onAtualizado,
}: {
  usuario: any;
  papelAtor: string;
  todosOsPapeis: any[];
  onClose: () => void;
  onAtualizado: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DadosEditarUsuario>({ defaultValues: { nome: usuario.nome, papel: usuario.papel } });

  const opcoesPapel = opcoesPapelPara(papelAtor, todosOsPapeis);
  const opcoesComAtual = opcoesPapel.some((p) => p.nome === usuario.papel)
    ? opcoesPapel
    : [...opcoesPapel, { nome: usuario.papel, descricao: ROTULO_PAPEL[usuario.papel] ?? usuario.papel }];

  async function aoSubmeter(dados: DadosEditarUsuario) {
    setEnviando(true);
    setErro(null);
    try {
      if (dados.nome.trim() !== usuario.nome) {
        await atualizarNomeUsuario(usuario.id, dados.nome.trim());
      }
      if (dados.papel !== usuario.papel) {
        await atualizarPapelUsuario(usuario.id, dados.papel, usuario.contadorId, usuario.empresaId);
      }
      showSuccess('Usuário atualizado.');
      onAtualizado();
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível atualizar o usuário');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input {...register('nome', { required: true, minLength: 2 })} />
        {errors.nome && <p className="text-xs text-destructive">Obrigatório (mín. 2 caracteres)</p>}
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
                {opcoesComAtual.map((p) => (
                  <SelectItem key={p.nome} value={p.nome}>
                    {rotuloDe(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {papelAtor !== 'SUPER_ADMIN' && (
          <p className="text-xs text-muted-foreground">Só papéis do próprio vínculo -- nunca dono nem plataforma.</p>
        )}
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function DialogPermissoes({ usuario }: { usuario: any }) {
  const [dados, setDados] = useState<{ catalogoDisponivel: any[]; concedidas: any[] } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [alterando, setAlterando] = useState<string | null>(null);
  const [aplicandoTodos, setAplicandoTodos] = useState(false);

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

  async function alternarTodos(conceder: boolean) {
    if (!dados) return;
    setAplicandoTodos(true);
    try {
      const concedidasIds = new Set(dados.concedidas.map((c: any) => c.id));
      const alvo = dados.catalogoDisponivel.filter((p: any) => (conceder ? !concedidasIds.has(p.id) : concedidasIds.has(p.id)));
      await Promise.all(alvo.map((p: any) => (conceder ? concederPermissao(usuario.id, p.id) : revogarPermissao(usuario.id, p.id))));
      carregar();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setAplicandoTodos(false);
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
      {Object.keys(porRecurso).length === 0 ? (
        <p className="text-sm text-muted-foreground">O papel deste usuário não tem permissões adicionais assinaláveis.</p>
      ) : (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => alternarTodos(true)} disabled={aplicandoTodos}>
            {aplicandoTodos && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Marcar todos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => alternarTodos(false)} disabled={aplicandoTodos}>
            Desmarcar todos
          </Button>
        </div>
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
  const { empresaAtiva, carteira } = useEmpresaAtiva();

  // CONTADOR_DONO com uma empresa-CLIENTE selecionada no Header (não a própria
  // contabilidade) vê só a equipe DAQUELA empresa; sem seleção ou com a própria
  // selecionada, vê só o próprio escritório (nunca mais o combinado de antes).
  const propria = (carteira as any[]).find((e: any) => e.ehPropria);
  const agindoComoEmpresa =
    papelAtual === 'CONTADOR_DONO' && empresaAtiva && empresaAtiva.id !== propria?.id ? empresaAtiva : null;

  const [contadores, setContadores] = useState<any[]>([]);
  const [contadorFiltro, setContadorFiltro] = useState<string>('');
  const [todosOsPapeis, setTodosOsPapeis] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [dialogNovoAberto, setDialogNovoAberto] = useState(false);
  const [usuarioParaBloquear, setUsuarioParaBloquear] = useState<any | null>(null);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<any | null>(null);
  const [usuarioParaEditarEmail, setUsuarioParaEditarEmail] = useState<any | null>(null);
  const [usuarioParaPermissoes, setUsuarioParaPermissoes] = useState<any | null>(null);
  const [linkAcessoGerado, setLinkAcessoGerado] = useState<{ nome: string; link: string } | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => {
    if (papelAtual === 'SUPER_ADMIN') {
      listarContadores()
        .then(setContadores)
        .catch((e) => showError(e.message));
    }
  }, [papelAtual]);

  useEffect(() => {
    listarPapeis()
      .then(setTodosOsPapeis)
      .catch((e) => showError(e.message));
  }, []);

  const ehFiltroPlataforma = contadorFiltro === FILTRO_PLATAFORMA;
  const contadorId = papelAtual === 'SUPER_ADMIN' && !ehFiltroPlataforma ? contadorFiltro : undefined;

  function carregar() {
    if (papelAtual === 'SUPER_ADMIN' && !contadorFiltro) {
      setUsuarios([]);
      setEmpresas([]);
      return;
    }
    setCarregando(true);
    const filtroUsuarios = ehFiltroPlataforma
      ? { plataforma: true }
      : contadorId
        ? { contadorId }
        : papelAtual === 'CONTADOR_DONO'
          ? agindoComoEmpresa
            ? { empresaId: agindoComoEmpresa.id }
            : { somenteProprio: true }
          : {};
    Promise.all([
      listarUsuarios(filtroUsuarios),
      !ehFiltroPlataforma && papelAtual !== 'EMPRESARIO_DONO' ? listarEmpresas(contadorId) : Promise.resolve([]),
    ])
      .then(([listaUsuarios, listaEmpresas]) => {
        setUsuarios(listaUsuarios);
        setEmpresas(listaEmpresas);
      })
      .catch((e) => showError(e.message))
      .finally(() => setCarregando(false));
  }
  useEffect(carregar, [papelAtual, contadorFiltro, contadorId, ehFiltroPlataforma, agindoComoEmpresa?.id]);

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

  async function reenviarLinkAcesso(alvo: any) {
    setProcessando(alvo.id);
    try {
      const resultado = await gerarLinkAcesso(alvo.id);
      setLinkAcessoGerado({ nome: alvo.nome, link: resultado.linkAcesso });
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
        <div>
          <h1 className="flex items-center text-2xl font-bold md:text-3xl">
            <Users className="mr-2 h-6 w-6" /> Gerenciar Usuários
          </h1>
          {agindoComoEmpresa && (
            <p className="text-sm text-muted-foreground">Equipe de {agindoComoEmpresa.razaoSocial}</p>
          )}
        </div>
        <Button onClick={() => setDialogNovoAberto(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {papelAtual === 'SUPER_ADMIN' && (
        <div className="mb-4 max-w-xs space-y-1.5">
          <Label>Contador ou plataforma</Label>
          <Select value={contadorFiltro} onValueChange={setContadorFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um contador ou Plataforma pra ver usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_PLATAFORMA}>Plataforma</SelectItem>
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
                          ? 'Selecione um contador ou Plataforma pra ver os usuários.'
                          : 'Nenhum usuário cadastrado.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-sm">
                          {ROTULO_PAPEL[u.papel] ?? todosOsPapeis.find((p) => p.nome === u.papel)?.descricao ?? u.papel}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{vinculoDe(u)}</TableCell>
                        <TableCell>
                          <Badge variant={u.bloqueado ? 'destructive' : 'success'}>{u.bloqueado ? 'Bloqueado' : 'Ativo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setUsuarioParaEditar(u)} title="Editar nome e papel">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setUsuarioParaPermissoes(u)} title="Permissões">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setUsuarioParaEditarEmail(u)} title="Editar e-mail de login">
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => reenviarLinkAcesso(u)}
                              disabled={processando === u.id}
                              title="Gerar link de acesso"
                            >
                              {processando === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
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
          {todosOsPapeis.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <FormNovoUsuario
              papelCriador={papelAtual}
              todosOsPapeis={todosOsPapeis}
              empresas={empresas}
              onSaveComplete={() => {
                setDialogNovoAberto(false);
                carregar();
              }}
            />
          )}
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

      <Dialog open={!!usuarioParaEditar} onOpenChange={(aberto) => !aberto && setUsuarioParaEditar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário -- {usuarioParaEditar?.nome}</DialogTitle>
          </DialogHeader>
          {usuarioParaEditar && (
            <DialogEditarUsuario
              usuario={usuarioParaEditar}
              papelAtor={papelAtual}
              todosOsPapeis={todosOsPapeis}
              onClose={() => setUsuarioParaEditar(null)}
              onAtualizado={() => {
                setUsuarioParaEditar(null);
                carregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!usuarioParaEditarEmail} onOpenChange={(aberto) => !aberto && setUsuarioParaEditarEmail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar e-mail de login</DialogTitle>
          </DialogHeader>
          {usuarioParaEditarEmail && (
            <DialogEditarEmail
              usuario={usuarioParaEditarEmail}
              onClose={() => setUsuarioParaEditarEmail(null)}
              onAtualizado={() => {
                setUsuarioParaEditarEmail(null);
                carregar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkAcessoGerado} onOpenChange={(aberto) => !aberto && setLinkAcessoGerado(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link de acesso -- {linkAcessoGerado?.nome}</DialogTitle>
          </DialogHeader>
          {linkAcessoGerado && <CartaoLinkAcesso link={linkAcessoGerado.link} />}
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
