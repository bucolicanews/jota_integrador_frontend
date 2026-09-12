import { configureStore } from '@reduxjs/toolkit';
import autenticacaoReducer from './autenticacaoSlice';
import empresaAtivaReducer from './empresaAtivaSlice';

export const store = configureStore({
  reducer: {
    autenticacao: autenticacaoReducer,
    empresaAtiva: empresaAtivaReducer,
  },
});
