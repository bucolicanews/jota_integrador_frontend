import { createSlice } from '@reduxjs/toolkit';

const estadoInicial = {
  usuario: null, // { id, email, papel, contadorId, empresaId } -- vem do app_metadata do JWT
  carregando: true, // true até a primeira checagem de sessão terminar
};

const autenticacaoSlice = createSlice({
  name: 'autenticacao',
  initialState: estadoInicial,
  reducers: {
    definirUsuario(state, action) {
      state.usuario = action.payload;
      state.carregando = false;
    },
    limparUsuario(state) {
      state.usuario = null;
      state.carregando = false;
    },
  },
});

export const { definirUsuario, limparUsuario } = autenticacaoSlice.actions;
export default autenticacaoSlice.reducer;
