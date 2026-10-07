import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { agruparItens, destinoPorTipo, ItemCheckbox } from "./Cronograma";
import { loadPlano, marcarItensConcluidos, subscribeCrono } from "../lib/cronograma";
import { diasAteProva, loadSettings } from "../lib/settings";
import { listarSimulados, subscribeSimulados } from "../lib/simulados";

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const NOMES_DIA_COMPLETO = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function mesDaData(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

// Soma de minutos -> "2h 25m" (ou só "25m"/"2h" quando um dos lados é zero).
function formatarHoraMin(totalMinutos) {
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function nomeDiaCompleto(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return NOMES_DIA_COMPLETO[d.getDay()];
}

// "2026-09-18" -> "18 DE SETEMBRO"
function dataDiaMesMaiuscula(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return `${d.getDate()} DE ${NOMES_MES[d.getMonth()].toUpperCase()}`;
}

// "2026-11-19" -> "19 de Nov"
function dataAbreviada(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return `${d.getDate()} de ${NOMES_MES[d.getMonth()].slice(0, 3)}`;
}

// "2026-09-18" -> "18 de setembro"
function dataPorExtenso(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return `${d.getDate()} de ${NOMES_MES[d.getMonth()].toLowerCase()}`;
}

// Base de botão outlined do design system (§6). Tamanho e padding ficam
// por conta de quem usa.
const BTN_OUTLINED =
  "inline-flex appearance-none items-center justify-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 font-medium text-cream-50 transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/20";

const BTN_OUTLINED_DISABLED =
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-border-button disabled:hover:bg-ink-950 disabled:hover:text-cream-50";

// Nome do bloco pro painel de detalhe — tipo + matéria quando existir
// (ex.: "Revisar · Direito Constitucional"), só o tipo quando não (ex.:
// "Simulado rápido"). Não inventa título temático nem descrição livre.
function nomeBloco(item) {
  if (item.tipo === "revisar" && item.materia) return `Revisar · ${item.materia}`;
  if (item.tipo === "caderno") return "Revisar caderno";
  if (item.tipo === "simulado") return "Simulado rápido";
  return item.tipo;
}

// Item de legenda — o glifo vive numa caixa de 12px para que todos os
// rótulos comecem no mesmo recuo, independente da forma do marcador.
function LegendaItem({ children, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="flex h-3 w-3 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {children}
      </span>
      {label}
    </span>
  );
}

function acaoLabel(tipo) {
  if (tipo === "simulado") return "Iniciar";
  if (tipo === "caderno") return "Revisar";
  return "Estudar agora";
}

export default function CronogramaCalendario({ onBack, onGoto }) {
  const [plano, setPlano] = useState(loadPlano());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubCrono = subscribeCrono(() => setPlano(loadPlano()));
    const unsubSim = subscribeSimulados(() => forceUpdate((n) => n + 1));
    return () => {
      unsubCrono();
      unsubSim();
    };
  }, []);

  const settings = loadSettings();
  const diasProva = diasAteProva(settings.dataProva);

  const hojeStr = new Date().toISOString().slice(0, 10);
  const [mesAtual, setMesAtual] = useState(() => mesDaData(hojeStr));
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  if (!plano || plano.dias.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-sand-50">
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-8 pt-6 sm:px-6 md:px-8 md:py-10 lg:px-10">
          <button
            onClick={onBack}
            className={`mb-6 min-h-10 px-3.5 py-2 text-[13px] ${BTN_OUTLINED}`}
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Voltar
          </button>
          <p className="text-sm text-cream-400">
            Nenhum plano ativo no momento.
          </p>
        </div>
      </div>
    );
  }

  const diasPorData = new Map(plano.dias.map((d) => [d.data, d]));
  const primeiroMesPlano = mesDaData(plano.dias[0].data);
  const ultimoMesPlano = mesDaData(plano.dias[plano.dias.length - 1].data);

  const podeVoltar =
    mesAtual.ano > primeiroMesPlano.ano ||
    (mesAtual.ano === primeiroMesPlano.ano &&
      mesAtual.mes > primeiroMesPlano.mes);
  const podeAvancar =
    mesAtual.ano < ultimoMesPlano.ano ||
    (mesAtual.ano === ultimoMesPlano.ano && mesAtual.mes < ultimoMesPlano.mes);

  function mudarMes(delta) {
    setMesAtual((m) => {
      const novo = new Date(m.ano, m.mes + delta, 1);
      return { ano: novo.getFullYear(), mes: novo.getMonth() };
    });
    setDiaSelecionado(null);
  }

  function irParaHoje() {
    setMesAtual(mesDaData(hojeStr));
    setDiaSelecionado(hojeStr);
  }

  // Grade do mês — semanas começando na segunda-feira.
  const primeiroDoMes = new Date(mesAtual.ano, mesAtual.mes, 1);
  const offsetInicio = (primeiroDoMes.getDay() + 6) % 7;
  const totalDiasNoMes = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate();

  const celulas = [];
  for (let i = 0; i < offsetInicio; i++) celulas.push(null);
  for (let dia = 1; dia <= totalDiasNoMes; dia++) {
    const mm = String(mesAtual.mes + 1).padStart(2, "0");
    const dd = String(dia).padStart(2, "0");
    celulas.push(`${mesAtual.ano}-${mm}-${dd}`);
  }
  while (celulas.length % 7 !== 0) celulas.push(null);

  // Stats do mês exibido.
  const diasDoMes = plano.dias.filter((d) => {
    const m = mesDaData(d.data);
    return m.ano === mesAtual.ano && m.mes === mesAtual.mes;
  });
  const minAgendados = diasDoMes.reduce(
    (acc, d) => acc + d.itens.reduce((a, i) => a + i.minutos, 0),
    0,
  );
  const minConcluidos = diasDoMes.reduce(
    (acc, d) =>
      acc + d.itens.filter((i) => i.concluido).reduce((a, i) => a + i.minutos, 0),
    0,
  );
  const simuladosDoMes = listarSimulados().filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === mesAtual.ano && d.getMonth() === mesAtual.mes;
  });
  const desempenhoMes =
    simuladosDoMes.length > 0
      ? Math.round(
          simuladosDoMes.reduce(
            (acc, r) => acc + (r.total > 0 ? (r.acertos / r.total) * 100 : 0),
            0,
          ) / simuladosDoMes.length,
        )
      : null;

  const diaInfo = diaSelecionado ? diasPorData.get(diaSelecionado) : null;
  const gruposDiaInfo = diaInfo ? agruparItens(diaInfo.itens) : [];
  const totalMinutosDia = diaInfo
    ? diaInfo.itens.reduce((a, i) => a + i.minutos, 0)
    : 0;
  const totalItensDia = diaInfo ? diaInfo.itens.length : 0;
  const concluidosDia = diaInfo
    ? diaInfo.itens.filter((i) => i.concluido).length
    : 0;
  const progressoDia =
    totalItensDia > 0 ? Math.round((concluidosDia / totalItensDia) * 100) : 0;
  const diaSelEhHoje = diaInfo?.data === hojeStr;

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className={`min-h-10 px-3.5 py-2 text-[13px] ${BTN_OUTLINED}`}
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Voltar
          </button>
          {diasProva !== null && diasProva >= 0 && (
            <div className="flex items-center gap-2 rounded-full border border-surface-pill-border bg-surface-pill px-3.5 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
              <span className="text-cream-400">
                <span className="font-medium text-cream-50">1ª Fase OAB:</span>{" "}
                {diasProva} dias restantes · {dataAbreviada(settings.dataProva)}
              </span>
            </div>
          )}
        </div>

        {/* Cabeçalho da página — fora do card, como na Home e no Plano. */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-brass">
              Cronograma completo
            </p>
            <h1
              className="font-serif text-3xl leading-tight tracking-tight text-cream-50 sm:text-4xl"
              style={{ fontVariationSettings: '"opsz" 96' }}
            >
              {NOMES_MES[mesAtual.mes]} {mesAtual.ano}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => mudarMes(-1)}
                disabled={!podeVoltar}
                className={`min-h-11 min-w-11 ${BTN_OUTLINED} ${BTN_OUTLINED_DISABLED}`}
                aria-label="Mês anterior"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => mudarMes(1)}
                disabled={!podeAvancar}
                className={`min-h-11 min-w-11 ${BTN_OUTLINED} ${BTN_OUTLINED_DISABLED}`}
                aria-label="Próximo mês"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <button
              onClick={irParaHoje}
              className={`min-h-11 px-4 text-[13px] ${BTN_OUTLINED}`}
            >
              Hoje
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-ink-800 bg-ink-950">
          {/* Faixa de totais do mês exibido */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-b border-border-subtle px-3 py-4 sm:px-6 sm:py-5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-cream-600">
                Horas no mês
              </p>
              <p className="mt-1 font-serif text-xl tabular-nums text-cream-50">
                {formatarHoraMin(minConcluidos)}
                <span className="font-sans text-sm text-cream-400">
                  {" "}
                  / {formatarHoraMin(minAgendados)}
                </span>
              </p>
            </div>
            <div className="hidden h-8 w-px bg-border-subtle sm:block" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-cream-600">
                Desempenho
              </p>
              {desempenhoMes !== null ? (
                <p className="mt-1 font-serif text-xl tabular-nums text-brass">
                  {desempenhoMes}%
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-cream-600">
                  Sem simulados este mês
                </p>
              )}
            </div>
          </div>

          <div className="px-3 py-5 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(290px,1fr)] lg:items-start lg:gap-8">
            <div className="min-w-0">
              <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
                {DIAS_SEMANA.map((n) => (
                  <div
                    key={n}
                    className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-cream-600"
                  >
                    {n}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {celulas.map((data, i) => {
                  if (!data) return <div key={`vazio-${i}`} />;
                  const info = diasPorData.get(data);
                  const isHoje = data === hojeStr;
                  const isSelecionado = data === diaSelecionado;
                  const temSimulado = info?.itens.some(
                    (it) => it.tipo === "simulado",
                  );
                  const numDia = parseInt(data.slice(8, 10), 10);

                  // Hoje e selecionado se distinguem por forma, não só por
                  // matiz: hoje é contorno vinho sobre fundo claro,
                  // selecionado é preenchimento vinho sólido. Em escala de
                  // cinza continuam distintos.
                  let cls;
                  if (isSelecionado) {
                    cls = "border-brass bg-brass";
                  } else if (isHoje) {
                    cls = "border-brass bg-ink-900 hover:bg-ink-950";
                  } else if (info) {
                    cls =
                      "border-surface-border-subtle bg-ink-900 hover:border-surface-border-hover hover:bg-surface-subcard-hover";
                  } else {
                    cls = "border-transparent bg-transparent";
                  }

                  const descricaoEstado = [
                    info
                      ? `${info.itens.length} ${info.itens.length === 1 ? "atividade planejada" : "atividades planejadas"}`
                      : "sem atividades",
                    isHoje ? "hoje" : null,
                    isSelecionado ? "selecionado" : null,
                    info?.concluido ? "concluído" : null,
                    temSimulado ? "inclui simulado" : null,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <button
                      key={data}
                      onClick={() =>
                        info && setDiaSelecionado(isSelecionado ? null : data)
                      }
                      disabled={!info}
                      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg border text-xs transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-default sm:min-h-14 ${cls}`}
                      aria-label={`${nomeDiaCompleto(data)}, ${dataDiaMesMaiuscula(data)}: ${descricaoEstado}`}
                      aria-pressed={info ? isSelecionado : undefined}
                      aria-current={isHoje ? "date" : undefined}
                    >
                      <span
                        className={`tabular-nums ${
                          isSelecionado
                            ? "font-semibold text-ink-950"
                            : isHoje
                              ? "font-semibold text-brass"
                              : info
                                ? "text-cream-50"
                                : "text-cream-600"
                        }`}
                      >
                        {numDia}
                      </span>
                      {isHoje && (
                        <span
                          className={`text-[9px] font-semibold uppercase leading-none tracking-wide ${isSelecionado ? "text-ink-950" : "text-brass"}`}
                        >
                          Hoje
                        </span>
                      )}
                      {info && (
                        <span
                          className="flex h-3 items-center gap-1"
                          aria-hidden="true"
                        >
                          {temSimulado && (
                            <DocumentTextIcon
                              className={`h-3 w-3 ${isSelecionado ? "text-ink-950" : "text-brass"}`}
                              strokeWidth={1.75}
                            />
                          )}
                          {info.concluido ? (
                            <CheckIcon
                              className={`h-3 w-3 ${isSelecionado ? "text-ink-950" : "text-feedback-success-text"}`}
                              strokeWidth={3}
                            />
                          ) : (
                            !temSimulado && (
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${isSelecionado ? "bg-ink-950/60" : "bg-ink-700"}`}
                              />
                            )
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dois grupos: marcadores dentro da célula e estados da
                  própria célula. Separados por espaço, não por divisor. */}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-cream-400">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <LegendaItem label="Simulado">
                    <DocumentTextIcon
                      className="h-3 w-3 text-brass"
                      strokeWidth={1.75}
                    />
                  </LegendaItem>
                  <LegendaItem label="Concluído">
                    <CheckIcon
                      className="h-3 w-3 text-feedback-success-text"
                      strokeWidth={3}
                    />
                  </LegendaItem>
                  <LegendaItem label="Pendente">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-700" />
                  </LegendaItem>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <LegendaItem label="Hoje">
                    <span className="h-3 w-3 rounded-[3px] border border-brass bg-ink-900" />
                  </LegendaItem>
                  <LegendaItem label="Selecionado">
                    <span className="h-3 w-3 rounded-[3px] border border-brass bg-brass" />
                  </LegendaItem>
                </div>
              </div>
            </div>

            {/* Detalhe do dia selecionado */}
            {diaInfo ? (
              <div className="mt-6 border-t border-border-subtle pt-5 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <h2
                      className={`font-serif text-xl leading-tight ${diaSelEhHoje ? "text-brass" : "text-cream-50"}`}
                      style={{ fontVariationSettings: '"opsz" 60' }}
                    >
                      {diaSelEhHoje ? "Hoje" : nomeDiaCompleto(diaInfo.data)}
                    </h2>
                    <p className="mt-1 text-[13px] text-cream-400">
                      {diaSelEhHoje
                        ? `${nomeDiaCompleto(diaInfo.data)}, ${dataPorExtenso(diaInfo.data)}`
                        : dataPorExtenso(diaInfo.data)}
                    </p>
                  </div>
                  {totalItensDia > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-surface-pill-border bg-surface-pill px-3 py-1.5 text-[11px] font-semibold leading-none tabular-nums text-brass">
                      <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatarHoraMin(totalMinutosDia)}
                    </span>
                  )}
                </div>

                {totalItensDia > 0 && (
                  <div className="mt-4">
                    <div
                      className="h-1 overflow-hidden rounded-full bg-surface-track"
                      role="progressbar"
                      aria-labelledby="progresso-dia-selecionado"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progressoDia}
                    >
                      <div
                        className="h-full rounded-full bg-brass transition-[width] duration-500 motion-reduce:transition-none"
                        style={{ width: `${progressoDia}%` }}
                      />
                    </div>
                    <p
                      id="progresso-dia-selecionado"
                      className={`mt-2 text-[13px] font-medium tabular-nums ${diaInfo.concluido ? "text-feedback-success-text" : "text-cream-400"}`}
                    >
                      {concluidosDia} de {totalItensDia}{" "}
                      {totalItensDia === 1 ? "bloco" : "blocos"} concluídos
                    </p>
                  </div>
                )}

                {gruposDiaInfo.length === 0 ? (
                  <p className="mt-4 text-sm italic text-cream-600">A definir</p>
                ) : (
                  <div className="mt-4 divide-y divide-border-subtle">
                    {gruposDiaInfo.map((grupo) => (
                      <div
                        key={grupo.chave}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                      >
                        {/* Compensa o alvo de 44px para alinhar o círculo
                            à borda de conteúdo do painel. */}
                        <div className="-ml-3 shrink-0">
                          <ItemCheckbox
                            marcado={grupo.todasConcluidas}
                            rotulo={`${grupo.count > 1 ? `${grupo.count} blocos de ` : ""}${nomeBloco(grupo.item)}, ${grupo.item.minutos} min, ${dataDiaMesMaiuscula(diaInfo.data)}`}
                            onToggle={() =>
                              marcarItensConcluidos(
                                diaInfo.data,
                                grupo.idxs,
                                !grupo.todasConcluidas,
                              )
                            }
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold leading-snug ${
                              grupo.todasConcluidas
                                ? "text-cream-600 line-through"
                                : "text-cream-50"
                            }`}
                          >
                            {grupo.count > 1 && (
                              <span
                                className={
                                  grupo.todasConcluidas ? "" : "text-brass"
                                }
                              >
                                {grupo.count}×{" "}
                              </span>
                            )}
                            {nomeBloco(grupo.item)}
                          </p>
                          <p className="mt-0.5 text-[13px] text-cream-400">
                            {grupo.item.minutos} min
                            {grupo.count > 1 ? " cada" : ""}
                          </p>
                        </div>
                        {!grupo.todasConcluidas && onGoto && (
                          <button
                            onClick={() =>
                              onGoto(destinoPorTipo(grupo.item.tipo))
                            }
                            className={`ml-auto min-h-10 shrink-0 px-3.5 py-2 text-[13px] ${BTN_OUTLINED}`}
                          >
                            {acaoLabel(grupo.item.tipo)}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:block lg:border-l lg:border-border-subtle lg:pl-6">
                <p
                  className="font-serif text-lg leading-tight text-cream-50"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  Nenhum dia selecionado
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-cream-400">
                  Escolha um dia marcado no calendário para ver os blocos
                  planejados e marcar o que já foi feito.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
