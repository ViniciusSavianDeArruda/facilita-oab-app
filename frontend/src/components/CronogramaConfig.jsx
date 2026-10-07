import { ArrowLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import {
  MATERIAS_CRONO,
  gerarPlano,
  limparPlano,
  loadConfig,
  loadPlano,
  saveConfig,
  savePlano,
} from "../lib/cronograma";
import { diasAteProva, loadSettings, saveSettings } from "../lib/settings";

const LIMITE_FRACAS = 5;

// Eyebrow conforme §8 do design-system (11px, semibold, 0.14em, brass).
const EYEBROW =
  "block text-[11px] font-semibold uppercase tracking-[0.14em] text-brass";

// Escala real do slider de horas. As marcas visuais precisam ser posicionadas
// pelo percentual real do valor na escala — distribuí-las igualmente (ex.:
// justify-between) desloca "2h" do ponto onde 2h de fato está.
const HORAS_MIN = 0.5;
const HORAS_MAX = 6;
const MARCAS_HORAS = [
  { valor: 0.5, rotulo: "30 min" },
  { valor: 1, rotulo: "1h" },
  { valor: 2, rotulo: "2h" },
  { valor: 4, rotulo: "4h" },
  { valor: 6, rotulo: "6h" },
];
// Largura aproximada do thumb nativo: o centro dele percorre de
// (largura/2) até (trilha − largura/2), não de 0 a 100%.
const LARGURA_THUMB = 16;

function percentualHoras(valor) {
  return ((valor - HORAS_MIN) / (HORAS_MAX - HORAS_MIN)) * 100;
}

function formatarHoras(h) {
  const horas = Math.floor(h);
  const minutos = Math.round((h - horas) * 60);
  if (minutos === 0) return `${horas}h`;
  return `${horas}h${minutos}`;
}

function listarMaterias(lista) {
  if (lista.length === 0) return "";
  if (lista.length === 1) return lista[0];
  return `${lista.slice(0, -1).join(", ")} e ${lista[lista.length - 1]}`;
}

// Data de hoje em ISO no fuso local — `toISOString()` direto usa UTC e, à
// noite no Brasil, bloquearia o próprio dia de hoje no `min` do input.
function hojeISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export default function CronogramaConfig({ onBack, onPlanGerado }) {
  const initial = loadConfig();
  const settingsIniciais = loadSettings();
  const [dataProva, setDataProva] = useState(settingsIniciais.dataProva || "");
  const [horasPorDia, setHorasPorDia] = useState(initial.horasPorDia);
  const [fracas, setFracas] = useState(new Set(initial.materiasFracas || []));
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  const planoExistente = loadPlano();
  const dias = diasAteProva(dataProva || null);
  const minData = hojeISO();
  // Data preenchida mas sem nenhum dia à frente — estado distinto de "sem
  // data", que o painel tratava como a mesma coisa.
  const dataInvalida = dataProva !== "" && dias !== null && dias <= 0;
  const semData = dataProva === "";
  const limiteAtingido = fracas.size >= LIMITE_FRACAS;

  function toggleFraca(m) {
    const next = new Set(fracas);
    if (next.has(m)) {
      next.delete(m);
    } else {
      if (next.size >= LIMITE_FRACAS) return;
      next.add(m);
    }
    setFracas(next);
  }

  async function gerar() {
    if (pending || dataInvalida) return;
    setError(null);
    const config = {
      horasPorDia,
      materiasFracas: Array.from(fracas),
    };
    const plano = gerarPlano(dataProva || null, config);
    if (!plano) {
      setError(
        "Não foi possível gerar o plano. Verifique se a data da prova está no futuro.",
      );
      return;
    }
    if (
      planoExistente &&
      !confirm("Isso vai substituir seu plano atual. Continuar?")
    ) {
      return;
    }
    setPending(true);
    try {
      await saveConfig(config, { throwOnError: true });
      await saveSettings({ dataProva: dataProva || null }, { throwOnError: true });
      await savePlano(plano, { throwOnError: true });
      onPlanGerado();
    } catch {
      setError("Não foi possível salvar o plano. Verifique sua conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function apagar() {
    if (pending || !confirm("Apagar o plano atual? Você poderá gerar outro depois.")) return;
    setError(null);
    setPending(true);
    try {
      await limparPlano({ throwOnError: true });
      onBack();
    } catch {
      setError("Não foi possível apagar o plano. Verifique sua conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-8 md:py-8">
        <button
          type="button"
          onClick={onBack}
          className="min-h-10 px-1 text-xs text-cream-400 hover:text-cream-50 transition-[color] duration-150 ease-out mb-6 flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
        >
          <ArrowLeftIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          Voltar
        </button>

        <h1
          className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-2"
          style={{ fontVariationSettings: '"opsz" 96' }}
        >
          Como você estuda?
        </h1>
        <p className="text-cream-400 text-sm leading-relaxed mb-6 max-w-2xl">
          Três informações e o plano se molda ao seu ritmo. Você pode regenerar
          quando quiser.
        </p>

        <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:gap-10 lg:items-start">
          <div>
            {/* Data da prova */}
            <div className="mb-7">
              <label htmlFor="data-prova" className={`${EYEBROW} mb-3`}>
                Data da prova{" "}
                <span className="normal-case tracking-normal font-normal text-cream-400">
                  (opcional)
                </span>
              </label>
              <input
                id="data-prova"
                type="date"
                min={minData}
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
                aria-invalid={dataInvalida || undefined}
                aria-describedby={
                  dataInvalida ? "data-prova-erro data-prova-ajuda" : "data-prova-ajuda"
                }
                className={`w-full sm:w-auto min-h-11 bg-ink-900 border rounded-xl px-4 py-2.5 text-cream-50 transition-[border-color] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 ${
                  dataInvalida
                    ? "border-alert focus:border-alert focus-visible:ring-alert"
                    : "border-ink-800 focus:border-brass focus-visible:ring-brass"
                }`}
              />
              {dataInvalida && (
                <p
                  id="data-prova-erro"
                  role="alert"
                  className="mt-2 text-xs text-alert"
                >
                  Escolha uma data futura — o plano precisa de pelo menos um dia
                  à frente.
                </p>
              )}
              <p id="data-prova-ajuda" className="text-xs text-cream-600 mt-2">
                Sem data, o plano vira um rodízio contínuo pelas matérias — dá
                pra regenerar com a data assim que você souber.
              </p>
            </div>

            {/* Horas por dia */}
            <div className="mb-7">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <label htmlFor="horas-por-dia" className={EYEBROW}>
                  Horas por dia
                </label>
                <span
                  className="font-serif text-2xl text-brass leading-none shrink-0"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                  aria-hidden="true"
                >
                  {formatarHoras(horasPorDia)}
                </span>
              </div>
              <input
                id="horas-por-dia"
                type="range"
                min={HORAS_MIN}
                max={HORAS_MAX}
                step="0.5"
                value={horasPorDia}
                onChange={(e) => setHorasPorDia(parseFloat(e.target.value))}
                aria-valuetext={`${formatarHoras(horasPorDia)} por dia`}
                aria-describedby="marcas-horas-visuais horas-ajuda"
                className="w-full h-6 accent-brass rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
              />
              {/* Marcas posicionadas pelo percentual real de cada valor na
                  escala, com o ajuste da largura do thumb. Substituem os
                  ticks do <datalist>, que o navegador desenhava nas posições
                  certas e brigavam com os rótulos distribuídos por igual. */}
              <div id="marcas-horas-visuais" className="relative mt-1.5 h-7">
                {MARCAS_HORAS.map(({ valor, rotulo }) => {
                  const pct = percentualHoras(valor);
                  const left = `calc(${pct}% + ${((50 - pct) / 100) * LARGURA_THUMB}px)`;
                  const alinhamento =
                    pct === 0
                      ? "translate-x-0 items-start"
                      : pct === 100
                        ? "-translate-x-full items-end"
                        : "-translate-x-1/2 items-center";
                  return (
                    <span
                      key={valor}
                      style={{ left }}
                      className={`absolute top-0 flex flex-col gap-1 ${alinhamento}`}
                    >
                      <span
                        className="h-1.5 w-px bg-surface-border-button"
                        aria-hidden="true"
                      />
                      <span className="whitespace-nowrap text-[11px] text-cream-600">
                        {rotulo}
                      </span>
                    </span>
                  );
                })}
              </div>
              <p id="horas-ajuda" className="text-xs text-cream-600 mt-3">
                Média realista, não o ideal. Vale mais consistência que
                quantidade.
              </p>
            </div>

            {/* Matérias fracas */}
            <div className="mb-8">
              <p id="materias-prioritarias" className={`${EYEBROW} mb-2`}>
                Matérias em que você está mais fraca
                <span
                  className="normal-case tracking-normal text-cream-400 font-normal"
                  aria-live="polite"
                >
                  {" "}
                  · {fracas.size} de {LIMITE_FRACAS} selecionadas
                </span>
              </p>
              <p className="text-xs text-cream-600 mb-4">
                Selecione até {LIMITE_FRACAS} que precisam de mais atenção —
                receberão o dobro de frequência no plano.
              </p>
              <div
                role="group"
                aria-labelledby="materias-prioritarias"
                className="flex flex-wrap gap-2.5"
              >
                {MATERIAS_CRONO.map((m) => {
                  const selecionada = fracas.has(m);
                  // Sem `disabled`: o chip continua focável e legível, e o
                  // motivo aparece em texto logo abaixo, não só num title.
                  const indisponivel = !selecionada && limiteAtingido;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleFraca(m)}
                      aria-disabled={indisponivel || undefined}
                      aria-pressed={selecionada}
                      className={`min-h-10 text-xs px-3 py-2 rounded-full border transition-[background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 ${
                        selecionada
                          ? "border-brass bg-brass text-ink-950 font-medium"
                          : indisponivel
                            ? "border-border-subtle text-cream-400 cursor-not-allowed"
                            : "border-surface-border-button text-cream-400 hover:border-surface-border-button-hover hover:text-brass"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              {limiteAtingido && (
                <p className="mt-3 text-xs text-brass">
                  Limite de {LIMITE_FRACAS} atingido — desmarque uma matéria
                  para trocar.
                </p>
              )}
            </div>
          </div>

          {/* Impacto das escolhas + ação que as confirma */}
          <div className="mb-8 h-fit rounded-2xl border border-ink-800 bg-ink-950 p-5 sm:p-6 lg:sticky lg:top-8 lg:mb-0">
            <div className={`${EYEBROW} mb-3`}>Com esse ritmo</div>
            <h3
              className="font-serif text-2xl text-cream-50 leading-tight mb-5"
              style={{ fontVariationSettings: '"opsz" 60' }}
            >
              {semData
                ? `${formatarHoras(horasPorDia)}/dia · sem data definida`
                : dataInvalida
                  ? `${formatarHoras(horasPorDia)}/dia · data no passado`
                  : `${formatarHoras(horasPorDia)}/dia por ${dias} ${dias === 1 ? "dia" : "dias"}`}
            </h3>

            <div className="flex items-baseline gap-2 mb-1">
              <span
                className="font-serif text-4xl text-brass leading-none"
                style={{ fontVariationSettings: '"opsz" 144' }}
              >
                {Math.round(horasPorDia * 7)}h
              </span>
              <span className="text-sm text-cream-400">por semana</span>
            </div>

            <div className="divide-y divide-ink-800 mt-5">
              <p className="text-sm text-cream-400 py-3.5">
                {semData ? (
                  "Rodízio contínuo — sem data de fim"
                ) : dataInvalida ? (
                  "Escolha uma data futura para ver o total"
                ) : (
                  <>
                    <span className="text-cream-50 font-medium">
                      {Math.round(horasPorDia * dias)}h
                    </span>{" "}
                    no total
                  </>
                )}
              </p>
              <p className="text-sm text-cream-400 py-3.5">
                {fracas.size > 0 ? (
                  <>
                    <span className="text-cream-50 font-medium">
                      {listarMaterias(Array.from(fracas))}
                    </span>{" "}
                    recebe{fracas.size > 1 ? "m" : ""} o dobro de frequência
                  </>
                ) : (
                  "Todas as matérias no mesmo ritmo"
                )}
              </p>
              <p className="text-sm text-cream-400 py-3.5">
                Todas as {MATERIAS_CRONO.length} matérias da 1ª fase cobertas
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={gerar}
              disabled={pending || dataInvalida}
              className="mt-6 w-full min-h-12 bg-brass text-ink-950 font-medium py-3 px-6 rounded-lg shadow-btn-primary transition-[background-color,box-shadow] duration-150 ease-out hover:bg-brass-hover hover:shadow-btn-primary-hover disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              {pending ? "Aguarde…" : planoExistente ? "Regenerar plano" : "Gerar plano"}
            </button>
          </div>
        </div>

        {/* Ação destrutiva — bloco coeso e alinhado à esquerda:
            título → descrição → ação, todos na mesma coluna de texto. */}
        {planoExistente && (
          <div className="mt-6 border-t border-border-subtle pt-5">
            <div className="max-w-xl">
              <h2 className="text-sm font-medium text-cream-50">
                Apagar plano
              </h2>
              <p className="mt-0.5 text-xs text-cream-600">
                Remove o cronograma atual e o progresso marcado nele. Suas
                anotações do caderno e seus simulados não são afetados.
              </p>
              <button
                type="button"
                onClick={apagar}
                disabled={pending}
                className="mt-3 appearance-none inline-flex items-center gap-1.5 min-h-10 px-3.5 py-2 rounded-lg border border-surface-border-button bg-ink-950 text-[13px] font-medium text-cream-50 transition-[background-color,border-color,color] duration-150 ease-out hover:border-alert hover:text-alert disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
              >
                <TrashIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                Apagar plano
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
