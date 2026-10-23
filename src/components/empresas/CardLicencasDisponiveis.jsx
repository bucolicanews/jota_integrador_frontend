import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { iniciarPagamentoAtivacaoEmpresa, listarLicencasDisponiveisParaEmpresa } from '../../servicos/licencasModulo';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);

function FormularioAtivar({ onConfirmar, onCancelar, enviando }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { customerEmail: '' } });

  return (
    <form onSubmit={handleSubmit(onConfirmar)} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-700">E-mail pra receber o PIX</label>
        <input
          type="email"
          {...register('customerEmail', { required: true })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        {errors.customerEmail && <p className="text-xs text-red-600">Obrigatório</p>}
      </div>
      <button type="submit" disabled={enviando} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {enviando ? 'Gerando PIX...' : 'Gerar PIX'}
      </button>
      <button type="button" onClick={onCancelar} className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
        Cancelar
      </button>
    </form>
  );
}

/**
 * Módulos de licença que o PRÓPRIO contador já comprou no atacado e tem plano de revenda
 * ativo -- a empresa ativa sozinha pagando (self-service), sem esperar ele clicar "ativar
 * numa empresa". Licença sem plano de revenda do contador não aparece aqui (sem preço).
 */
export default function CardLicencasDisponiveis({ empresaId }) {
  const [licencas, setLicencas] = useState(null);
  const [erro, setErro] = useState(null);
  const [licencaSelecionada, setLicencaSelecionada] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultadoPix, setResultadoPix] = useState(null);

  useEffect(() => {
    listarLicencasDisponiveisParaEmpresa(empresaId)
      .then(setLicencas)
      .catch((e) => setErro(e.message));
  }, [empresaId]);

  async function aoAtivar(dados) {
    setProcessando(true);
    try {
      const resultado = await iniciarPagamentoAtivacaoEmpresa(empresaId, licencaSelecionada.licencaId, { metodo: 'pix', customerEmail: dados.customerEmail });
      setResultadoPix(resultado);
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  if (erro) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>;
  if (!licencas) return <p className="text-sm text-gray-500">Carregando...</p>;
  if (licencas.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum módulo disponível pra ativar por conta própria no momento -- fale com seu contador.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">Módulos vendidos pelo seu contador -- ative direto aqui, sem precisar esperar ele.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {licencas.map((l) => (
          <button
            key={l.licencaId}
            onClick={() => {
              setLicencaSelecionada(l);
              setResultadoPix(null);
            }}
            className={`rounded-md border p-3 text-left ${licencaSelecionada?.licencaId === l.licencaId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <p className="text-sm font-semibold text-gray-900">{l.nome}</p>
            <p className="text-xs text-gray-500">{l.modulos.join(', ')}</p>
            <p className="mt-1 text-sm text-gray-600">{formatarMoeda(l.valorVenda)}</p>
          </button>
        ))}
      </div>

      {licencaSelecionada && !resultadoPix && (
        <FormularioAtivar enviando={processando} onCancelar={() => setLicencaSelecionada(null)} onConfirmar={aoAtivar} />
      )}

      {resultadoPix && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-center">
          <p className="mb-2 text-xs font-medium text-blue-800">PIX gerado -- pague pra ativar o módulo:</p>
          {resultadoPix.pixQrUrl && <img src={resultadoPix.pixQrUrl} alt="QR Code PIX" className="mx-auto mb-2 h-32 w-32" />}
          {resultadoPix.pixCode && (
            <textarea
              readOnly
              value={resultadoPix.pixCode}
              onClick={(e) => e.target.select()}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs"
              rows={3}
            />
          )}
          <p className="mt-2 text-xs text-blue-700">O módulo é liberado automaticamente assim que o pagamento for confirmado.</p>
        </div>
      )}
    </div>
  );
}
