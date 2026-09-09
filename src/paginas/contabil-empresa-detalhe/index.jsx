import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { CabecalhoContabil } from '../../componentes/contabil/CabecalhoContabil';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';
import {
  atualizarEmpresa,
  atualizarModoAcessoSerpro,
  bloquearEmpresa,
  desbloquearEmpresa,
  obterEmpresa,
} from '../../servicos/empresas';

export default function ContabilEmpresaDetalhe() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoModo, setSalvandoModo] = useState(false);
  const [processandoBloqueio, setProcessandoBloqueio] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await obterEmpresa(id);
      setEmpresa(dados);
      reset({
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia ?? '',
        regimeTributario: dados.regimeTributario ?? '',
      });
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function aoSalvarDados(dados) {
    setSalvandoDados(true);
    setMensagemSalvo(null);
    try {
      await atualizarEmpresa(id, {
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia || null,
        regimeTributario: dados.regimeTributario || null,
      });
      await carregar();
      setMensagemSalvo('Dados salvos.');
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvandoDados(false);
    }
  }

  async function aoTrocarModoAcesso(evento) {
    const novoModo = evento.target.value;
    setSalvandoModo(true);
    try {
      await atualizarModoAcessoSerpro(id, novoModo);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvandoModo(false);
    }
  }

  async function aoAlternarBloqueio() {
    setProcessandoBloqueio(true);
    try {
      if (empresa.bloqueado) {
        await desbloquearEmpresa(id);
      } else {
        const motivo = window.prompt('Motivo do bloqueio (opcional):') ?? '';
        await bloquearEmpresa(id, motivo || 'Bloqueado pelo contador');
      }
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setProcessandoBloqueio(false);
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CabecalhoContabil />
        <p className="p-6 text-sm text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (erro && !empresa) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CabecalhoContabil />
        <p className="m-6 rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoContabil />

      <main className="mx-auto max-w-3xl px-6 py-6">
        <button onClick={() => navegar('/contabil/empresas')} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
          ← Voltar pra carteira
        </button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{empresa.razaoSocial}</h1>
            <p className="text-sm text-gray-500">{empresa.cnpj}</p>
          </div>
          <button
            onClick={aoAlternarBloqueio}
            disabled={processandoBloqueio}
            className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              empresa.bloqueado
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'border border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            {processandoBloqueio ? 'Processando...' : empresa.bloqueado ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <nav className="mb-6 flex gap-2">
          <Link
            to={`/contabil/empresas/${id}/acesso-serpro`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Procuração / Certificado
          </Link>
          <Link
            to={`/contabil/empresas/${id}/caixa-postal`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Caixa Postal
          </Link>
          <Link
            to={`/contabil/empresas/${id}/plano-contas`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Plano de Contas
          </Link>
          <Link
            to={`/contabil/empresas/${id}/lancamentos`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Lançamentos
          </Link>
        </nav>

        <div className="mb-4 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Dados cadastrais</h2>
          <form onSubmit={handleSubmit(aoSalvarDados)} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Razão social</label>
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
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={salvandoDados || !isDirty}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {salvandoDados ? 'Salvando...' : 'Salvar alterações'}
              </button>
              {mensagemSalvo && <span className="text-sm text-green-700">{mensagemSalvo}</span>}
            </div>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Modo de acesso ao SERPRO</h2>
          <p className="mb-3 text-xs text-gray-500">
            Como a Jota consulta os dados fiscais desta empresa junto à Receita Federal.
          </p>
          <select
            value={empresa.modoAcessoSerpro}
            onChange={aoTrocarModoAcesso}
            disabled={salvandoModo}
            className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="procuracao">Procuração eletrônica</option>
            <option value="certificado_proprio">Certificado próprio</option>
          </select>
        </div>
      </main>
    </div>
  );
}
