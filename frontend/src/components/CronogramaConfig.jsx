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

export default function CronogramaConfig({ onBack, onPlanGerado }) {
  const initial = loadConfig();
  const settingsIniciais = loadSettings();
  const [dataProva, setDataProva] = useState(settingsIniciais.dataProva || "");
  const [horasPorDia, setHorasPorDia] = useState(initial.horasPorDia);
  const [fracas, setFracas] = useState(new Set(initial.materiasFracas || []));
  const [error, setError] = useState(null);

  const planoExistente = loadPlano();
  const dias = diasAteProva(dataProva || null);

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

  function gerar() {
    if (
      planoExistente &&
      !confirm("Isso vai substituir seu plano atual. Continuar?")
    ) {
      return;
    }
    const config = {
      horasPorDia,
      materiasFracas: Array.from(fracas),
    };
    saveConfig(config);
    saveSettings({ dataProva: dataProva || null });
    const plano = gerarPlano(dataProva || null, config);
    if (!plano) {
      setError(
        "Não foi possível gerar o plano. Verifique se a data da prova está no futuro.",
      );
      return;
    }
    savePlano(plano);
    onPlanGerado();
  }

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-6xl md:px-8 md:py-8">
      <div className="bg-surface-raised border border-ink-800 rounded-3xl shadow-[0_10px_35px_rgba(42,36,34,0.04)] p-5 sm:p-6 md:p-8">
        <button
          onClick={onBack}
          className="min-h-10 px-1 text-xs text-cream-400 hover:text-cream-50 transition-colors mb-6 flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
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
        <p className="text-cream-400 text-sm leading-relaxed mb-8 max-w-2xl">
          Três informações e o plano se molda ao seu ritmo. Você pode regenerar
          quando quiser.
        </p>

        <div className="lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-8 lg:items-start">
          <div>
            {/* Data da prova */}
            <div className="mb-8">
              <label htmlFor="data-prova" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-3">
                Data da prova{" "}
                <span className="normal-case tracking-normal font-normal">
                  (opcional)
                </span>
              </label>
              <input
                id="data-prova"
                type="date"
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
                className="w-full sm:w-auto min-h-11 bg-ink-900 border border-ink-800 rounded-xl px-4 py-2.5 text-cream-50 focus:border-brass-dim focus:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
              />
              <p className="text-xs text-cream-600 mt-2">
                Sem data, o plano vira um rodízio contínuo pelas matérias — dá
                pra regenerar com a data assim que você souber.
              </p>
            </div>

            {/* Horas por dia */}
            <div className="mb-8">
              <label htmlFor="horas-por-dia" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-3">
                Horas por dia
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    id="horas-por-dia"
                    type="range"
                    min="0.5"
                    max="6"
                    step="0.5"
                    list="marcas-horas"
                    value={horasPorDia}
                    onChange={(e) => setHorasPorDia(parseFloat(e.target.value))}
                    aria-valuetext={`${formatarHoras(horasPorDia)} por dia`}
                    aria-describedby="marcas-horas-visuais horas-ajuda"
                    className="w-full h-6 accent-brass rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                  />
                  <datalist id="marcas-horas">
                    <option value="1"></option>
                    <option value="2"></option>
                    <option value="4"></option>
                    <option value="6"></option>
                  </datalist>
                  <div id="marcas-horas-visuais" className="flex items-center justify-between text-[11px] text-cream-600 mt-1">
                    <span>30 min</span>
                    <span>1h</span>
                    <span>2h</span>
                    <span>4h</span>
                    <span>6h</span>
                  </div>
                </div>
                <div className="w-16 text-right shrink-0">
                  <span
                    className="font-serif text-2xl text-brass"
                    style={{ fontVariationSettings: '"opsz" 60' }}
                  >
                    {formatarHoras(horasPorDia)}
                  </span>
                </div>
              </div>
              <p id="horas-ajuda" className="text-xs text-cream-600 mt-3">
                Média realista, não o ideal. Vale mais consistência que
                quantidade.
              </p>
            </div>

            {/* Matérias fracas */}
            <div className="mb-10">
              <p id="materias-prioritarias" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium block mb-2">
                Matérias em que você está mais fraca
                <span className="normal-case tracking-normal text-cream-400 font-normal">
                  {" "}
                  · {fracas.size} de {LIMITE_FRACAS} selecionadas
                </span>
              </p>
              <p className="text-xs text-cream-600 mb-4">
                Selecione até {LIMITE_FRACAS} que precisam de mais atenção —
                receberão o dobro de frequência no plano.
              </p>
              <div className="flex flex-wrap gap-2.5" aria-labelledby="materias-prioritarias">
                {MATERIAS_CRONO.map((m) => {
                  const selecionada = fracas.has(m);
                  const limiteAtingido =
                    !selecionada && fracas.size >= LIMITE_FRACAS;
                  return (
                    <button
                      key={m}
                      onClick={() => toggleFraca(m)}
                      disabled={limiteAtingido}
                      aria-pressed={selecionada}
                      title={
                        limiteAtingido
                          ? `Máximo de ${LIMITE_FRACAS} matérias`
                          : undefined
                      }
                      className={`min-h-10 text-xs px-3 py-2 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
                        selecionada
                          ? "border-brass bg-brass text-ink-950 font-medium"
                          : limiteAtingido
                            ? "border-ink-800 text-cream-600 opacity-50 cursor-not-allowed"
                            : "border-ink-800 text-cream-400 hover:border-brass-dim hover:text-cream-50"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview do impacto */}
          <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5 sm:p-6 h-fit mb-8 lg:mb-0 lg:sticky lg:top-8">
            <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
              Com esse ritmo
            </div>
            {dias !== null && dias > 0 ? (
              <h3
                className="font-serif text-2xl text-cream-50 leading-tight mb-5"
                style={{ fontVariationSettings: '"opsz" 60' }}
              >
                {formatarHoras(horasPorDia)}/dia por {dias}{" "}
                {dias === 1 ? "dia" : "dias"}
              </h3>
            ) : (
              <h3
                className="font-serif text-2xl text-cream-50 leading-tight mb-5"
                style={{ fontVariationSettings: '"opsz" 60' }}
              >
                {formatarHoras(horasPorDia)}/dia · sem data definida
              </h3>
            )}

            <div className="flex items-baseline gap-2 mb-1">
              <span
                className="font-serif text-4xl text-brass leading-none"
                style={{ fontVariationSettings: '"opsz" 144' }}
              >
                {Math.round(horasPorDia * 7)}h
              </span>
              <span className="text-sm text-cream-400">por semana</span>
            </div>

            <div className="divide-y divide-ink-800 mt-4">
              {dias !== null && dias > 0 && (
                <p className="text-sm text-cream-400 py-3">
                  <span className="text-cream-50 font-medium">
                    {Math.round(horasPorDia * dias)}h
                  </span>{" "}
                  no total
                </p>
              )}
              {(dias === null || dias <= 0) && (
                <p className="text-sm text-cream-400 py-3">
                  Rodízio contínuo — sem data de fim
                </p>
              )}
              <p className="text-sm text-cream-400 py-3">
                {fracas.size > 0
                  ? `${listarMaterias(Array.from(fracas))} recebe${fracas.size > 1 ? "m" : ""} o dobro de frequência`
                  : "Todas as matérias no mesmo ritmo"}
              </p>
              <p className="text-sm text-cream-400 py-3">
                Todas as {MATERIAS_CRONO.length} matérias da 1ª fase cobertas
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={gerar}
              className="min-h-12 bg-brass hover:bg-brass-hover text-ink-950 font-medium py-3 px-8 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              {planoExistente ? "Regenerar plano" : "Gerar plano"}
            </button>

            {planoExistente && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Apagar o plano atual? Você poderá gerar outro depois.",
                    )
                  ) {
                    limparPlano();
                    onBack();
                  }
                }}
                aria-label="Apagar plano atual"
                title="Apagar plano atual"
                className="shrink-0 min-h-12 w-12 flex items-center justify-center rounded-xl border border-ink-800 text-cream-400 hover:border-alert hover:text-alert transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
