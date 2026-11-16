import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { showError } from '../../utils/toast';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onReset: () => void;
  capturedFile: File | null;
}

/** Captura de selfie via getUserMedia (preview em vídeo + canvas), mesmo padrão já validado
 * em produção no jotaCaixa -- não depende de `<input type=file capture>`, que varia (abre
 * câmera, abre galeria, ou só o picker normal) conforme navegador/SO/ter câmera ou não.
 * Aqui o estado é explícito: botão "Ativar Câmera" -> preview ao vivo -> "Capturar Selfie". */
export default function CameraCapture({ onCapture, onReset, capturedFile }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraLigada, setCameraLigada] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const pararCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraLigada(false);
    }
  }, [stream]);

  useEffect(() => pararCamera, [pararCamera]);

  async function ativarCamera() {
    if (cameraLigada || carregando) return;
    setCarregando(true);
    setMensagemErro(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCarregando(false);
          setCameraLigada(true);
        };
      }
      setStream(mediaStream);
    } catch (erro: any) {
      let mensagem = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
      if (erro.name === 'NotAllowedError') mensagem = 'Acesso à câmera foi negado.';
      else if (erro.name === 'NotFoundError') mensagem = 'Nenhuma câmera foi encontrada neste dispositivo.';
      setMensagemErro(mensagem);
      showError(mensagem);
      setCarregando(false);
    }
  }

  function capturarSelfie() {
    if (!videoRef.current || !canvasRef.current || !cameraLigada) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) return;

    // Espelha horizontalmente -- senão a selfie sai invertida (como vídeo de webcam cru).
    contexto.translate(canvas.width, 0);
    contexto.scale(-1, 1);
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showError('Falha ao criar o arquivo da selfie.');
          return;
        }
        const arquivo = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(arquivo);
        pararCamera();
      },
      'image/jpeg',
      0.9,
    );
  }

  function refazer() {
    onReset();
    pararCamera();
    setMensagemErro(null);
  }

  if (capturedFile) {
    return (
      <div className="space-y-3">
        <div className="relative aspect-video w-full overflow-hidden rounded-md border-2 border-green-500">
          <img src={URL.createObjectURL(capturedFile)} alt="Selfie capturada" className="h-full w-full object-cover" />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center text-sm text-green-600">
            <CheckCircle2 className="mr-1 h-4 w-4" /> Selfie capturada
          </span>
          <Button variant="outline" size="sm" onClick={refazer}>
            <RotateCcw className="mr-2 h-4 w-4" /> Refazer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-2">
      <CardContent className="space-y-3 p-0">
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-gray-900">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            playsInline
            muted
            style={{ display: cameraLigada ? 'block' : 'none' }}
          />
          {!cameraLigada && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white/50">
              {carregando ? (
                <>
                  <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                  <span>Iniciando câmera...</span>
                </>
              ) : mensagemErro ? (
                <>
                  <span>{mensagemErro}</span>
                  <Button onClick={ativarCamera} variant="secondary" className="mt-4">
                    Tentar novamente
                  </Button>
                </>
              ) : (
                <span>Clique em "Ativar Câmera"</span>
              )}
            </div>
          )}
        </div>

        {cameraLigada ? (
          <Button onClick={capturarSelfie} className="w-full" disabled={carregando}>
            <Camera className="mr-2 h-4 w-4" /> Capturar Selfie
          </Button>
        ) : (
          <Button onClick={ativarCamera} className="w-full" disabled={carregando}>
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            Ativar Câmera
          </Button>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </CardContent>
    </Card>
  );
}
