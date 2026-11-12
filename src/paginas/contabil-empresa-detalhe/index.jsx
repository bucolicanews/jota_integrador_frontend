import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import SecaoCertificadoSerpro from '../../components/empresas/SecaoCertificadoSerpro';
import SecaoProcuracaoSerpro from '../../components/empresas/SecaoProcuracaoSerpro';
import CardComprarCreditosAvulsos from '../../components/empresas/CardComprarCreditosAvulsos';
import CardAcessoEmpresa from '../../components/empresas/CardAcessoEmpresa';
import CardGerenciarPlanoAssinatura from '../../components/empresas/CardGerenciarPlanoAssinatura';
import SecaoLancamentosDas from '../../components/empresas/SecaoLancamentosDas';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';
import { useEmpresaAtiva } from '../../hooks/useEmpresaAtiva';
import {
  atualizarEmpresa,
  atualizarModoAcessoSerpro,
  bloquearEmpresa,
  corrigirCnpjEmpresa,
  desbloquearEmpresa,
  obterEmpresa,
  transferirCarteiraEmpresa,
} from '../../servicos/empresas';
import { listarContadores, obterContador } from '../../servicos/contadores';
import { testarConexaoSerpro } from '../../servicos/acessoSerpro';
import { notificarSaldoCreditosAtualizado } from '../../servicos/creditos';
import { validarCpfOuCnpj } from '../../utils/validarCpfOuCnpj';

const formatarCnpj = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 14 ? digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : valor ?? '';
};

const formatarCpf = (valor) => {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 11 ? digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : valor ?? '';
};

// Empresa interna do contador pode ser pessoa física (CPF) -- toda outra é sempre jurídica
// (ver [[feedback_modulos_licenciamento_arquitetura]]/validarDocumentoEmpresa no backend).
const formatarDocumento = (valor, tipoPessoa) => (tipoPessoa === 'fisica' ? formatarCpf(valor) : formatarCnpj(valor));

// Ordem fixa combinada com o usuário -- rolagem horizontal em vez de quebrar linha, pra
// não espremer os rótulos em telas estreitas (padrão mobile-first do projeto).
const ABAS = [
  { id: 'dados', rotulo: 'Dados cadastrais' },
  { id: 'plano', rotulo: 'Plano de Crédito SERPRO' },
  { id: 'acesso-serpro', rotulo: 'Modo de acesso ao SERPRO' },
  { id: 'acesso-sistema', rotulo: 'Acesso ao sistema' },
  { id: 'creditos', rotulo: 'Comprar créditos' },
  // Só aparece pra empresa MEI/Simples Nacional -- filtrado no render (ver `abasVisiveis`).
  { id: 'lancamentos-das', rotulo: 'Lançamentos do DAS' },
];

const REGIMES_COM_DAS = ['mei', 'simples_nacional'];

const PAPEIS_PLATAFORMA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];

export default function ContabilEmpresaDetalhe() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { usuario } = useSelector((state) => state.autenticacao);
  const ehSuperAdmin = usuario?.papel === 'SUPER_ADMIN';
  const [contadores, setContadores] = useState([]);
  const [transferindoCarteira, setTransferindoCarteira] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoModo, setSalvandoModo] = useState(false);
  const [processandoBloqueio, setProcessandoBloqueio] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState(null);
  const [corrigindoCnpj, setCorrigindoCnpj] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('dados');
  const [preenchendoComDadosContador, setPreenchendoComDadosContador] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm();
  const tipoPessoaForm = watch('tipoPessoa');
  const { selecionarEmpresa, empresaAtiva } = useEmpresaAtiva();

  // Seletor do Header e esta tela leem "qual empresa" de fontes diferentes de propósito
  // (empresaAtiva/Redux vs. :id da URL -- ver comentário em useEmpresaAtiva.js). Sem isso,
  // trocar o seletor enquanto esta página está aberta não tinha efeito nenhum aqui (bug
  // real reportado pelo usuário). Só navega numa troca DE VERDADE -- guarda o id anterior
  // numa ref pra nunca disparar no primeiro carregamento (empresaAtiva pode estar "stale"
  // de uma sessão anterior ao entrar aqui pela lista da carteira, e não deve te jogar de
  // volta pra ela).
  const empresaAtivaIdAnteriorRef = useRef(empresaAtiva?.id);
  useEffect(() => {
    const anteriorId = empresaAtivaIdAnteriorRef.current;
    empresaAtivaIdAnteriorRef.current = empresaAtiva?.id;
    if (empresaAtiva && empresaAtiva.id !== anteriorId && empresaAtiva.id !== id) {
      navegar(`/contabil/empresas/${empresaAtiva.id}`);
    }
  }, [empresaAtiva, id, navegar]);

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
        tipoPessoa: dados.tipoPessoa ?? 'juridica',
        crc: dados.crc ?? '',
        contadorId: dados.contadorId,
      });
      setCorrigindoCnpj(false);
      setTransferindoCarteira(false);
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

  useEffect(() => {
    if (ehSuperAdmin) {
      listarContadores()
        .then(setContadores)
        .catch((erroRequisicao) => setErro(erroRequisicao.message));
    }
  }, [ehSuperAdmin]);

  function aoClicarTransferirCarteira() {
    const confirmado = window.confirm(
      'Transferir a carteira muda qual contador é responsável por esta empresa. ' +
        'O contador atual perde acesso imediatamente; honorários e licenças futuras passam a ser do novo contador. Continuar?',
    );
    if (confirmado) setTransferindoCarteira(true);
  }

  // Pessoa física da empresa interna costuma ser literalmente o mesmo cadastro do
  // contador (nome + CPF) -- evita digitar de novo o que já existe em `contadores`.
  async function aoUsarMesmoDadosContador() {
    setPreenchendoComDadosContador(true);
    try {
      const contador = await obterContador(empresa.contadorId);
      setValue('razaoSocial', contador.nome, { shouldDirty: true });
      setCorrigindoCnpj(true);
      setValue('cnpj', contador.cnpjCpf, { shouldDirty: true });
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setPreenchendoComDadosContador(false);
    }
  }

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
      if (transferindoCarteira && dados.contadorId !== empresa.contadorId) {
        await transferirCarteiraEmpresa(id, dados.contadorId);
      }
      if (corrigindoCnpj && dados.cnpj.replace(/\D/g, '') !== empresa.cnpj) {
        await corrigirCnpjEmpresa(id, dados.cnpj);
      }
      await atualizarEmpresa(id, {
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia || null,
        regimeTributario: dados.regimeTributario || null,
        ...(empresa.tipo === 'interna_contador' ? { tipoPessoa: dados.tipoPessoa, crc: dados.crc || null } : {}),
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

  async function aoTestarConexao() {
    setTestandoConexao(true);
    setResultadoTeste(null);
    try {
      const resultado = await testarConexaoSerpro(id);
      setResultadoTeste(resultado);
      notificarSaldoCreditosAtualizado();
    } catch (erroRequisicao) {
      setResultadoTeste({ sucesso: false, motivo: erroRequisicao.message });
    } finally {
      setTestandoConexao(false);
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

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-semibold text-gray-900">{empresa.razaoSocial}</h1>
            <p className="text-sm text-gray-500">
              {formatarDocumento(empresa.cnpj, empresa.tipoPessoa)}
              {!validarCpfOuCnpj(empresa.cnpj) && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                  ⚠️ {empresa.tipoPessoa === 'fisica' ? 'CPF' : 'CNPJ'} inválido
                </span>
              )}
            </p>
          </div>
          <button
            onClick={aoAlternarBloqueio}
            disabled={processandoBloqueio}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              empresa.bloqueado
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'border border-red-300 text-red-700 hover:bg-red-50'
            }`}
          >
            {processandoBloqueio ? 'Processando...' : empresa.bloqueado ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>

        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        <nav className="mb-6 flex flex-wrap gap-2">
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
        </nav>

        <div className="mb-4 -mx-4 overflow-x-auto border-b border-gray-200 px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1">
            {ABAS.filter((aba) => aba.id !== 'lancamentos-das' || REGIMES_COM_DAS.includes(empresa.regimeTributario)).map((aba) => (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  abaAtiva === aba.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>
        </div>

        {abaAtiva === 'dados' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <form onSubmit={handleSubmit(aoSalvarDados)} className="space-y-3">
              {ehSuperAdmin && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Contador da carteira</label>
                    {!transferindoCarteira && (
                      <button type="button" onClick={aoClicarTransferirCarteira} className="text-xs font-medium text-blue-700 hover:underline">
                        Transferir carteira
                      </button>
                    )}
                  </div>
                  <select
                    {...register('contadorId', { required: true })}
                    disabled={!transferindoCarteira}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {contadores.map((contador) => (
                      <option key={contador.id} value={contador.id}>
                        {contador.nome}
                      </option>
                    ))}
                  </select>
                  {transferindoCarteira && (
                    <p className="mt-1 text-xs text-amber-600">Confira bem antes de salvar -- essa transferência é registrada em auditoria.</p>
                  )}
                </div>
              )}
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

              {empresa.tipo === 'interna_contador' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de cadastro</label>
                  <select {...register('tipoPessoa')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="juridica">Jurídica (CNPJ)</option>
                    <option value="fisica">Física -- contador autônomo (CPF + CRC)</option>
                  </select>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {tipoPessoaForm === 'fisica' ? 'CPF' : 'CNPJ'}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {empresa.tipo === 'interna_contador' && tipoPessoaForm === 'fisica' && (
                      <button
                        type="button"
                        onClick={aoUsarMesmoDadosContador}
                        disabled={preenchendoComDadosContador}
                        className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                      >
                        {preenchendoComDadosContador ? 'Buscando...' : 'Usar mesmo dados do contador'}
                      </button>
                    )}
                    {!corrigindoCnpj && (
                      <button type="button" onClick={aoClicarCorrigirCnpj} className="text-xs font-medium text-blue-700 hover:underline">
                        Corrigir {tipoPessoaForm === 'fisica' ? 'CPF' : 'CNPJ'}
                      </button>
                    )}
                  </div>
                </div>
                {corrigindoCnpj ? (
                  <input
                    {...register('cnpj', { required: 'Obrigatório', validate: (v) => validarCpfOuCnpj(v) || `${tipoPessoaForm === 'fisica' ? 'CPF' : 'CNPJ'} inválido` })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    value={formatarDocumento(empresa.cnpj, empresa.tipoPessoa)}
                    disabled
                    className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                  />
                )}
                {errors.cnpj && <p className="mt-1 text-xs font-medium text-red-600">{errors.cnpj.message}</p>}
                {!corrigindoCnpj && !validarCpfOuCnpj(empresa.cnpj) && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    ⚠️ Este {empresa.tipoPessoa === 'fisica' ? 'CPF' : 'CNPJ'} não passa na validação de formato -- considere corrigir.
                  </p>
                )}
                {corrigindoCnpj && <p className="mt-1 text-xs text-amber-600">Confira bem antes de salvar -- essa correção é registrada em auditoria.</p>}
              </div>

              {empresa.tipo === 'interna_contador' && tipoPessoaForm === 'fisica' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">CRC</label>
                  <input
                    {...register('crc', { required: 'CRC é obrigatório pra pessoa física' })}
                    className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  {errors.crc && <p className="mt-1 text-xs text-red-600">{errors.crc.message}</p>}
                </div>
              )}

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
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={salvandoDados || !isDirty}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
                >
                  {salvandoDados ? 'Salvando...' : 'Salvar alterações'}
                </button>
                {mensagemSalvo && <span className="text-sm text-green-700">{mensagemSalvo}</span>}
              </div>
            </form>
          </div>
        )}

        {abaAtiva === 'plano' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <CardGerenciarPlanoAssinatura empresaId={id} contadorId={empresa.contadorId} />
          </div>
        )}

        {abaAtiva === 'acesso-serpro' && (
          <div className="rounded-lg bg-white p-6 shadow">
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

            <div className="mt-4 border-t border-gray-100 pt-4">
              {empresa.modoAcessoSerpro === 'certificado_proprio' ? (
                <SecaoCertificadoSerpro empresaId={id} />
              ) : (
                <SecaoProcuracaoSerpro empresaId={id} podeEditar={PAPEIS_PLATAFORMA.includes(usuario?.papel)} />
              )}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={aoTestarConexao}
                disabled={testandoConexao}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              >
                {testandoConexao ? 'Testando...' : 'Testar conexão'}
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Faz uma chamada real ao SERPRO (gasta 1 crédito) pra confirmar que a procuração/certificado funciona de verdade.
              </p>
              {resultadoTeste && (
                <p className={`mt-2 break-words text-sm font-medium ${resultadoTeste.sucesso ? 'text-green-700' : 'text-red-700'}`}>
                  {resultadoTeste.sucesso ? '✅ Conexão funcionando.' : `❌ ${resultadoTeste.motivo}`}
                </p>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'acesso-sistema' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="mb-3 break-words text-xs text-gray-500">
              Login do responsável por {empresa.razaoSocial} -- quem vai entrar na visão JOTA FISCAL desta empresa.
            </p>
            <CardAcessoEmpresa empresaId={id} empresaNome={empresa.razaoSocial} />
          </div>
        )}

        {abaAtiva === 'creditos' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <CardComprarCreditosAvulsos empresaId={id} />
          </div>
        )}

        {abaAtiva === 'lancamentos-das' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <SecaoLancamentosDas empresaId={id} />
          </div>
        )}
      </div>
    </LayoutPrincipal>
  );
}
