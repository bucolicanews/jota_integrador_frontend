import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { REGIMES_TRIBUTARIOS } from '../../constantes/regimesTributarios';
import { criarEmpresa } from '../../servicos/empresas';
import { listarPlanos, listarPlanosRevendaCreditos } from '../../servicos/assinatura';
import { obterStatusPagbankConta } from '../../servicos/pagbankLicencas';
import FormularioCheckoutPagbank from '../pagbank/FormularioCheckoutPagbank';
import CartaoLinkAcesso from '../auth/CartaoLinkAcesso';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

/**
 * Cadastro de empresa em 2 passos -- plano+login do cliente deixaram de ser passo manual
 * separado (ver CadastrarEmpresaComPlanoUseCase no backend): toda empresa nasce já com
 * plano escolhido (grátis é uma escolha como qualquer outra, não omissão) e login
 * convidado, nunca mais "sem plano ativo" até alguém lembrar de ativar depois.
 *
 * Só cobre CRIAÇÃO -- editar uma empresa existente continua no modal de sempre (plano já
 * existe nesse caso, não faz sentido pedir de novo). `aoCriar` só é chamado quando o
 * usuário fecha a tela de resultado (nunca antes) -- ele continua vendo o PIX/mensagem
 * de sucesso enquanto a lista por trás já pode ter recarregado.
 */
export default function ModalCadastrarEmpresa({ contadores, ehSuperAdmin, meuContadorId, aoFechar, aoCriar }) {
  const [etapa, setEtapa] = useState('dados'); // 'dados' | 'plano'
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultadoFinal, setResultadoFinal] = useState(null); // { empresa, pagamento, cobranca }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      contadorId: meuContadorId ?? contadores?.[0]?.id ?? '',
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      regimeTributario: '',
      modoAcessoSerpro: 'procuracao',
    },
  });

  function aoConfirmarDados(dados) {
    setDadosEmpresa(dados);
    setEtapa('plano');
  }

  async function aoSubmeterPlano(payload) {
    setEnviando(true);
    setErro(null);
    try {
      const resultado = await criarEmpresa({
        contadorId: dadosEmpresa.contadorId,
        razaoSocial: dadosEmpresa.razaoSocial,
        nomeFantasia: dadosEmpresa.nomeFantasia || null,
        cnpj: dadosEmpresa.cnpj.replace(/\D/g, ''),
        regimeTributario: dadosEmpresa.regimeTributario || null,
        modoAcessoSerpro: dadosEmpresa.modoAcessoSerpro,
        ...payload,
      });
      setResultadoFinal({
        empresa: resultado.empresa,
        pagamento: resultado.pagamento,
        cobranca: payload.cobranca,
        linkAcesso: resultado.usuario.linkAcesso,
      });
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (resultadoFinal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Empresa cadastrada</h2>
          {resultadoFinal.cobranca === 'gratis' && (
            <p className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              "{resultadoFinal.empresa.razaoSocial}" cadastrada e com o plano ativo.
            </p>
          )}
          {resultadoFinal.cobranca === 'cliente_paga_depois' && (
            <p className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              "{resultadoFinal.empresa.razaoSocial}" cadastrada -- a cobrança pendente já está esperando o cliente lá dentro, em "Minha assinatura".
            </p>
          )}
          {resultadoFinal.cobranca === 'contador_paga_agora' && (
            <>
              <p className="mb-2 text-sm text-gray-700">"{resultadoFinal.empresa.razaoSocial}" cadastrada.</p>
              <FormularioCheckoutPagbank resultado={resultadoFinal.pagamento} onConfirmar={() => {}} onCancelar={() => {}} />
            </>
          )}
          <div className="mt-3">
            <CartaoLinkAcesso link={resultadoFinal.linkAcesso} titulo="Link de acesso do cliente" />
          </div>
          <button
            type="button"
            onClick={() => aoCriar(resultadoFinal.empresa)}
            className="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Nova empresa</h2>
        <p className="mb-4 text-xs text-gray-500">{etapa === 'dados' ? 'Passo 1 de 2 -- dados cadastrais' : 'Passo 2 de 2 -- plano e acesso do cliente'}</p>

        {etapa === 'dados' && (
          <form onSubmit={handleSubmit(aoConfirmarDados)} className="space-y-3">
            {ehSuperAdmin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Contador da carteira *</label>
                <select {...register('contadorId', { required: true })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  {contadores.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
            )}
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
                  <option key={regime.valor} value={regime.valor}>{regime.rotulo}</option>
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

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={aoFechar} className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Continuar
              </button>
            </div>
          </form>
        )}

        {etapa === 'plano' && (
          <EtapaPlano
            contadorId={dadosEmpresa.contadorId}
            erro={erro}
            enviando={enviando}
            onVoltar={() => setEtapa('dados')}
            onSubmeter={aoSubmeterPlano}
          />
        )}
      </div>
    </div>
  );
}

function EtapaPlano({ contadorId, erro, enviando, onVoltar, onSubmeter }) {
  const [planos, setPlanos] = useState(null);
  const [planosRevenda, setPlanosRevenda] = useState([]);
  const [statusPagbank, setStatusPagbank] = useState(null);
  const [planoId, setPlanoId] = useState('');
  const [cobranca, setCobranca] = useState('gratis'); // 'gratis' | 'contador_paga_agora' | 'cliente_paga_depois'
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [erroLocal, setErroLocal] = useState(null);

  useEffect(() => {
    Promise.all([listarPlanos(), listarPlanosRevendaCreditos(contadorId), obterStatusPagbankConta(contadorId)])
      .then(([listaPlanos, listaRevenda, status]) => {
        setPlanos(listaPlanos.filter((p) => p.ativo));
        setPlanosRevenda(listaRevenda.filter((p) => p.ativo));
        setStatusPagbank(status);
      })
      .catch((e) => setErroLocal(e.message));
  }, [contadorId]);

  if (erroLocal) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erroLocal}</p>;
  if (!planos || !statusPagbank) return <p className="text-sm text-gray-500">Carregando planos...</p>;

  const revendaDoPlano = planoId ? planosRevenda.find((r) => r.planoId === planoId) : null;
  const podeCobrar = Boolean(revendaDoPlano && statusPagbank.temContaCadastrada && statusPagbank.splitHabilitado);

  function validar() {
    if (!planoId) return 'Escolha um plano.';
    if (!clienteNome || !clienteEmail) return 'Informe o nome e o e-mail do cliente.';
    return null;
  }

  function aoClicarGratis() {
    const mensagem = validar();
    if (mensagem) {
      setErroLocal(mensagem);
      return;
    }
    setErroLocal(null);
    onSubmeter({ planoId, cobranca: 'gratis', clienteNome, clienteEmail });
  }

  function aoConfirmarCheckout(dadosPagamento) {
    const mensagem = validar();
    if (mensagem) {
      setErroLocal(mensagem);
      return;
    }
    setErroLocal(null);
    onSubmeter({
      planoId,
      cobranca,
      metodo: dadosPagamento.metodo,
      cardEncrypted: dadosPagamento.cardEncrypted,
      installments: dadosPagamento.installments,
      clienteNome,
      clienteEmail,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Plano *</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {planos.map((p) => {
            const revenda = planosRevenda.find((r) => r.planoId === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanoId(p.id)}
                className={`rounded-md border p-2.5 text-left text-sm ${planoId === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <p className="font-medium text-gray-900">{p.nome}</p>
                <p className="text-xs text-gray-500">
                  {revenda ? `${formatarMoeda(revenda.valorVenda)}/${p.periodicidade === 'mensal' ? 'mês' : 'ano'}` : 'Sem preço de revenda cadastrado'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nome do cliente *</label>
        <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">E-mail do cliente *</label>
        <input
          type="email"
          value={clienteEmail}
          onChange={(e) => setClienteEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">Vai receber um convite pra criar a própria senha e acessar a conta.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Cobrança</label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={cobranca === 'gratis'} onChange={() => setCobranca('gratis')} />
            Ativar sem cobrar
          </label>
          <label className={`flex items-center gap-2 text-sm ${podeCobrar ? '' : 'text-gray-400'}`}>
            <input type="radio" disabled={!podeCobrar} checked={cobranca === 'contador_paga_agora'} onChange={() => setCobranca('contador_paga_agora')} />
            Eu pago agora
          </label>
          <label className={`flex items-center gap-2 text-sm ${podeCobrar ? '' : 'text-gray-400'}`}>
            <input type="radio" disabled={!podeCobrar} checked={cobranca === 'cliente_paga_depois'} onChange={() => setCobranca('cliente_paga_depois')} />
            Mandar o cliente pagar depois
          </label>
          {!podeCobrar && planoId && (
            <p className="text-xs text-amber-600">
              {!statusPagbank.temContaCadastrada
                ? 'Cadastre sua conta PagBank antes de poder cobrar com esse plano.'
                : 'Cadastre um preço de revenda pra esse plano antes de poder cobrar.'}
            </p>
          )}
        </div>
      </div>

      {erroLocal && <p className="text-xs text-red-600">{erroLocal}</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {cobranca === 'gratis' ? (
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onVoltar} className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Voltar
          </button>
          <button
            type="button"
            onClick={aoClicarGratis}
            disabled={enviando}
            className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {enviando ? 'Cadastrando...' : 'Cadastrar empresa'}
          </button>
        </div>
      ) : (
        <FormularioCheckoutPagbank
          enviando={enviando}
          emailFixo={clienteEmail || null}
          somentePix={cobranca === 'cliente_paga_depois'}
          onCancelar={onVoltar}
          onConfirmar={aoConfirmarCheckout}
          rotuloConfirmarPix={cobranca === 'contador_paga_agora' ? 'Gerar PIX e cadastrar' : 'Cadastrar e mandar PIX pro cliente'}
          rotuloConfirmarCartao="Pagar e cadastrar"
        />
      )}
    </div>
  );
}
