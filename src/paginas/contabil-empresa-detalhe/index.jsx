import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import SecaoCertificadoSerpro from '../../components/empresas/SecaoCertificadoSerpro';
import CardComprarCreditosAvulsos from '../../components/empresas/CardComprarCreditosAvulsos';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';
import {
  atualizarEmpresa,
  atualizarModoAcessoSerpro,
  bloquearEmpresa,
  corrigirCnpjEmpresa,
  desbloquearEmpresa,
  obterEmpresa,
} from '../../servicos/empresas';
import { validarCnpj } from '../../utils/validarCnpj';

const formatarCnpj = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 14 ? digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : valor ?? '';
};

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
  const [corrigindoCnpj, setCorrigindoCnpj] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm();
  const { selecionarEmpresa } = useEmpresaAtiva();

  function aoAbrirLancamentos() {
    if (empresa) selecionarEmpresa(empresa);
    navegar('/lancamentos');
  }

  function aoAbrirPlanoContas() {
    if (empresa) selecionarEmpresa(empresa);
    navegar('/plano-contas');
  }

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await obterEmpresa(id);
      setEmpresa(dados);
      reset({
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia ?? '',
        regimeTributario: dados.regimeTributario ?? '',
        cnpj: dados.cnpj,
      });
      setCorrigindoCnpj(false);
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

  function aoClicarCorrigirCnpj() {
    const confirmado = window.confirm(
      'Corrigir o CNPJ muda a identidade legal desta empresa perante a Receita/SERPRO. ' +
        'Só faça isso se o CNPJ foi cadastrado errado -- qualquer certificado, procuração ou consulta SERPRO já sincronizada continua associada ao CNPJ antigo. Continuar?',
    );
    if (confirmado) setCorrigindoCnpj(true);
  }

  async function aoSalvarDados(dados) {
    setSalvandoDados(true);
    setMensagemSalvo(null);
    try {
      if (corrigindoCnpj && dados.cnpj.replace(/\D/g, '') !== empresa.cnpj) {
        await corrigirCnpjEmpresa(id, dados.cnpj);
      }
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
      <LayoutPrincipal>
        <p className="text-sm text-gray-500">Carregando...</p>
      </LayoutPrincipal>
    );
  }

  if (erro && !empresa) {
    return (
      <LayoutPrincipal>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-3xl">
        <button onClick={() => navegar('/contabil/empresas')} className="mb-4 text-sm text-gray-500 hover:text-gray-700">
          ← Voltar pra carteira
        </button>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{empresa.razaoSocial}</h1>
            <p className="text-sm text-gray-500">
              {formatarCnpj(empresa.cnpj)}
              {!validarCnpj(empresa.cnpj) && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  ⚠️ CNPJ inválido
                </span>
              )}
            </p>
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
          <button
            type="button"
            onClick={aoAbrirPlanoContas}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Plano de Contas
          </button>
          <button
            type="button"
            onClick={aoAbrirLancamentos}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Lançamentos
          </button>
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
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-sm font-medium text-gray-700">CNPJ</label>
                {!corrigindoCnpj && (
                  <button type="button" onClick={aoClicarCorrigirCnpj} className="text-xs font-medium text-blue-700 hover:underline">
                    Corrigir CNPJ
                  </button>
                )}
              </div>
              <input
                {...register('cnpj', { required: 'Obrigatório' })}
                disabled={!corrigindoCnpj}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
              {!corrigindoCnpj && !validarCnpj(empresa.cnpj) && (
                <p className="mt-1 text-xs font-medium text-red-600">⚠️ Este CNPJ não passa na validação de formato -- considere corrigir.</p>
              )}
              {corrigindoCnpj && <p className="mt-1 text-xs text-amber-600">Confira bem antes de salvar -- essa correção é registrada em auditoria.</p>}
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

          {empresa.modoAcessoSerpro === 'certificado_proprio' && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <SecaoCertificadoSerpro empresaId={id} />
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Comprar créditos</h2>
          <CardComprarCreditosAvulsos empresaId={id} />
        </div>
      </div>
    </LayoutPrincipal>
  );
}
