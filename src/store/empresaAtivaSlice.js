import { createSlice } from '@reduxjs/toolkit';

const CHAVE_LOCAL_STORAGE = 'jota:empresaAtiva';

function carregarPersistida() {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL_STORAGE);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

const estadoInicial = {
  // Só é relevante pra papéis de contador (CONTADOR_DONO/OPERADOR_CONTADOR), que têm
  // N empresas na carteira -- papéis de empresa já têm empresaId fixo vindo do JWT
  // (usuario.empresaId), não usam isto. { id, razaoSocial, cnpj } | null.
  empresa: carregarPersistida(),
};

const empresaAtivaSlice = createSlice({
  name: 'empresaAtiva',
  initialState: estadoInicial,
  reducers: {
    definirEmpresaAtiva(state, action) {
      state.empresa = action.payload;
      try {
        localStorage.setItem(CHAVE_LOCAL_STORAGE, JSON.stringify(action.payload));
      } catch {
        // localStorage indisponível (modo privado etc.) -- segue só em memória.
      }
    },
    limparEmpresaAtiva(state) {
      state.empresa = null;
      try {
        localStorage.removeItem(CHAVE_LOCAL_STORAGE);
      } catch {
        // ignora
      }
    },
  },
});

export const { definirEmpresaAtiva, limparEmpresaAtiva } = empresaAtivaSlice.actions;
export default empresaAtivaSlice.reducer;
