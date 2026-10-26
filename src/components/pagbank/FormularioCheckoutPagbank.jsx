import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { obterChavePublicaCartao } from '../../servicos/pagbank';

const URL_SDK_PAGBANK = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';

// Carrega o SDK JS da PagBank uma única vez, mesmo com vários formulários desse tipo
// montados ao mesmo tempo na página -- cacheia a Promise em vez do script tag (evita
// corrida de duas chamadas disparando o load juntas).
let promessaSdk = null;
function carregarSdkPagbank() {
  if (window.PagSeguro) return Promise.resolve();
  if (promessaSdk) return promessaSdk;
  promessaSdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = URL_SDK_PAGBANK;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      promessaSdk = null;
      reject(new Error('Não foi possível carregar o SDK da PagBank -- verifique sua conexão.'));
    };
    document.body.appendChild(script);
  });
  return promessaSdk;
}

/**
 * Checkout PagBank reutilizável (PIX ou cartão) -- substitui o formulário "só e-mail"
 * repetido em CardMinhaAssinatura/CardComprarCreditosAvulsos/FormularioCobrarPix. Quem usa
 * passa só `onConfirmar({ metodo, customerEmail, cardEncrypted?, installments? })`; cartão
 * nunca sai do navegador em texto puro -- criptografado aqui com PagSeguro.encryptCard()
 * antes de chamar onConfirmar (regra de segurança do projeto, ver docs/SEGURANCA.md).
 *
 * `resultado`/`erro` são exibidos por este componente quando informados -- quem usa só
 * precisa guardar o retorno de `onConfirmar` e passar de volta (mesmo padrão de estado
 * que já existia em cada card, só que centralizado aqui).
 */
export default function FormularioCheckoutPagbank({
  onConfirmar,
  onCancelar,
  enviando = false,
  resultado = null,
  erro = null,
  rotuloConfirmarPix = 'Gerar PIX',
  rotuloConfirmarCartao = 'Pagar com cartão',
  // Quando quem usa já coletou o e-mail em outro campo da própria tela (ex: modal de
  // cadastro de empresa, que usa o e-mail também pra criar o login do cliente) -- evita
  // pedir duas vezes a mesma coisa.
  emailFixo = null,
  // Esconde o toggle e força PIX -- caso de "vou mandar outra pessoa pagar depois" (ex:
  // cadastro de empresa com "cliente paga depois"), onde quem preenche este formulário
  // nunca tem o cartão de quem vai pagar pra digitar aqui.
  somentePix = false,
}) {
  const [metodo, setMetodo] = useState('pix');
  const [sdkPronto, setSdkPronto] = useState(Boolean(window.PagSeguro));
  const [erroSdk, setErroSdk] = useState(null);
  const [criptografando, setCriptografando] = useState(false);
  const [erroCartao, setErroCartao] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { customerEmail: '', numero: '', validade: '', cvv: '', titular: '', installments: 1 },
  });

  useEffect(() => {
    if (metodo !== 'cartao' || sdkPronto) return;
    carregarSdkPagbank()
      .then(() => setSdkPronto(true))
      .catch((e) => setErroSdk(e.message));
  }, [metodo, sdkPronto]);

  async function aoSubmeter(dados) {
    setErroCartao(null);
    const customerEmail = emailFixo ?? dados.customerEmail;

    if (metodo === 'pix') {
      onConfirmar({ metodo: 'pix', customerEmail });
      return;
    }

    const [mesValidade, anoValidade] = (dados.validade ?? '').split('/').map((v) => v.trim());
    if (!mesValidade || !anoValidade) {
      setErroCartao('Validade inválida -- use o formato MM/AA.');
      return;
    }

    setCriptografando(true);
    try {
      const { publicKey } = await obterChavePublicaCartao();
      const resultadoCripto = window.PagSeguro.encryptCard({
        publicKey,
        holder: dados.titular,
        number: dados.numero.replace(/\s/g, ''),
        expMonth: mesValidade,
        expYear: anoValidade.length === 2 ? `20${anoValidade}` : anoValidade,
        securityCode: dados.cvv,
      });

      if (resultadoCripto.hasErrors) {
        setErroCartao(resultadoCripto.errors?.[0]?.message ?? 'Dados do cartão inválidos.');
        return;
      }

      onConfirmar({
        metodo: 'cartao',
        customerEmail,
        cardEncrypted: resultadoCripto.encryptedCard,
        installments: Number(dados.installments) || 1,
      });
    } catch (e) {
      setErroCartao(e.message ?? 'Não foi possível criptografar o cartão.');
    } finally {
      setCriptografando(false);
    }
  }

  if (resultado) {
    return (
      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-center">
        {resultado.pixCode ? (
          <>
            <p className="mb-2 text-xs font-medium text-blue-800">PIX gerado -- pague pra liberar o acesso:</p>
            {resultado.pixQrUrl && <img src={resultado.pixQrUrl} alt="QR Code PIX" className="mx-auto mb-2 h-32 w-32" />}
            <textarea
              readOnly
              value={resultado.pixCode}
              onClick={(e) => e.target.select()}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs"
              rows={3}
            />
            <p className="mt-2 text-xs text-blue-700">Liberado automaticamente assim que o pagamento for confirmado.</p>
          </>
        ) : (
          <p className="text-sm font-medium text-blue-800">Pagamento com cartão aprovado -- acesso liberado.</p>
        )}
      </div>
    );
  }

  const enviandoTudo = enviando || criptografando;

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      {!somentePix && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMetodo('pix')}
            className={`rounded-md px-3 py-1 text-xs font-medium ${metodo === 'pix' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            PIX
          </button>
          <button
            type="button"
            onClick={() => setMetodo('cartao')}
            className={`rounded-md px-3 py-1 text-xs font-medium ${metodo === 'cartao' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
          >
            Cartão de crédito
          </button>
        </div>
      )}

      {!emailFixo && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">E-mail do pagador</label>
          <input
            type="email"
            {...register('customerEmail', { required: true })}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
          {errors.customerEmail && <p className="text-xs text-red-600">Obrigatório</p>}
        </div>
      )}

      {metodo === 'cartao' && (
        <div className="space-y-2 border-t border-gray-200 pt-2">
          {erroSdk && <p className="text-xs text-red-600">{erroSdk}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Nome impresso no cartão</label>
            <input {...register('titular', { required: true })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Número do cartão</label>
            <input
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              {...register('numero', { required: true, minLength: 13 })}
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">Validade (MM/AA)</label>
              <input placeholder="MM/AA" {...register('validade', { required: true })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-700">CVV</label>
              <input inputMode="numeric" {...register('cvv', { required: true, minLength: 3, maxLength: 4 })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-gray-700">Parcelas</label>
              <select {...register('installments')} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
          </div>
          {erroCartao && <p className="text-xs text-red-600">{erroCartao}</p>}
        </div>
      )}

      {erro && <p className="text-xs text-red-600">{erro}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={enviandoTudo || (metodo === 'cartao' && !sdkPronto)}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {criptografando ? 'Criptografando...' : enviando ? 'Processando...' : metodo === 'pix' ? rotuloConfirmarPix : rotuloConfirmarCartao}
        </button>
        <button type="button" onClick={onCancelar} className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
          Cancelar
        </button>
      </div>
    </form>
  );
}
