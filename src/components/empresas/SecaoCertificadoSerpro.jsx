import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { cadastrarOuRotacionarCertificado, listarCertificados, revogarCertificado, testarCertificado } from '../../servicos/acessoSerpro';
import { diasRestantesCertificado, statusExpiracaoCertificado } from '../../utils/certificadoExpiracao';

function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

const STATUS_CERTIFICADO = {
  ativo: { rotulo: 'Ativo', cor: 'bg-green-50 text-green-700', icone: '🟢' },
  expirado: { rotulo: 'Expirado', cor: 'bg-orange-50 text-orange-700', icone: '🟠' },
  revogado: { rotulo: 'Revogado', cor: 'bg-red-50 text-red-700', icone: '🔴' },
  substituido: { rotulo: 'Substituído', cor: 'bg-gray-100 text-gray-600', icone: '⚪' },
};

function FormularioCertificado({ empresaId, temAtivo, aoConcluir, aoCancelar }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError, clearErrors } = useForm({
    defaultValues: { tipo: 'A1' },
  });
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null); // { ok: boolean, mensagem, titular?, validadeFim?, assinaturaTestada }
  const arquivoWatch = watch('arquivo');
  const senhaWatch = watch('senha');

  // Qualquer troca no arquivo ou senha invalida o teste anterior -- nunca deixar
  // cadastrar com um teste que não corresponde mais ao par arquivo+senha atual.
  const assinaturaAtual = `${arquivoWatch?.[0]?.name ?? ''}|${arquivoWatch?.[0]?.size ?? ''}|${senhaWatch ?? ''}`;
  const testeAtual = resultadoTeste?.assinaturaTestada === assinaturaAtual ? resultadoTeste : null;
  // Certificado de outra empresa nunca habilita o cadastro, mesmo com senha certa.
  const testeValidoPraAtual = testeAtual?.ok && !testeAtual.cnpjDivergente;

  async function aoTestar() {
    const arquivo = arquivoWatch?.[0];
    const tipo = watch('tipo');
    const senha = senhaWatch;
    if (!arquivo) {
      setError('arquivo', { message: 'Selecione o arquivo do certificado' });
      return;
    }
    if (!senha) {
      setError('senha', { message: 'Obrigatório' });
      return;
    }
    clearErrors(['arquivo', 'senha']);
    setTestando(true);
    setResultadoTeste(null);
    try {
      const resultado = await testarCertificado(empresaId, { arquivo, tipo, senha });
      setResultadoTeste({ ok: true, ...resultado, assinaturaTestada: assinaturaAtual });
    } catch (erro) {
      setResultadoTeste({ ok: false, mensagem: erro.message ?? 'Não foi possível validar o certificado' });
    } finally {
      setTestando(false);
    }
  }

  async function aoSubmeter(dados) {
    const arquivo = dados.arquivo?.[0];
    if (!arquivo || !testeValidoPraAtual) return; // botão fica desabilitado nesse caso, defesa extra
    try {
      await cadastrarOuRotacionarCertificado(empresaId, { arquivo, tipo: dados.tipo, senha: dados.senha });
      aoConcluir();
    } catch (erro) {
      setError('root', { message: erro.message ?? 'Não foi possível cadastrar o certificado' });
    }
  }

  return (
    <form onSubmit={handleSubmit(aoSubmeter)} className="space-y-3 border-t border-gray-100 pt-4">
      <p className="text-xs text-gray-500">
        {temAtivo
          ? 'Cadastrar aqui substitui o certificado atual (rotação) -- o antigo fica marcado como substituído, nunca apagado.'
          : 'O arquivo é cifrado antes de ser armazenado -- nunca fica acessível em texto claro, nem pra nós.'}
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
        <select {...register('tipo')} className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="A1">A1 (arquivo)</option>
          <option value="A3" disabled>
            A3 (token/hardware) — indisponível ainda
          </option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Arquivo (.pfx / .p12) *</label>
        <input type="file" accept=".pfx,.p12" {...register('arquivo')} className="w-full text-sm" />
        {errors.arquivo && <p className="mt-1 text-xs text-red-600">{errors.arquivo.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Senha do certificado *</label>
        <input
          type="password"
          {...register('senha', { required: 'Obrigatório' })}
          className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha.message}</p>}
      </div>

      <div>
        <button
          type="button"
          onClick={aoTestar}
          disabled={testando}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {testando ? 'Testando...' : 'Testar certificado'}
        </button>

        {testeAtual?.ok && testeAtual.cnpjDivergente && (
          <p className="mt-2 text-sm font-medium text-red-600">
            ⚠️ O CNPJ deste certificado ({testeAtual.cnpjCertificado}) não é o CNPJ desta empresa -- confirme se este é o certificado
            correto antes de cadastrar.
          </p>
        )}
        {testeAtual?.ok && !testeAtual.cnpjDivergente && (
          <p className="mt-2 text-sm text-green-700">
            ✅ Certificado válido{testeAtual.titular ? ` — ${testeAtual.titular}` : ''} — válido até {formatarData(testeAtual.validadeFim)}
          </p>
        )}
        {resultadoTeste?.ok === false && <p className="mt-2 text-sm text-red-600">❌ {resultadoTeste.mensagem}</p>}
        {resultadoTeste?.ok && !testeAtual && (
          <p className="mt-2 text-xs text-amber-600">Arquivo ou senha mudaram -- teste novamente antes de cadastrar.</p>
        )}
      </div>

      {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !testeValidoPraAtual}
          title={!testeValidoPraAtual ? 'Teste o certificado antes de cadastrar' : undefined}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : temAtivo ? 'Rotacionar certificado' : 'Cadastrar certificado'}
        </button>
      </div>
    </form>
  );
}

/** Upload/rotação/revogação de certificado digital (Modo B) -- usada tanto na tela dedicada de acesso SERPRO quanto inline no detalhe da empresa quando `modoAcessoSerpro === 'certificado_proprio'`. */
export default function SecaoCertificadoSerpro({ empresaId }) {
  const [certificados, setCertificados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [revogando, setRevogando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await listarCertificados(empresaId);
      setCertificados(dados);
      setErro(null);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function aoRevogar() {
    if (!window.confirm('Revogar o certificado ativo? A empresa ficará sem acesso ao SERPRO até um novo ser cadastrado.')) return;
    setRevogando(true);
    try {
      await revogarCertificado(empresaId);
      await carregar();
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setRevogando(false);
    }
  }

  if (carregando) return <p className="text-sm text-gray-500">Carregando...</p>;

  const ativo = certificados.find((c) => c.status === 'ativo');
  const historico = certificados.filter((c) => c.status !== 'ativo');
  const expiracao = ativo ? statusExpiracaoCertificado(ativo.validadeFim) : null;
  const diasRestantes = ativo ? diasRestantesCertificado(ativo.validadeFim) : null;

  const BANNER_EXPIRACAO = {
    ok: { cor: 'bg-green-50 text-green-700', icone: '🟢', rotulo: 'Ativo' },
    proximo: { cor: 'bg-orange-50 text-orange-700', icone: '🟠', rotulo: 'Vence em breve' },
    vencido: { cor: 'bg-red-50 text-red-700', icone: '🔴', rotulo: 'Vencido' },
  };

  return (
    <div>
      {erro && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      {ativo ? (
        <div className="mb-4 flex items-center justify-between rounded-md border border-gray-200 p-4">
          <div>
            <span
              className={`mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${BANNER_EXPIRACAO[expiracao].cor}`}
            >
              {BANNER_EXPIRACAO[expiracao].icone} {BANNER_EXPIRACAO[expiracao].rotulo}
            </span>
            {expiracao === 'vencido' && (
              <p className="mt-1 text-sm font-medium text-red-700">
                Venceu em {formatarData(ativo.validadeFim)} — a empresa está sem acesso ao SERPRO até cadastrar um novo certificado.
              </p>
            )}
            {expiracao === 'proximo' && (
              <p className="mt-1 text-sm font-medium text-orange-700">
                Vence em {diasRestantes} dia{diasRestantes === 1 ? '' : 's'} ({formatarData(ativo.validadeFim)}) — oriente a empresa a
                providenciar a renovação.
              </p>
            )}
            <p className="mt-1 text-sm text-gray-600">
              Tipo {ativo.tipo} · Válido até {formatarData(ativo.validadeFim)}
            </p>
          </div>
          <button
            onClick={aoRevogar}
            disabled={revogando}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {revogando ? 'Revogando...' : 'Revogar'}
          </button>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-600">Nenhum certificado ativo cadastrado — as consultas ao SERPRO ficam bloqueadas até haver um.</p>
      )}

      {!mostrarForm && (
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {ativo ? 'Rotacionar certificado' : '+ Cadastrar certificado'}
        </button>
      )}

      {mostrarForm && (
        <FormularioCertificado
          empresaId={empresaId}
          temAtivo={!!ativo}
          aoConcluir={() => {
            setMostrarForm(false);
            carregar();
          }}
          aoCancelar={() => setMostrarForm(false)}
        />
      )}

      {historico.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Histórico</h3>
          <ul className="space-y-1.5 text-sm text-gray-600">
            {historico.map((cert) => {
              const info = STATUS_CERTIFICADO[cert.status];
              return (
                <li key={cert.id} className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${info.cor}`}>
                    {info.icone} {info.rotulo}
                  </span>
                  <span>
                    {cert.tipo} · cadastrado em {formatarData(cert.criadoEm)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
