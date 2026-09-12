import { useEffect, useState } from 'react';
import { useEmpresaAtiva } from './useEmpresaAtiva';
import { obterModulosLiberados } from '../servicos/modulosLicenciados';

/**
 * Módulos liberados pra empresa ativa (contratos, protocolos, bancos, etc.) -- usado pelo
 * MenuLateral pra esconder itens de módulo não licenciado. `null` enquanto carrega (nunca
 * esconde tudo por um instante); depois de carregado, sempre um array (vazio = nenhum extra).
 */
export function useModulosLicenciados() {
  const { empresaId } = useEmpresaAtiva();
  const [modulos, setModulos] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!empresaId) {
      setModulos(null);
      return;
    }
    setCarregando(true);
    obterModulosLiberados(empresaId)
      .then((resposta) => setModulos(resposta.modulos ?? []))
      .catch(() => setModulos([]))
      .finally(() => setCarregando(false));
  }, [empresaId]);

  return {
    modulos,
    carregando,
    temModulo: (modulo) => modulos == null || modulos.includes(modulo),
  };
}
