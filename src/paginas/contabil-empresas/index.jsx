import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';
import { criarEmpresa, listarEmpresas } from '../../servicos/empresas';

const ROTULO_MODO_ACESSO = {
  procuracao: 'Procuração',
  certificado_proprio: 'Certificado próprio',
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

function ModalNovaEmpresa({ aoFechar, aoCriar }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    defaultValues: { razaoSocial: '', nomeFantasia: '', cnpj: '', regimeTributario: '', modoAcessoSerpro: 'procuracao' },
  });

  async function aoSubmeter(dados) {
    try {
      await aoCriar({
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia || null,
        cnpj: dados.cnpj.replace(/\D/g, ''),
        regimeTributario: dados.regimeTributario || null,
        modoAcessoSerpro: dados.modoAcessoSerpro,
      });
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível cadastrar a empresa' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nova empresa</h2>

        <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3">
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
              placeholder="00.000.000/0000-00"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {errors.cnpj && <p className="mt-1 text-xs text-red-600">{errors.cnpj.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Regime tributário</label>
            <select {...register('regimeTributario')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Selecione...</option>
              {REGIMES_TRIBUTARIOS.map((regime) => (
                <option key={regime.valor} value={regime.valor}>
                  {regime.rotulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Modo de acesso ao SERPRO *</label>
            <select {...register('modoAcessoSerpro')} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="procuracao">Procuração eletrônica</option>
              <option value="certificado_proprio">Certificado próprio</option>
            </select>
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
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContabilEmpresas() {
  const navegar = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarEmpresas();
      setEmpresas(dados);
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

  const empresasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return empresas;
    return empresas.filter(
      (empresa) => empresa.razaoSocial.toLowerCase().includes(termo) || empresa.cnpj.includes(termo),
    );
  }, [empresas, busca]);

  const totalAtivas = empresas.filter((e) => !e.bloqueado).length;
  const totalBloqueadas = empresas.length - totalAtivas;

  async function aoCriarEmpresa(dados) {
    const nova = await criarEmpresa(dados);
    setModalAberto(false);
    setEmpresas((atual) => [...atual, nova]);
    navegar(`/contabil/empresas/${nova.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Carteira de Empresas</h1>
            <p className="text-sm text-gray-500">
              {empresas.length} {empresas.length === 1 ? 'empresa' : 'empresas'} · {totalAtivas} ativas
              {totalBloqueadas > 0 && ` · ${totalBloqueadas} bloqueadas`}
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nova empresa
          </button>
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por razão social ou CNPJ..."
          className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

        {carregando ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : empresasFiltradas.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow">
            {empresas.length === 0 ? 'Nenhuma empresa cadastrada ainda.' : 'Nenhuma empresa encontrada para essa busca.'}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Razão social</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">Acesso SERPRO</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {empresasFiltradas.map((empresa) => (
                  <tr
                    key={empresa.id}
                    onClick={() => navegar(`/contabil/empresas/${empresa.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navegar(`/contabil/empresas/${empresa.id}`);
                    }}
                    className="cursor-pointer hover:bg-gray-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{empresa.razaoSocial}</p>
                      {empresa.nomeFantasia && <p className="text-xs text-gray-500">{empresa.nomeFantasia}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{empresa.cnpj}</td>
                    <td className="px-4 py-3 text-gray-600">{ROTULO_MODO_ACESSO[empresa.modoAcessoSerpro]}</td>
                    <td className="px-4 py-3">
                      <BadgeStatus bloqueado={empresa.bloqueado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalAberto && <ModalNovaEmpresa aoFechar={() => setModalAberto(false)} aoCriar={aoCriarEmpresa} />}
    </div>
  );
}
