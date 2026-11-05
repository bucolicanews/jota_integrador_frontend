import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { atualizarPagbankContaEmpresa } from '../../servicos/empresas';
import { listarBancos } from '../../servicos/bancos';

/**
 * Conta PagBank PRÓPRIA da empresa (contador, empresa-cliente ou a interna_plataforma
 * do admin) -- recebe a parte "seller" de qualquer link de pagamento com split gerado
 * em nome dela (parcela de Contas a Receber). Sem isso cadastrado, "Gerar link de
 * pagamento" fica bloqueado no backend.
 */
export default function CardContaPagbankEmpresa({ empresa, aoAtualizar }) {
  const [bancos, setBancos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSalvo, setMensagemSalvo] = useState(null);
  const [erro, setErro] = useState(null);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm({
    defaultValues: {
      pagbankAccountId: empresa.pagbankAccountId ?? '',
      bancoPagbankId: empresa.bancoPagbankId ?? '',
    },
  });

  useEffect(() => {
    listarBancos(empresa.id, true)
      .then(setBancos)
      .catch((erroRequisicao) => setErro(erroRequisicao.message));
  }, [empresa.id]);

  useEffect(() => {
    reset({ pagbankAccountId: empresa.pagbankAccountId ?? '', bancoPagbankId: empresa.bancoPagbankId ?? '' });
  }, [empresa.pagbankAccountId, empresa.bancoPagbankId, reset]);

  async function aoSalvar(dados) {
    setSalvando(true);
    setMensagemSalvo(null);
    try {
      await atualizarPagbankContaEmpresa(empresa.id, {
        pagbankAccountId: dados.pagbankAccountId.trim() || null,
        bancoPagbankId: dados.bancoPagbankId || null,
      });
      setMensagemSalvo('Dados salvos.');
      aoAtualizar?.();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-1 text-sm font-semibold text-gray-900">Conta PagBank</h2>
      <p className="mb-3 text-xs text-gray-500">
        Recebe automaticamente a parte que cabe a esta empresa quando um cliente paga um link de pagamento (contrato
        / conta a receber) -- a comissão da plataforma é descontada antes, no próprio split.
      </p>

      {erro && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      <form onSubmit={handleSubmit(aoSalvar)} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">ID da conta PagBank</label>
          <input
            placeholder="Encontrado no painel da própria PagBank"
            {...register('pagbankAccountId')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Banco padrão de recebimento</label>
          <select {...register('bancoPagbankId')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Selecione...</option>
            {bancos.map((banco) => (
              <option key={banco.id} value={banco.id}>
                {banco.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Pra onde lança o recebimento automático quando um link de pagamento confirma -- cadastre em "Bancos" se a
            lista estiver vazia.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={salvando || !isDirty}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          {mensagemSalvo && <span className="text-sm text-green-700">{mensagemSalvo}</span>}
        </div>
      </form>
    </div>
  );
}
