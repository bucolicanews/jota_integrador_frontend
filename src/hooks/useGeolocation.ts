import { useState } from 'react';

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

interface EstadoGeolocalizacao {
  coordenadas: Coordenadas | null;
  obtendo: boolean;
  erro: string | null;
}

/** navigator.geolocation direto, sem lib -- alta precisão, 20s de timeout (mesmo critério do jotaCaixa). Sem GPS/permissão negada, quem chama cai pro fallback de input manual. */
export function useGeolocation() {
  const [estado, setEstado] = useState<EstadoGeolocalizacao>({ coordenadas: null, obtendo: false, erro: null });

  function obterLocalizacao(): Promise<Coordenadas | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setEstado({ coordenadas: null, obtendo: false, erro: 'Geolocalização não suportada neste navegador.' });
        resolve(null);
        return;
      }
      setEstado((s) => ({ ...s, obtendo: true, erro: null }));
      navigator.geolocation.getCurrentPosition(
        (posicao) => {
          const coordenadas = { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
          setEstado({ coordenadas, obtendo: false, erro: null });
          resolve(coordenadas);
        },
        (erro) => {
          setEstado({ coordenadas: null, obtendo: false, erro: erro.message || 'Não foi possível obter a localização.' });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 20000 },
      );
    });
  }

  function definirManual(coordenadas: Coordenadas) {
    setEstado({ coordenadas, obtendo: false, erro: null });
  }

  return { ...estado, obterLocalizacao, definirManual };
}
