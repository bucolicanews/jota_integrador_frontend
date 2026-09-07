import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../../servicos/api';
import { supabase } from '../../servicos/supabase';
import { limparUsuario } from '../../store/autenticacaoSlice';

export default function Contabil() {
  const dispatch = useDispatch();
  const [contador, setContador] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const dadosContador = await api.get('/contadores/me');
        setContador(dadosContador);
        const dadosSaldo = await api.get(`/contadores/${dadosContador.id}/creditos/saldo`);
        setSaldo(dadosSaldo.saldo);
      } catch (erroRequisicao) {
        setErro(erroRequisicao.message);
      }
    }
    carregar();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    dispatch(limparUsuario());
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">JOTA CONTÁBIL</h1>
        <button onClick={sair} className="text-sm text-gray-500 hover:text-gray-700">
          Sair
        </button>
      </header>

      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Erro ao carregar: {erro}</p>}

      {contador && (
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-500">Escritório</p>
          <p className="mb-4 text-xl font-semibold text-gray-900">{contador.nome}</p>

          <p className="text-sm text-gray-500">Créditos disponíveis</p>
          <p className="text-2xl font-bold text-blue-600">{saldo ?? '...'}</p>
        </div>
      )}
    </div>
  );
}
