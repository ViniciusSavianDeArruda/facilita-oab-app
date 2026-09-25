import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { agruparItens, destinoPorTipo, ItemCheckbox } from "./Cronograma";
import { loadPlano, marcarItemConcluido, subscribeCrono } from "../lib/cronograma";
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

// Nome do bloco pro painel de detalhe — tipo + matéria quando existir
// (ex.: "Revisar · Direito Constitucional"), só o tipo quando não (ex.:
// "Simulado rápido"). Não inventa título temático nem descrição livre.
function nomeBloco(item) {
  if (item.tipo === "revisar" && item.materia) return `Revisar · ${item.materia}`;
  if (item.tipo === "caderno") return "Revisar caderno";
  if (item.tipo === "simulado") return "Simulado rápido";
  return item.tipo;
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
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-none md:mx-0 md:px-8 md:py-10">
          <button
            onClick={onBack}
            className="text-xs text-cream-400 hover:text-cream-50 transition-colors mb-6 flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
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
  const horasFeitas = Math.round(minConcluidos / 60);
  const horasTotais = Math.round(minAgendados / 60);

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

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-6xl md:px-8 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            onClick={onBack}
            className="min-h-10 px-1 text-xs text-cream-400 hover:text-cream-50 transition-colors flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          >
            <ArrowLeftIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            Voltar
          </button>
          {diasProva !== null && diasProva >= 0 && (
            <div className="flex items-center gap-2 text-xs bg-ink-950 border border-ink-800 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brass shrink-0"></span>
              <span className="text-cream-400">
                <span className="font-medium text-cream-50">1ª Fase OAB:</span>{" "}
                {diasProva} dias restantes · {dataAbreviada(settings.dataProva)}
              </span>
            </div>
          )}
        </div>

        <div className="bg-ink-950 border border-ink-800 rounded-3xl shadow-[0_10px_35px_rgba(42,36,34,0.04)] p-5 sm:p-6 md:p-8">
          <div className="flex flex-col gap-4 mb-6 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                Cronograma completo
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  className="font-serif text-3xl sm:text-4xl text-cream-50 leading-tight tracking-tight"
                  style={{ fontVariationSettings: '"opsz" 96' }}
                >
                  {NOMES_MES[mesAtual.mes]} {mesAtual.ano}
                </h1>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => mudarMes(-1)}
                    disabled={!podeVoltar}
                    className="min-w-10 min-h-10 rounded-xl border border-ink-800 text-cream-400 hover:text-cream-50 hover:border-brass-dim disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                    aria-label="Mês anterior"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => mudarMes(1)}
                    disabled={!podeAvancar}
                    className="min-w-10 min-h-10 rounded-xl border border-ink-800 text-cream-400 hover:text-cream-50 hover:border-brass-dim disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                    aria-label="Próximo mês"
                  >
                    ›
                  </button>
                  <button
                    onClick={irParaHoje}
                    className="min-h-10 px-3 rounded-xl border border-ink-800 text-xs text-cream-400 hover:text-cream-50 hover:border-brass-dim transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                  >
                    Hoje
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-x-5 gap-y-3 self-start shrink-0 sm:items-center lg:justify-end">
              <div className="lg:text-right">
                <p className="text-[10px] tracking-widest uppercase text-cream-600 font-medium mb-1">
                  Horas no mês
                </p>
                <p className="font-serif text-xl text-cream-50">
                  {horasFeitas}h{" "}
                  <span className="text-cream-400 text-sm font-sans">
                    / {horasTotais}h
                  </span>
                </p>
              </div>
              <div className="hidden h-8 w-px bg-ink-800 sm:block"></div>
              <div className="lg:text-right">
                <p className="text-[10px] tracking-widest uppercase text-cream-600 font-medium mb-1">
                  Desempenho
                </p>
                {desempenhoMes !== null ? (
                  <p className="font-serif text-xl text-brass">{desempenhoMes}%</p>
                ) : (
                  <p className="text-xs text-cream-600 max-w-[110px]">
                    Sem simulados este mês
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="xl:grid xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.95fr)] xl:gap-8 xl:items-start">
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2 sm:gap-1.5">
                {DIAS_SEMANA.map((n) => (
                  <div
                    key={n}
                    className="text-center text-[10px] tracking-wider uppercase text-cream-600 font-medium py-1"
                  >
                    {n}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 mb-4 sm:gap-1.5">
                {celulas.map((data, i) => {
                  if (!data) return <div key={`vazio-${i}`} />;
                  const info = diasPorData.get(data);
                  const isHoje = data === hojeStr;
                  const isSelecionado = data === diaSelecionado;
                  const temSimulado = info?.itens.some(
                    (it) => it.tipo === "simulado",
                  );
                  const numDia = parseInt(data.slice(8, 10), 10);

                  const cls = isSelecionado
                    ? "border-brass bg-brass/10 ring-2 ring-brass/20"
                    : isHoje
                      ? "border-brass-dim bg-brass/[0.03]"
                      : info
                        ? "border-ink-800 bg-ink-900 hover:border-brass-dim"
                        : "border-transparent bg-transparent text-cream-600";
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
                      className={`min-h-10 rounded-xl border text-xs flex flex-col items-center justify-center gap-1 transition-colors sm:min-h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-default ${cls}`}
                      aria-label={`${nomeDiaCompleto(data)}, ${dataDiaMesMaiuscula(data)}: ${descricaoEstado}`}
                      aria-pressed={info ? isSelecionado : undefined}
                      aria-current={isHoje ? "date" : undefined}
                    >
                      <span
                        className={
                          isHoje
                            ? "text-brass font-medium"
                            : info
                              ? "text-cream-50"
                              : "text-cream-600"
                        }
                      >
                        {numDia}
                      </span>
                      {isHoje && (
                        <span className="text-[9px] leading-none font-medium text-brass">
                          Hoje
                        </span>
                      )}
                      {info && (
                        <span className="flex gap-1" aria-hidden="true">
                          {temSimulado && (
                            <span className="w-1.5 h-1.5 rounded-full bg-brass"></span>
                          )}
                          {info.concluido ? (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: "#059669" }}
                            ></span>
                          ) : (
                            !temSimulado && (
                              <span className="w-1.5 h-1.5 rounded-full bg-ink-700"></span>
                            )
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-cream-400 mb-8 xl:mb-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brass"></span>{" "}
                  Simulado
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#059669" }}
                  ></span>{" "}
                  Concluído
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-700"></span>{" "}
                  Pendente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border border-brass-dim bg-brass/[0.03]"></span>
                  Hoje
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded border border-brass bg-brass/10 ring-1 ring-brass/20"></span>
                  Selecionado
                </span>
              </div>
            </div>

            {/* Detalhe do dia selecionado */}
            <div>
              {diaInfo ? (
                <div className="bg-ink-900 border border-ink-800 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full ${
                        diaInfo.data === hojeStr
                          ? "bg-brass text-ink-950"
                          : "bg-ink-800 text-cream-400"
                      }`}
                    >
                      {diaInfo.data === hojeStr
                        ? `Hoje · ${dataDiaMesMaiuscula(diaInfo.data)}`
                        : dataDiaMesMaiuscula(diaInfo.data)}
                    </span>
                    <span
                      className="text-[11px] font-medium bg-[#F7E4EA] text-brass px-2.5 py-1 rounded-full tabular-nums shrink-0"
                      aria-label={`${diaInfo.itens.filter((i) => i.concluido).length} de ${diaInfo.itens.length} blocos concluídos`}
                    >
                      {diaInfo.itens.filter((i) => i.concluido).length} de{" "}
                      {diaInfo.itens.length} feitos
                    </span>
                  </div>

                  <p
                    className="font-serif text-xl text-cream-50 mb-1"
                    style={{ fontVariationSettings: '"opsz" 60' }}
                  >
                    {nomeDiaCompleto(diaInfo.data)}
                  </p>
                  <p className="text-xs text-cream-400 mb-4 leading-relaxed">
                    {diaInfo.itens.length}{" "}
                    {diaInfo.itens.length === 1
                      ? "bloco agendado"
                      : "blocos agendados"}{" "}
                    · {formatarHoraMin(totalMinutosDia)} estimad
                    {diaInfo.itens.length === 1 ? "a" : "as"}
                  </p>

                  {gruposDiaInfo.length === 0 ? (
                    <p className="text-sm text-cream-600 italic">A definir</p>
                  ) : (
                    <div className="divide-y divide-ink-800">
                      {gruposDiaInfo.map((grupo, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:items-center"
                        >
                          <ItemCheckbox
                            marcado={grupo.todasConcluidas}
                            onToggle={() =>
                              grupo.idxs.forEach((i) =>
                                marcarItemConcluido(
                                  diaInfo.data,
                                  i,
                                  !grupo.todasConcluidas,
                                ),
                              )
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                grupo.todasConcluidas
                                  ? "text-cream-600 line-through"
                                  : "text-cream-50"
                              }`}
                            >
                              {grupo.count > 1 && (
                                <span className="font-medium">
                                  {grupo.count}×{" "}
                                </span>
                              )}
                              {nomeBloco(grupo.item)}
                            </p>
                            <p className="text-xs text-cream-400">
                              {grupo.item.minutos} min
                            </p>
                          </div>
                          {!grupo.todasConcluidas && onGoto && (
                            <button
                              onClick={() => onGoto(destinoPorTipo(grupo.item.tipo))}
                              className={`shrink-0 min-h-10 text-xs font-medium rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 ${
                                grupo.item.tipo === "simulado"
                                  ? "bg-brass hover:bg-brass-hover text-ink-950"
                                  : "border border-ink-800 text-brass-dim hover:text-brass hover:border-brass-dim"
                              }`}
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
                <div className="hidden xl:block text-sm text-cream-400 border border-dashed border-ink-800 rounded-2xl p-5">
                  Toque num dia com marcação pra ver as tarefas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
