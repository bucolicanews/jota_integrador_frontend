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

function salvarPersistida(usuarioId, empresa) {
  try {
    localStorage.setItem(CHAVE_LOCAL_STORAGE, JSON.stringify({ usuarioId, empresa }));
  } catch {
    // localStorage indisponível (modo privado etc.) -- segue só em memória.
  }
}

const bruto = carregarPersistida();

const estadoInicial = {
  // Só é relevante pra papéis de contador (CONTADOR_DONO/OPERADOR_CONTADOR) e plataforma,
  // que resolvem empresaId dinamicamente -- papéis de empresa já têm empresaId fixo vindo
  // do JWT (usuario.empresaId), não usam isto.
  //
  // `usuarioId` junto do valor persistido -- sem isso, um segundo usuário logando no MESMO
  // navegador (outro contador, ou o admin) herdava a empresa selecionada pelo usuário
  // anterior (bug real: admin aparecia com o saldo de crédito da empresa que o último
  // contador tinha selecionado). Validado/limpo em useEmpresaAtiva a cada troca de usuário.
  empresa: bruto?.empresa ?? null,
  usuarioId: bruto?.usuarioId ?? null,
};

const empresaAtivaSlice = createSlice({
  name: 'empresaAtiva',
  initialState: estadoInicial,
  reducers: {
    definirEmpresaAtiva(state, action) {
      const { usuarioId, empresa } = action.payload;
      state.empresa = empresa;
      state.usuarioId = usuarioId;
      salvarPersistida(usuarioId, empresa);
    },
    limparEmpresaAtiva(state) {
      state.empresa = null;
      state.usuarioId = null;
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
