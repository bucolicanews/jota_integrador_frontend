import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import { AlternadorVisualizacao } from '../../componentes/admin/AlternadorVisualizacao';
import {
  atualizarContador,
  atualizarModulosContador,
  bloquearContador,
  corrigirCnpjCpfContador,
  criarContador,
  deletarContador,
  desbloquearContador,
  listarContadores,
} from '../../servicos/contadores';
import { listarEmpresas } from '../../servicos/empresas';
import { atualizarPagbankConta } from '../../servicos/pagbankLicencas';
import { criarUsuario, gerarLinkAcesso, listarUsuarios } from '../../servicos/usuarios';
import CartaoLinkAcesso from '../../components/auth/CartaoLinkAcesso';
import { validarCpfOuCnpj } from '../../utils/validarCpfOuCnpj';

const ROTULO_TIPO = { humano: 'Escritório/Pessoa física', interno_jota: 'Interno JOTA' };

// Mesmas 9 seções do MenuLateral (SECOES_MENU) -- só as 7 chaves que de fato são
// gateadas por módulo aparecem com badge; as demais seções não têm nenhum item com
// `modulo:` (são núcleo ou gateadas só por papel), por isso ficam "sempre disponível".
const GRUPOS_MODULO = [
  { titulo: 'Geral', chaves: ['tarefas'] },
  { titulo: 'Escritório', chaves: [] },
  { titulo: 'Contabilidade', chaves: ['conciliacao_bancaria', 'bancos'] },
  { titulo: 'Fiscal', chaves: ['fiscal'] },
  { titulo: 'Cadastros', chaves: [] },
  { titulo: 'Atendimento', chaves: ['protocolos'] },
  { titulo: 'Contratos & Societário', chaves: ['contratos', 'documentos_societarios'] },
  { titulo: 'Relatórios', chaves: ['relatorios'] },
  { titulo: 'Administração', chaves: [] },
];

const ROTULO_MODULO = {
  tarefas: 'Tarefas (quadro Kanban)',
  conciliacao_bancaria: 'Conciliação Bancária',
  bancos: 'Bancos',
  fiscal: 'Fiscal (DAS/Caixa Postal)',
  protocolos: 'Protocolos',
  contratos: 'Contratos',
  documentos_societarios: 'Documentos Societários',
  relatorios: 'Relatórios',
};

const formatarCnpjCpf = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  if (digitos.length === 11) return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor ?? '';
};

function BadgeStatus({ bloqueado }) {
  return bloqueado ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      🔴 Bloqueado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      🟢 Ativo
    </span>
  );
}

/** Modal de criação/edição -- cnpjCpf só é editável na criação (backend não aceita alterar depois). */
function ModalContador({ contador, aoFechar, aoSalvar }) {
  const editando = Boolean(contador);
  const [corrigindoDoc, setCorrigindoDoc] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues: {
      nome: contador?.nome ?? '',
      cnpjCpf: contador?.cnpjCpf ?? '',
      email: contador?.email ?? '',
      telefone: contador?.telefone ?? '',
      pagbankAccountId: contador?.pagbankAccountId ?? '',
    },
  });

  function aoClicarCorrigirDoc() {
    const confirmado = window.confirm(
      'Corrigir o CPF/CNPJ muda a identidade legal deste contador. Só faça isso se foi cadastrado errado. Continuar?',
    );
    if (confirmado) setCorrigindoDoc(true);
  }

  async function aoSubmeter(dados) {
    try {
      if (editando) {
        if (corrigindoDoc && dados.cnpjCpf.replace(/\D/g, '') !== contador.cnpjCpf) {
          await corrigirCnpjCpfContador(contador.id, dados.cnpjCpf);
        }
        await atualizarContador(contador.id, {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone || null,
        });
        const novaContaPagbank = dados.pagbankAccountId.trim();
        if (novaContaPagbank && novaContaPagbank !== (contador.pagbankAccountId ?? '')) {
          await atualizarPagbankConta(contador.id, novaContaPagbank);
        }
      } else {
        await criarContador({
          nome: dados.nome,
          cnpjCpf: dados.cnpjCpf,
          email: dados.email,
          telefone: dados.telefone || null,
        });
      }
      aoSalvar();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível salvar' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {editando ? 'Editar contador' : 'Novo contador'}
        </h2>
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome / Nome do escritório *</label>
            <input
              {...register('nome', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="mb-1 block text-sm font-medium text-gray-700">CPF ou CNPJ *</label>
              {editando && !corrigindoDoc && (
                <button type="button" onClick={aoClicarCorrigirDoc} className="text-xs font-medium text-blue-700 hover:underline">
                  Corrigir CPF/CNPJ
                </button>
              )}
            </div>
            {editando && !corrigindoDoc ? (
              <input
                value={formatarCnpjCpf(contador.cnpjCpf)}
                disabled
                className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500"
              />
            ) : (
              <input
                {...register('cnpjCpf', { required: 'Obrigatório', validate: (v) => validarCpfOuCnpj(v) || 'CPF/CNPJ inválido' })}
                placeholder="Só números ou com máscara"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            )}
            {editando && !corrigindoDoc && <p className="mt-1 text-xs text-gray-400">CPF/CNPJ não pode ser alterado depois de criado.</p>}
            {editando && !corrigindoDoc && !validarCpfOuCnpj(contador.cnpjCpf) && (
              <p className="mt-1 text-xs font-medium text-red-600">⚠️ Este documento não passa na validação de formato -- considere corrigir.</p>
            )}
            {corrigindoDoc && <p className="mt-1 text-xs text-amber-600">Confira bem antes de salvar -- essa correção é registrada em auditoria.</p>}
            {errors.cnpjCpf && <p className="mt-1 text-xs text-red-600">{errors.cnpjCpf.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail *</label>
            <input
              type="email"
              {...register('email', { required: 'Obrigatório' })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
            <input
              {...register('telefone')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Conta PagBank</label>
            <input
              {...register('pagbankAccountId')}
              placeholder="Account id obtido no painel da PagBank"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Precisa estar cadastrada pra esse contador poder cobrar/receber split.</p>
          </div>

          {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Motivo é obrigatório no backend (BloquearContadorDto) -- por isso modal com textarea em vez de window.prompt. */
function ModalBloqueio({ contador, aoFechar, aoConfirmar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { motivo: '' },
  });

  async function aoSubmeter(dados) {
    try {
      await bloquearContador(contador.id, dados.motivo);
      aoConfirmar();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível bloquear' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Bloquear {contador.nome}</h2>
        <p className="mb-4 text-sm text-gray-600">
          O contador e as empresas da carteira ficam sem acesso até serem desbloqueados.
        </p>
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo do bloqueio *</label>
            <textarea
              {...register('motivo', { required: 'Obrigatório', minLength: { value: 3, message: 'Muito curto' } })}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.motivo && <p className="mt-1 text-xs text-red-600">{errors.motivo.message}</p>}
          </div>

          {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Bloqueando...' : 'Bloquear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ListaEmpresasDoContador({ empresas }) {
  if (empresas === 'carregando') return <p className="px-4 py-3 text-xs text-gray-500">Carregando empresas...</p>;
  if (empresas === 'erro') return <p className="px-4 py-3 text-xs text-red-600">Não foi possível carregar as empresas.</p>;
  if (empresas.length === 0) return <p className="px-4 py-3 text-xs text-gray-500">Nenhuma empresa nesta carteira ainda.</p>;

  return (
    <table className="w-full text-left text-xs">
      <thead className="text-gray-500">
        <tr>
          <th className="px-4 py-1.5 font-medium">Razão social</th>
          <th className="px-4 py-1.5 font-medium">CNPJ</th>
          <th className="px-4 py-1.5 font-medium">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {empresas.map((empresa) => (
          <tr key={empresa.id}>
            <td className="px-4 py-1.5 text-gray-800">{empresa.razaoSocial}</td>
            <td className="px-4 py-1.5 text-gray-600">{formatarCnpjCpf(empresa.cnpj)}</td>
            <td className="px-4 py-1.5">
              <BadgeStatus bloqueado={empresa.bloqueado} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Admin edita quais módulos o ESCRITÓRIO do contador (não a carteira de clientes) pode usar -- cada empresa-cliente continua 100% pelo próprio plano da assinatura. */
function ModalModulosContador({ contador, aoFechar, aoSalvar }) {
  const [selecionados, setSelecionados] = useState(new Set(contador.modulosLiberados ?? []));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  function alternar(chave) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  async function aoConfirmar() {
    setSalvando(true);
    setErro(null);
    try {
      await atualizarModulosContador(contador.id, Array.from(selecionados));
      aoSalvar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message ?? 'Não foi possível salvar os módulos');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Módulos de {contador.nome}</h2>
        <p className="mb-4 text-xs text-gray-500">
          Controla o que o escritório PRÓPRIO deste contador pode usar. Não afeta as empresas-cliente da carteira dele --
          essas continuam liberadas pelo plano da assinatura de cada uma.
        </p>

        <div className="space-y-3">
          {GRUPOS_MODULO.filter((grupo) => grupo.chaves.length > 0).map((grupo) => (
            <div key={grupo.titulo}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{grupo.titulo}</p>
              <div className="space-y-1.5">
                {grupo.chaves.map((chave) => (
                  <label key={chave} className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={selecionados.has(chave)} onChange={() => alternar(chave)} />
                    {ROTULO_MODULO[chave]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={aoFechar}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={salvando}
            className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Login/acesso do contador -- sem campo de senha (nunca existe no sistema, login é 100% por link/convite). Se já existe usuário dono, só reemite o link; senão cria o usuário CONTADOR_DONO primeiro. */
function ModalLoginContador({ contador, aoFechar }) {
  const [carregando, setCarregando] = useState(true);
  const [usuarioDono, setUsuarioDono] = useState(null);
  const [email, setEmail] = useState(contador.email ?? '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [link, setLink] = useState(null);

  useEffect(() => {
    listarUsuarios({ contadorId: contador.id })
      .then((lista) => setUsuarioDono(lista.find((u) => u.papel === 'CONTADOR_DONO') ?? null))
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
  }, [contador.id]);

  async function aoCriarLogin() {
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await criarUsuario({
        nome: contador.nome,
        email,
        papel: 'CONTADOR_DONO',
        contadorId: contador.id,
      });
      setUsuarioDono(resultado);
      setLink(resultado.linkAcesso);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message ?? 'Não foi possível criar o login');
    } finally {
      setEnviando(false);
    }
  }

  async function aoReenviarLink() {
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await gerarLinkAcesso(usuarioDono.id);
      setLink(resultado.linkAcesso);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message ?? 'Não foi possível gerar o link');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Login de {contador.nome}</h2>

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : usuarioDono ? (
          <>
            <p className="mb-4 text-sm text-gray-600">
              Login já existe, e-mail <span className="font-medium text-gray-900">{usuarioDono.email}</span>. Não há senha
              cadastrada no sistema -- acesso é sempre por link de convite.
            </p>
            <button
              type="button"
              onClick={aoReenviarLink}
              disabled={enviando}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {enviando ? 'Gerando...' : 'Reenviar link / redefinir acesso'}
            </button>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600">Esse contador ainda não tem login. Informe o e-mail pra criar.</p>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={aoCriarLogin}
              disabled={enviando || !email}
              className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {enviando ? 'Criando...' : 'Criar login e gerar link'}
            </button>
          </>
        )}

        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
        {link && (
          <div className="mt-4">
            <CartaoLinkAcesso link={link} titulo="Link de acesso" />
          </div>
        )}

        <button
          type="button"
          onClick={aoFechar}
          className="mt-4 w-full rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export default function ContabilAdminContadores() {
  const navegar = useNavigate();
  const { usuario } = useSelector((state) => state.autenticacao);
  const ehSuperAdmin = usuario?.papel === 'SUPER_ADMIN';

  const [contadores, setContadores] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [visualizacao, setVisualizacao] = useState('lista');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroDoc, setFiltroDoc] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [expandidos, setExpandidos] = useState(new Set());
  const [empresasPorContador, setEmpresasPorContador] = useState({});
  const [modalContador, setModalContador] = useState(null); // null | { contador?: Contador } (contador ausente = criar)
  const [modalBloqueio, setModalBloqueio] = useState(null); // Contador | null
  const [modalModulos, setModalModulos] = useState(null); // Contador | null
  const [modalLogin, setModalLogin] = useState(null); // Contador | null
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarContadores();
      setContadores(dados);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarExpansao(contador) {
    const novoSet = new Set(expandidos);
    if (novoSet.has(contador.id)) {
      novoSet.delete(contador.id);
      setExpandidos(novoSet);
      return;
    }
    novoSet.add(contador.id);
    setExpandidos(novoSet);

    if (empresasPorContador[contador.id]) return; // já carregado -- não refaz a chamada
    setEmpresasPorContador((atual) => ({ ...atual, [contador.id]: 'carregando' }));
    try {
      const empresas = await listarEmpresas(contador.id);
      setEmpresasPorContador((atual) => ({ ...atual, [contador.id]: empresas }));
    } catch {
      setEmpresasPorContador((atual) => ({ ...atual, [contador.id]: 'erro' }));
    }
  }

  async function aoDesbloquear(contador) {
    if (!window.confirm(`Desbloquear ${contador.nome}?`)) return;
    setAcaoEmAndamento(contador.id);
    try {
      await desbloquearContador(contador.id);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  /** Exclusão definitiva -- só funciona se o backend confirmar que não tem nenhum rastro de uso real (carteira vazia, sem login, sem crédito/consulta); senão devolve 409 com o que resolver primeiro. */
  async function aoExcluir(contador) {
    if (!window.confirm(`Excluir "${contador.nome}" definitivamente? Isso só funciona se ele nunca teve uso real (sem empresas, login ou créditos) -- não dá pra desfazer.`)) return;
    setAcaoEmAndamento(contador.id);
    try {
      await deletarContador(contador.id);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  const contadoresFiltrados = useMemo(() => {
    if (!contadores) return [];
    const nomeBusca = filtroNome.trim().toLowerCase();
    const docBusca = filtroDoc.replace(/\D/g, '');
    return contadores.filter((contador) => {
      if (nomeBusca && !contador.nome.toLowerCase().includes(nomeBusca)) return false;
      if (docBusca && !contador.cnpjCpf.replace(/\D/g, '').includes(docBusca)) return false;
      if (filtroStatus === 'ativos' && contador.bloqueado) return false;
      if (filtroStatus === 'bloqueados' && !contador.bloqueado) return false;
      return true;
    });
  }, [contadores, filtroNome, filtroDoc, filtroStatus]);

  function Acoes({ contador }) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setModalContador({ contador })}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Editar
        </button>
        <button
          onClick={() => setModalLogin(contador)}
          title="Criar login (se não existir) e enviar/reenviar link de acesso -- não há senha cadastrada no sistema"
          className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
        >
          Login
        </button>
        <button
          onClick={() =>
            navegar(`/contabil/creditos?contadorId=${contador.id}`, { state: { nomeContador: contador.nome } })
          }
          title="Ver saldo e extrato de créditos deste contador (inclui a própria Jota)"
          className="rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
        >
          Créditos
        </button>
        <button
          onClick={() => setModalModulos(contador)}
          title="Módulos liberados pro escritório próprio deste contador (não afeta a carteira de clientes dele)"
          className="rounded-md border border-purple-300 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-50"
        >
          Módulos
        </button>
        {ehSuperAdmin &&
          (contador.bloqueado ? (
            <button
              onClick={() => aoDesbloquear(contador)}
              disabled={acaoEmAndamento === contador.id}
              className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Desbloquear
            </button>
          ) : (
            <button
              onClick={() => setModalBloqueio(contador)}
              className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Bloquear
            </button>
          ))}
        {ehSuperAdmin && contador.tipo === 'humano' && (
          <button
            onClick={() => aoExcluir(contador)}
            disabled={acaoEmAndamento === contador.id}
            title="Só funciona se este contador nunca teve uso real (sem empresas, login ou créditos)"
            className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Excluir
          </button>
        )}
      </div>
    );
  }

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Contadores</h1>
          {ehSuperAdmin && (
            <button
              onClick={() => setModalContador({})}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Novo contador
            </button>
          )}
        </div>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nome / nome do escritório</label>
            <input
              value={filtroNome}
              onChange={(evento) => setFiltroNome(evento.target.value)}
              placeholder="Buscar por nome..."
              className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">CPF / CNPJ</label>
            <input
              value={filtroDoc}
              onChange={(evento) => setFiltroDoc(evento.target.value)}
              placeholder="Buscar por documento..."
              className="w-48 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
            <select
              value={filtroStatus}
              onChange={(evento) => setFiltroStatus(evento.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="bloqueados">Bloqueados</option>
            </select>
          </div>
          <div className="ml-auto">
            <AlternadorVisualizacao visualizacao={visualizacao} aoAlternar={setVisualizacao} />
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : contadoresFiltrados.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
            {contadores.length === 0 ? 'Nenhum contador cadastrado ainda.' : 'Nenhum contador encontrado com esses filtros.'}
          </p>
        ) : visualizacao === 'lista' ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="w-8"></th>
                  <th className="px-4 py-3">Nome / Escritório</th>
                  <th className="px-4 py-3">CPF/CNPJ</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contadoresFiltrados.map((contador) => (
                  <Fragment key={contador.id}>
                    <tr>
                      <td className="px-2">
                        <button
                          onClick={() => alternarExpansao(contador)}
                          className="text-gray-400 hover:text-gray-700"
                          title="Ver empresas da carteira"
                        >
                          {expandidos.has(contador.id) ? '▾' : '▸'}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{contador.nome}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatarCnpjCpf(contador.cnpjCpf)}
                        {!validarCpfOuCnpj(contador.cnpjCpf) && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            ⚠️ inválido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{contador.email}</td>
                      <td className="px-4 py-3 text-gray-600">{contador.telefone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{ROTULO_TIPO[contador.tipo] ?? contador.tipo}</td>
                      <td className="px-4 py-3">
                        <BadgeStatus bloqueado={contador.bloqueado} />
                      </td>
                      <td className="px-4 py-3">
                        <Acoes contador={contador} />
                      </td>
                    </tr>
                    {expandidos.has(contador.id) && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 p-0">
                          <ListaEmpresasDoContador empresas={empresasPorContador[contador.id] ?? 'carregando'} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contadoresFiltrados.map((contador) => (
              <div key={contador.id} className="rounded-lg bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold text-gray-900">{contador.nome}</p>
                  <BadgeStatus bloqueado={contador.bloqueado} />
                </div>
                <p className="text-sm text-gray-600">
                  {formatarCnpjCpf(contador.cnpjCpf)}
                  {!validarCpfOuCnpj(contador.cnpjCpf) && <span className="ml-1.5 text-xs font-medium text-red-700">⚠️ inválido</span>}
                </p>
                <p className="text-sm text-gray-600">{contador.email}</p>
                <p className="text-sm text-gray-600">{contador.telefone || '—'}</p>
                <p className="mb-3 text-xs text-gray-400">{ROTULO_TIPO[contador.tipo] ?? contador.tipo}</p>

                <button
                  onClick={() => alternarExpansao(contador)}
                  className="mb-2 text-xs font-medium text-blue-600 hover:underline"
                >
                  {expandidos.has(contador.id) ? '▾ Ocultar empresas' : '▸ Ver empresas da carteira'}
                </button>
                {expandidos.has(contador.id) && (
                  <div className="mb-3 rounded-md border border-gray-100">
                    <ListaEmpresasDoContador empresas={empresasPorContador[contador.id] ?? 'carregando'} />
                  </div>
                )}

                <div className="border-t border-gray-100 pt-3">
                  <Acoes contador={contador} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalContador && (
        <ModalContador
          contador={modalContador.contador}
          aoFechar={() => setModalContador(null)}
          aoSalvar={() => {
            setModalContador(null);
            carregar();
          }}
        />
      )}

      {modalBloqueio && (
        <ModalBloqueio
          contador={modalBloqueio}
          aoFechar={() => setModalBloqueio(null)}
          aoConfirmar={() => {
            setModalBloqueio(null);
            carregar();
          }}
        />
      )}

      {modalModulos && (
        <ModalModulosContador
          contador={modalModulos}
          aoFechar={() => setModalModulos(null)}
          aoSalvar={() => {
            setModalModulos(null);
            carregar();
          }}
        />
      )}

      {modalLogin && <ModalLoginContador contador={modalLogin} aoFechar={() => setModalLogin(null)} />}
    </LayoutPrincipal>
  );
}
