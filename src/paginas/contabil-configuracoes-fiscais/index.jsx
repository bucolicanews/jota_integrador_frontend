import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Settings } from 'lucide-react';
import LayoutPrincipal from '../../components/layout/LayoutPrincipal';
import SecaoCertificadoSerpro from '../../components/empresas/SecaoCertificadoSerpro';
import SecaoProcuracaoSerpro from '../../components/empresas/SecaoProcuracaoSerpro';
import CardContaPagbankEmpresa from '../../components/empresas/CardContaPagbankEmpresa';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';
import { atualizarEmpresa, atualizarModoAcessoSerpro, corrigirCnpjEmpresa, obterEmpresaInterna } from '../../servicos/empresas';
import { testarConexaoSerpro } from '../../servicos/acessoSerpro';
import { notificarSaldoCreditosAtualizado } from '../../servicos/creditos';
import { validarCpfOuCnpj } from '../../utils/validarCpfOuCnpj';

const PAPEIS_PLATAFORMA = ['SUPER_ADMIN', 'ADMIN_FINANCEIRO', 'ADMIN_SUPORTE'];
const PAPEIS_PERMITIDOS = ['CONTADOR_DONO', 'OPERADOR_CONTADOR', ...PAPEIS_PLATAFORMA];

const ABAS = [
  { id: 'dados', rotulo: 'Dados cadastrais' },
  { id: 'acesso-serpro', rotulo: 'Modo de acesso ao SERPRO' },
  { id: 'pagbank', rotulo: 'Conta PagBank' },
];

function formatarCnpj(valor) {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 14 ? digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : valor ?? '';
}

function formatarCpf(valor) {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.length === 11 ? digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : valor ?? '';
}

const formatarDocumento = (valor, tipoPessoa) => (tipoPessoa === 'fisica' ? formatarCpf(valor) : formatarCnpj(valor));

export default function ContabilConfiguracoesFiscais() {
  const { usuario } = useSelector((state) => state.autenticacao);
  const [empresa, setEmpresa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('dados');
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState(null);
  const [corrigindoCnpj, setCorrigindoCnpj] = useState(false);
  const [salvandoModo, setSalvandoModo] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null);

  const podeVer = PAPEIS_PERMITIDOS.includes(usuario?.papel);
  const ehContador = ['CONTADOR_DONO', 'OPERADOR_CONTADOR'].includes(usuario?.papel);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm();
  const tipoPessoaForm = watch('tipoPessoa');

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await obterEmpresaInterna();
      setEmpresa(dados);
      reset({
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia ?? '',
        regimeTributario: dados.regimeTributario ?? '',
        cnpj: dados.cnpj,
        tipoPessoa: dados.tipoPessoa ?? 'juridica',
        crc: dados.crc ?? '',
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
    if (podeVer) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVer]);

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
        await corrigirCnpjEmpresa(empresa.id, dados.cnpj);
      }
      await atualizarEmpresa(empresa.id, {
        razaoSocial: dados.razaoSocial,
        nomeFantasia: dados.nomeFantasia || null,
        regimeTributario: dados.regimeTributario || null,
        ...(ehContador ? { tipoPessoa: dados.tipoPessoa, crc: dados.crc || null } : {}),
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
      await atualizarModoAcessoSerpro(empresa.id, novoModo);
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
      const resultado = await testarConexaoSerpro(empresa.id);
      setResultadoTeste(resultado);
      notificarSaldoCreditosAtualizado();
    } catch (erroRequisicao) {
      setResultadoTeste({ sucesso: false, motivo: erroRequisicao.message });
    } finally {
      setTestandoConexao(false);
    }
  }

  if (!usuario) return null;

  if (!podeVer) {
    return (
      <LayoutPrincipal>
        <p className="text-sm text-gray-500">Você não tem acesso a esta tela.</p>
      </LayoutPrincipal>
    );
  }

  return (
    <LayoutPrincipal>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 flex items-center text-xl font-semibold text-gray-900">
          <Settings className="mr-2 h-5 w-5" /> Configurações Fiscais
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          Dados cadastrais e acesso ao SERPRO/Integra Contador em nome da sua própria empresa.
        </p>

        {carregando && <p className="text-sm text-gray-500">Carregando...</p>}
        {erro && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

        {empresa && (
          <>
            <div className="mb-4 border-b border-gray-200">
              <div className="flex gap-1">
                {ABAS.map((aba) => (
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

                  {ehContador && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de cadastro</label>
                      <select {...register('tipoPessoa')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="juridica">Jurídica (CNPJ)</option>
                        <option value="fisica">Física -- contador autônomo (CPF + CRC)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        {tipoPessoaForm === 'fisica' ? 'CPF' : 'CNPJ'}
                      </label>
                      {!corrigindoCnpj && (
                        <button type="button" onClick={aoClicarCorrigirCnpj} className="text-xs font-medium text-blue-700 hover:underline">
                          Corrigir {tipoPessoaForm === 'fisica' ? 'CPF' : 'CNPJ'}
                        </button>
                      )}
                    </div>
                    <input
                      {...register('cnpj', { required: 'Obrigatório' })}
                      disabled={!corrigindoCnpj}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    {!corrigindoCnpj && !validarCpfOuCnpj(empresa.cnpj) && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        ⚠️ Este {empresa.tipoPessoa === 'fisica' ? 'CPF' : 'CNPJ'} não passa na validação de formato -- considere corrigir.
                      </p>
                    )}
                    {corrigindoCnpj && <p className="mt-1 text-xs text-amber-600">Confira bem antes de salvar -- essa correção é registrada em auditoria.</p>}
                  </div>

                  {ehContador && tipoPessoaForm === 'fisica' && (
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

            {abaAtiva === 'acesso-serpro' && (
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900">{empresa.razaoSocial}</p>
                  <p className="text-xs text-gray-500">{formatarDocumento(empresa.cnpj, empresa.tipoPessoa)}</p>
                </div>

                <p className="mb-3 text-xs text-gray-500">
                  Como a Jota consulta os dados fiscais da sua própria empresa junto à Receita Federal.
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
                    <SecaoCertificadoSerpro empresaId={empresa.id} />
                  ) : (
                    <SecaoProcuracaoSerpro empresaId={empresa.id} podeEditar={PAPEIS_PLATAFORMA.includes(usuario?.papel)} />
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

            {abaAtiva === 'pagbank' && <CardContaPagbankEmpresa empresa={empresa} aoAtualizar={carregar} />}
          </>
        )}
      </div>
    </LayoutPrincipal>
  );
}
