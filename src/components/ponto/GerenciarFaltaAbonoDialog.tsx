import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { excluirRegistro, lancarFaltaOuAbono, obterUrlAtestado } from '../../servicos/pontoEletronico';
import { showError, showSuccess } from '../../utils/toast';

const JORNADA_DIARIA_PADRAO_HORAS = 8;
const PRESETS_ABONO = ['8', '6', '4', '2'];

type Acao = 'falta' | 'abono';
type Decisao = 'total' | 'parcial' | null;

interface RegistroExistente {
  id: string;
  minutosCredito: number | null;
  atestadoStorageRef: string | null;
  observacao: string | null;
}

interface GerenciarFaltaAbonoDialogProps {
  funcionarioId: string;
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
  /** Lançamento(s) já existente(s) nesse dia -- presente = modo edição (ver detecção abaixo). */
  registrosExistentes?: { falta?: RegistroExistente; abono?: RegistroExistente } | null;
  /** Trava o campo Data quando o diálogo abre a partir de um dia específico da folha. */
  dataFixa?: string;
}

/** Mesma semântica do jotaCaixa: Falta sem atestado = injustificada (8h); Falta + atestado
 * exige decisão Total (8h abonada) ou Parcial (faltas+abono somam 8h); Abono Manual é
 * independente, qualquer preset até 8h, sem precisar de falta nenhuma no dia. */
export default function GerenciarFaltaAbonoDialog({
  funcionarioId,
  open,
  onOpenChange,
  onSalvo,
  registrosExistentes,
  dataFixa,
}: GerenciarFaltaAbonoDialogProps) {
  const isEditing = !!(registrosExistentes?.falta || registrosExistentes?.abono);

  const [data, setData] = useState(dataFixa ?? new Date().toISOString().slice(0, 10));
  const [acao, setAcao] = useState<Acao>('falta');
  const [horasAbonoPreset, setHorasAbonoPreset] = useState('8');
  const [atestadoFile, setAtestadoFile] = useState<File | null>(null);
  const [atestadoRefExistente, setAtestadoRefExistente] = useState<string | null>(null);
  const [abonoDecisao, setAbonoDecisao] = useState<Decisao>(null);
  const [horasFaltaParcial, setHorasFaltaParcial] = useState(4);
  const [horasAbonoParcial, setHorasAbonoParcial] = useState(4);
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [abrindoAtestado, setAbrindoAtestado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setData(dataFixa ?? new Date().toISOString().slice(0, 10));
    setAtestadoFile(null);
    setErro(null);

    const falta = registrosExistentes?.falta;
    const abono = registrosExistentes?.abono;

    if (falta && abono) {
      // Falta Parcial Abonada -- os 2 registros juntos.
      const horasAbono = Math.round((abono.minutosCredito ?? 0) / 60);
      setAcao('falta');
      setAtestadoRefExistente(falta.atestadoStorageRef ?? abono.atestadoStorageRef ?? null);
      setAbonoDecisao('parcial');
      setHorasAbonoParcial(horasAbono);
      setHorasFaltaParcial(JORNADA_DIARIA_PADRAO_HORAS - horasAbono);
      setObservacao(falta.observacao ?? abono.observacao ?? '');
    } else if (abono) {
      // Abono Manual sozinho, ou Falta Total Abonada (abono de 8h com atestado).
      const horas = Math.round((abono.minutosCredito ?? 0) / 60);
      if (abono.atestadoStorageRef) {
        setAcao('falta');
        setAtestadoRefExistente(abono.atestadoStorageRef);
        setAbonoDecisao('total');
      } else {
        setAcao('abono');
        setAtestadoRefExistente(null);
        setHorasAbonoPreset(String(horas));
      }
      setObservacao(abono.observacao ?? '');
    } else if (falta) {
      setAcao('falta');
      setAtestadoRefExistente(falta.atestadoStorageRef ?? null);
      setAbonoDecisao(null);
      setObservacao(falta.observacao ?? '');
    } else {
      setAcao('falta');
      setAtestadoRefExistente(null);
      setAbonoDecisao(null);
      setHorasAbonoPreset('8');
      setHorasFaltaParcial(4);
      setHorasAbonoParcial(4);
      setObservacao('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataFixa, registrosExistentes]);

  const isFalta = acao === 'falta';
  const isAbono = acao === 'abono';
  const temAtestado = !!atestadoFile || !!atestadoRefExistente;
  const isJustificada = isFalta && temAtestado;
  const decisaoFeita = !isJustificada || !!abonoDecisao;
  const somaParcial = horasFaltaParcial + horasAbonoParcial;

  function aoEscolherAtestado(arquivo: File | null) {
    setAtestadoFile(arquivo);
    if (arquivo) setAtestadoRefExistente(null);
    setAbonoDecisao(null);
  }

  function removerAtestado() {
    setAtestadoFile(null);
    setAtestadoRefExistente(null);
    setAbonoDecisao(null);
  }

  async function visualizarAtestado() {
    const idRegistro = registrosExistentes?.falta?.id ?? registrosExistentes?.abono?.id;
    if (!idRegistro) return;
    setAbrindoAtestado(true);
    try {
      const resposta = await obterUrlAtestado(idRegistro);
      window.open(resposta.url, '_blank');
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível abrir o atestado');
    } finally {
      setAbrindoAtestado(false);
    }
  }

  function escolherDecisao(decisao: Decisao) {
    setAbonoDecisao(decisao);
    if (decisao === 'total') {
      setObservacao('Falta Total Abonada (8h)');
    } else if (decisao === 'parcial') {
      setHorasFaltaParcial(4);
      setHorasAbonoParcial(4);
      setObservacao('Falta Parcial Abonada. Faltas=4h, Abono=4h');
    }
  }

  function alterarHorasParcial(tipo: 'falta' | 'abono', valor: number) {
    const novoValor = Math.min(JORNADA_DIARIA_PADRAO_HORAS, Math.max(0, valor));
    const restante = JORNADA_DIARIA_PADRAO_HORAS - novoValor;
    const novaFalta = tipo === 'falta' ? novoValor : restante;
    const novoAbono = tipo === 'abono' ? novoValor : restante;
    setHorasFaltaParcial(novaFalta);
    setHorasAbonoParcial(novoAbono);
    setObservacao(`Falta Parcial Abonada. Faltas=${novaFalta}h, Abono=${novoAbono}h`);
  }

  async function excluirLancamento() {
    setExcluindo(true);
    try {
      if (registrosExistentes?.falta) await excluirRegistro(registrosExistentes.falta.id);
      if (registrosExistentes?.abono) await excluirRegistro(registrosExistentes.abono.id);
      showSuccess('Lançamento excluído.');
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      showError(e.message ?? 'Não foi possível excluir o lançamento');
    } finally {
      setExcluindo(false);
    }
  }

  async function salvar() {
    setErro(null);
    if (isJustificada && !abonoDecisao) {
      setErro('Selecione se o abono é Total ou Parcial.');
      return;
    }
    if (isJustificada && abonoDecisao === 'parcial' && somaParcial !== JORNADA_DIARIA_PADRAO_HORAS) {
      setErro(`Faltas + abono precisam somar ${JORNADA_DIARIA_PADRAO_HORAS}h (hoje soma ${somaParcial}h).`);
      return;
    }

    let horasFalta = 0;
    let horasAbono = 0;
    let observacaoFinal = observacao.trim();

    if (isAbono) {
      horasAbono = Number(horasAbonoPreset);
      observacaoFinal = observacaoFinal || `Abono de ${horasAbonoPreset}h`;
    } else if (isJustificada && abonoDecisao === 'total') {
      horasAbono = JORNADA_DIARIA_PADRAO_HORAS;
      observacaoFinal = observacaoFinal || 'Falta Total Abonada (8h)';
    } else if (isJustificada && abonoDecisao === 'parcial') {
      horasFalta = horasFaltaParcial;
      horasAbono = horasAbonoParcial;
      observacaoFinal = observacaoFinal || `Falta Parcial Abonada. Faltas=${horasFaltaParcial}h, Abono=${horasAbonoParcial}h`;
    } else {
      horasFalta = JORNADA_DIARIA_PADRAO_HORAS;
      observacaoFinal = observacaoFinal || 'Falta Injustificada';
    }

    setEnviando(true);
    try {
      if (isEditing) {
        if (registrosExistentes?.falta) await excluirRegistro(registrosExistentes.falta.id);
        if (registrosExistentes?.abono) await excluirRegistro(registrosExistentes.abono.id);
      }
      await lancarFaltaOuAbono({
        usuarioAlvoId: funcionarioId,
        data,
        horasFalta,
        horasAbono,
        atestado: atestadoFile,
        atestadoStorageRefExistente: atestadoRefExistente,
        observacao: observacaoFinal,
      });
      showSuccess(isEditing ? 'Lançamento atualizado.' : 'Lançamento registrado.');
      onSalvo();
      onOpenChange(false);
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível salvar o lançamento');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar lançamento' : 'Gerenciar Ausência'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} disabled={!!dataFixa} />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">Tipo de registro</Label>
            <RadioGroup value={acao} onValueChange={(v: Acao) => setAcao(v)} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="falta" id="acao-falta" />
                <Label htmlFor="acao-falta">Falta</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="abono" id="acao-abono" />
                <Label htmlFor="acao-abono">Abono Manual</Label>
              </div>
            </RadioGroup>
          </div>

          {isAbono && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-semibold">Horas a abonar</p>
              <RadioGroup value={horasAbonoPreset} onValueChange={setHorasAbonoPreset} className="grid grid-cols-4 gap-2">
                {PRESETS_ABONO.map((h) => (
                  <div key={h} className="flex items-center gap-1.5 rounded-md border p-2">
                    <RadioGroupItem value={h} id={`preset-${h}`} />
                    <Label htmlFor={`preset-${h}`}>{h}h</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="space-y-1.5">
                <Label>Observação (opcional)</Label>
                <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Abono por consulta médica." />
              </div>
            </div>
          )}

          {isFalta && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-semibold">Detalhes da falta</p>

              <div className="space-y-1.5">
                <Label>Anexar atestado médico (pra justificar)</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => aoEscolherAtestado(e.target.files?.[0] ?? null)} />
                {temAtestado && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="flex items-center text-green-600">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {atestadoFile ? `Novo arquivo: ${atestadoFile.name}` : 'Atestado anexado.'}
                    </span>
                    <div className="flex gap-3">
                      {atestadoRefExistente && (
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={visualizarAtestado} disabled={abrindoAtestado}>
                          {abrindoAtestado ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Eye className="mr-1 h-3.5 w-3.5" />} Visualizar
                        </Button>
                      )}
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs text-destructive" onClick={removerAtestado}>
                        <XCircle className="mr-1 h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {isJustificada && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-semibold">Abono do atestado (8h)</p>
                  <RadioGroup value={abonoDecisao ?? ''} onValueChange={(v: string) => escolherDecisao(v as Decisao)} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="total" id="decisao-total" />
                      <Label htmlFor="decisao-total">Total (8h abono)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="parcial" id="decisao-parcial" />
                      <Label htmlFor="decisao-parcial">Parcial</Label>
                    </div>
                  </RadioGroup>

                  {abonoDecisao === 'parcial' && (
                    <div className="grid grid-cols-2 gap-3 rounded-md bg-secondary/50 p-3">
                      <div className="space-y-1">
                        <Label>Horas de falta</Label>
                        <Input
                          type="number"
                          min={0}
                          max={8}
                          value={horasFaltaParcial}
                          onChange={(e) => alterarHorasParcial('falta', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Horas de abono</Label>
                        <Input
                          type="number"
                          min={0}
                          max={8}
                          value={horasAbonoParcial}
                          onChange={(e) => alterarHorasParcial('abono', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                      <p className={`col-span-2 text-sm ${somaParcial === JORNADA_DIARIA_PADRAO_HORAS ? 'text-green-600' : 'text-destructive'}`}>
                        Soma: {somaParcial}h (deve ser {JORNADA_DIARIA_PADRAO_HORAS}h)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(!isJustificada || decisaoFeita) && (
                <div className="space-y-1.5">
                  <Label>Observação (motivo da falta)</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Motivo pessoal, sem atestado."
                    disabled={isJustificada}
                  />
                </div>
              )}
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-2">
            {isEditing && (
              <Button variant="outline" className="text-destructive" onClick={excluirLancamento} disabled={enviando || excluindo}>
                {excluindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
              </Button>
            )}
            <Button onClick={salvar} disabled={enviando || excluindo || !decisaoFeita} className="flex-1">
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar edição' : 'Confirmar registro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
