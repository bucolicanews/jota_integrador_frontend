import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { AlternadorVisualizacao } from '../../componentes/admin/AlternadorVisualizacao';
import { listarContadores } from '../../servicos/contadores';
import { atualizarEmpresa, bloquearEmpresa, criarEmpresa, desbloquearEmpresa, listarEmpresas } from '../../servicos/empresas';

const ROTULO_MODO_ACESSO = { procuracao: 'Procuração', certificado_proprio: 'Certificado próprio' };

const formatarCnpj = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 14 ? digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : valor ?? '';
};

function BadgeStatus({ bloqueado }) {
  return bloqueado ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      🔴 Bloqueada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      🟢 Ativa
    </span>
  );
}

/** Criar/editar num modal só -- contador só aparece na criação (backend não tem endpoint de transferência entre carteiras). */
function ModalEmpresa({ empresa, contadores, aoFechar, aoSalvar }) {
  const editando = Boolean(empresa);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues: {
      contadorId: empresa?.contadorId ?? contadores[0]?.id ?? '',
      razaoSocial: empresa?.razaoSocial ?? '',
      nomeFantasia: empresa?.nomeFantasia ?? '',
      cnpj: empresa?.cnpj ?? '',
      regimeTributario: empresa?.regimeTributario ?? '',
      modoAcessoSerpro: empresa?.modoAcessoSerpro ?? 'procuracao',
    },
  });

  async function aoSubmeter(dados) {
    try {
      if (editando) {
        await atualizarEmpresa(empresa.id, {
          razaoSocial: dados.razaoSocial,
          nomeFantasia: dados.nomeFantasia || null,
          regimeTributario: dados.regimeTributario || null,
        });
      } else {
        await criarEmpresa({
          contadorId: dados.contadorId,
          razaoSocial: dados.razaoSocial,
          nomeFantasia: dados.nomeFantasia || null,
          cnpj: dados.cnpj.replace(/\D/g, ''),
          regimeTributario: dados.regimeTributario || null,
          modoAcessoSerpro: dados.modoAcessoSerpro,
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{editando ? 'Editar empresa' : 'Nova empresa'}</h2>
        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contador da carteira *</label>
            <select
              {...register('contadorId', { required: true })}
              disabled={editando}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
              {contadores.map((contador) => (
                <option key={contador.id} value={contador.id}>
                  {contador.nome}
                </option>
              ))}
            </select>
            {editando && <p className="mt-1 text-xs text-gray-400">Mover uma empresa entre carteiras não é suportado hoje.</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Razão social *</label>
            <input
              {...register('razaoSocial', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.razaoSocial && <p className="mt-1 text-xs text-red-600">{errors.razaoSocial.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome fantasia</label>
            <input {...register('nomeFantasia')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ *</label>
            <input
              {...register('cnpj', { required: 'Obrigatório' })}
              disabled={editando}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
            {errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Regime tributário</label>
            <input {...register('regimeTributario')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>

          {!editando && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Modo de acesso ao SERPRO *</label>
              <select {...register('modoAcessoSerpro')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="procuracao">Procuração eletrônica</option>
                <option value="certificado_proprio">Certificado próprio</option>
              </select>
            </div>
          )}

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

function ModalBloqueio({ empresa, aoFechar, aoConfirmar }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { motivo: '' },
  });

  async function aoSubmeter(dados) {
    try {
      await bloquearEmpresa(empresa.id, dados.motivo);
      aoConfirmar();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível bloquear' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bloquear {empresa.razaoSocial}</h2>
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

export default function ContabilAdminEmpresas() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const ehSuperAdmin = usuario?.papel === 'SUPER_ADMIN';

  const [contadores, setContadores] = useState([]);
  const [empresas, setEmpresas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [visualizacao, setVisualizacao] = useState('lista');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroCnpj, setFiltroCnpj] = useState('');
  const [filtroContadorId, setFiltroContadorId] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalEmpresa, setModalEmpresa] = useState(null); // null | { empresa?: Empresa } (empresa ausente = criar)
  const [modalBloqueio, setModalBloqueio] = useState(null);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null);

  const mapaContadorNome = useMemo(
    () => Object.fromEntries(contadores.map((contador) => [contador.id, contador.nome])),
    [contadores],
  );

  async function carregar() {
    setCarregando(true);
    try {
      const dadosContadores = await listarContadores();
      setContadores(dadosContadores);
      // Não existe endpoint "listar todas as empresas" -- agrega por contador (carteira é pequena por
      // enquanto; se crescer muito, isso vira o motivo real pra pedir um endpoint agregado no backend).
      const listasPorContador = await Promise.all(
        dadosContadores.map((contador) => listarEmpresas(contador.id)),
      );
      setEmpresas(listasPorContador.flat());
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

  async function aoDesbloquear(empresa) {
    if (!window.confirm(`Desbloquear ${empresa.razaoSocial}?`)) return;
    setAcaoEmAndamento(empresa.id);
    try {
      await desbloquearEmpresa(empresa.id);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setAcaoEmAndamento(null);
    }
  }

  const empresasFiltradas = useMemo(() => {
    if (!empresas) return [];
    const nomeBusca = filtroNome.trim().toLowerCase();
    const cnpjBusca = filtroCnpj.replace(/\D/g, '');
    return empresas.filter((empresa) => {
      if (nomeBusca && !`${empresa.razaoSocial} ${empresa.nomeFantasia ?? ''}`.toLowerCase().includes(nomeBusca)) return false;
      if (cnpjBusca && !empresa.cnpj.replace(/\D/g, '').includes(cnpjBusca)) return false;
      if (filtroContadorId !== 'todos' && empresa.contadorId !== filtroContadorId) return false;
      if (filtroStatus === 'ativas' && empresa.bloqueado) return false;
      if (filtroStatus === 'bloqueadas' && !empresa.bloqueado) return false;
      return true;
    });
  }, [empresas, filtroNome, filtroCnpj, filtroContadorId, filtroStatus]);

  function Acoes({ empresa }) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setModalEmpresa({ empresa })}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Editar
        </button>
        {ehSuperAdmin &&
          (empresa.bloqueado ? (
            <button
              onClick={() => aoDesbloquear(empresa)}
              disabled={acaoEmAndamento === empresa.id}
              className="rounded-md border border-green-300 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Desbloquear
            </button>
          ) : (
            <button
              onClick={() => setModalBloqueio(empresa)}
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
          <h1 className="text-xl font-semibold text-gray-900">Empresas (todas)</h1>
          {ehSuperAdmin && (
            <button
              onClick={() => setModalEmpresa({})}
              disabled={contadores.length === 0}
              title={contadores.length === 0 ? 'Cadastre um contador antes' : undefined}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Nova empresa
            </button>
          )}
        </div>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Razão social / fantasia</label>
            <input
              value={filtroNome}
              onChange={(evento) => setFiltroNome(evento.target.value)}
              placeholder="Buscar por nome..."
              className="w-56 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ</label>
            <input
              value={filtroCnpj}
              onChange={(evento) => setFiltroCnpj(evento.target.value)}
              placeholder="Buscar por CNPJ..."
              className="w-40 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Contador</label>
            <select
              value={filtroContadorId}
              onChange={(evento) => setFiltroContadorId(evento.target.value)}
              className="w-48 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="todos">Todos os contadores</option>
              {contadores.map((contador) => (
                <option key={contador.id} value={contador.id}>
                  {contador.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
            <select
              value={filtroStatus}
              onChange={(evento) => setFiltroStatus(evento.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="ativas">Ativas</option>
              <option value="bloqueadas">Bloqueadas</option>
            </select>
          </div>
          <div className="ml-auto">
            <AlternadorVisualizacao visualizacao={visualizacao} aoAlternar={setVisualizacao} />
          </div>
        </div>

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : empresasFiltradas.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
            {empresas.length === 0 ? 'Nenhuma empresa cadastrada ainda.' : 'Nenhuma empresa encontrada com esses filtros.'}
          </p>
        ) : visualizacao === 'lista' ? (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Razão social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Contador</th>
                  <th className="px-4 py-3">Acesso SERPRO</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empresasFiltradas.map((empresa) => (
                  <tr key={empresa.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{empresa.razaoSocial}</p>
                      {empresa.nomeFantasia && <p className="text-xs text-gray-500">{empresa.nomeFantasia}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatarCnpj(empresa.cnpj)}</td>
                    <td className="px-4 py-3 text-gray-600">{mapaContadorNome[empresa.contadorId] ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{ROTULO_MODO_ACESSO[empresa.modoAcessoSerpro]}</td>
                    <td className="px-4 py-3">
                      <BadgeStatus bloqueado={empresa.bloqueado} />
                    </td>
                    <td className="px-4 py-3">
                      <Acoes empresa={empresa} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {empresasFiltradas.map((empresa) => (
              <div key={empresa.id} className="rounded-lg bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold text-gray-900">{empresa.razaoSocial}</p>
                  <BadgeStatus bloqueado={empresa.bloqueado} />
                </div>
                {empresa.nomeFantasia && <p className="text-xs text-gray-500">{empresa.nomeFantasia}</p>}
                <p className="mt-1 text-sm text-gray-600">{formatarCnpj(empresa.cnpj)}</p>
                <p className="text-sm text-gray-600">
                  Contador: <span className="font-medium">{mapaContadorNome[empresa.contadorId] ?? '—'}</span>
                </p>
                <p className="mb-3 text-xs text-gray-400">{ROTULO_MODO_ACESSO[empresa.modoAcessoSerpro]}</p>

                <div className="border-t border-gray-100 pt-3">
                  <Acoes empresa={empresa} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalEmpresa && (
        <ModalEmpresa
          empresa={modalEmpresa.empresa}
          contadores={contadores}
          aoFechar={() => setModalEmpresa(null)}
          aoSalvar={() => {
            setModalEmpresa(null);
            carregar();
          }}
        />
      )}

      {modalBloqueio && (
        <ModalBloqueio
          empresa={modalBloqueio}
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
