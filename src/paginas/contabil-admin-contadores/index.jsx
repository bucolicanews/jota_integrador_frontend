import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { AlternadorVisualizacao } from '../../componentes/admin/AlternadorVisualizacao';
import {
  atualizarContador,
  bloquearContador,
  criarContador,
  desbloquearContador,
  listarContadores,
} from '../../servicos/contadores';
import { listarEmpresas } from '../../servicos/empresas';

const ROTULO_TIPO = { humano: 'Escritório/Pessoa física', interno_jota: 'Interno JOTA' };

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
    },
  });

  async function aoSubmeter(dados) {
    try {
      if (editando) {
        await atualizarContador(contador.id, {
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone || null,
        });
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
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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
            <label className="mb-1 block text-sm font-medium text-gray-700">CPF ou CNPJ *</label>
            <input
              {...register('cnpjCpf', { required: 'Obrigatório', minLength: { value: 11, message: 'Documento inválido' } })}
              disabled={editando}
              placeholder="Só números ou com máscara"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
            {editando && <p className="mt-1 text-xs text-gray-400">CPF/CNPJ não pode ser alterado depois de criado.</p>}
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
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
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

export default function ContabilAdminContadores() {
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-6xl px-6 py-6">
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
                      <td className="px-4 py-3 text-gray-600">{formatarCnpjCpf(contador.cnpjCpf)}</td>
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
                <p className="text-sm text-gray-600">{formatarCnpjCpf(contador.cnpjCpf)}</p>
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
      </main>

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
    </div>
  );
}
