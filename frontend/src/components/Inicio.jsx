import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FireIcon,
  FlagIcon,
  PlayIcon,
  RocketLaunchIcon,
  ScaleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import Brand from "./Brand";
import { useEffect, useState } from "react";
import { authFetchJson } from "../lib/api";
import {
  listar as listarCaderno,
  subscribe as subscribeCaderno,
} from "../lib/caderno";
import {
  loadPlano,
  planoDeHoje,
  planoEstaValido,
  subscribeCrono,
} from "../lib/cronograma";
import {
  loadLastChat,
  subscribeActivity,
} from "../lib/lastActivity";
import {
  diasAteProva,
  loadSettings,
  saudacao,
  subscribeSettings,
} from "../lib/settings";
import { subscribeSimulados, ultimoSimulado } from "../lib/simulados";

// Frases motivacionais — trocam por dia (estável dentro do mesmo dia).
const FRASES_GERAIS = [
  {
    Icon: AcademicCapIcon,
    texto: "Cada questão resolvida hoje aproxima você da aprovação.",
  },
  { Icon: ScaleIcon, texto: "A aprovação é construída um estudo de cada vez." },
  {
    Icon: ChartBarIcon,
    texto: "Pequenos avanços diários geram grandes resultados.",
  },
  {
    Icon: SparklesIcon,
    texto: "Seu futuro como advogado começa com a próxima questão.",
  },
  {
    Icon: RocketLaunchIcon,
    texto: "Continue firme. A OAB recompensa a constância.",
  },
];

const FRASES_RETA_FINAL = [
  { Icon: ClockIcon, texto: "Faltam poucos dias. Mantenha o ritmo!" },
  { Icon: FlagIcon, texto: "Hora da reta final. Foque nas revisões." },
  { Icon: CheckBadgeIcon, texto: "Você chegou até aqui. Continue!" },
];

function fraseDoDia(dias) {
  const inicioDoAno = new Date(new Date().getFullYear(), 0, 0);
  const diaDoAno = Math.floor((Date.now() - inicioDoAno) / 86400000);
  const pool =
    dias !== null && dias >= 0 && dias <= 10
      ? FRASES_RETA_FINAL
      : FRASES_GERAIS;
  return pool[diaDoAno % pool.length];
}

function isHoje(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  );
}

export default function Inicio({ onGoto, onOpenSettings, onDiscussCadItem }) {
  const [settings, setSettings] = useState(loadSettings());
  const [lastChat, setLastChat] = useState(loadLastChat());
  const [lastSim, setLastSim] = useState(ultimoSimulado());
  const [cadItems, setCadItems] = useState(listarCaderno());
  const [plano, setPlano] = useState(loadPlano());
  const [streak, setStreak] = useState(0);
  const [resumo, setResumo] = useState(null);
  const [porMateria, setPorMateria] = useState([]);

  useEffect(() => {
    const u1 = subscribeSettings(() => setSettings(loadSettings()));
    const u2 = subscribeActivity(() => setLastChat(loadLastChat()));
    const u3 = subscribeCaderno(() => {
      setCadItems(listarCaderno());
    });
    const u4 = subscribeCrono(() => setPlano(loadPlano()));
    const u5 = subscribeSimulados(() => setLastSim(ultimoSimulado()));
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  useEffect(() => {
    authFetchJson("/me/stats")
      .then((s) => {
        setStreak(s.streak || 0);
        setPorMateria(s.porMateria || []);
        const totalQuestoes = s.trend.reduce((acc, t) => acc + t.total, 0);
        const totalAcertos = s.trend.reduce((acc, t) => acc + t.acertos, 0);
        setResumo({
          totalQuestoes,
          aproveitamento:
            totalQuestoes > 0
              ? Math.round((totalAcertos / totalQuestoes) * 100)
              : null,
        });
      })
      .catch(() => {});
  }, []);

  const dias = diasAteProva(settings.dataProva);
  const nome = settings.nome;
  const planoValido = plano && planoEstaValido(plano, settings.dataProva);
  const diaHoje = planoValido ? planoDeHoje(plano) : null;

  const estudouHoje =
    isHoje(lastChat?.updatedAt) ||
    isHoje(lastSim?.updatedAt) ||
    Boolean(diaHoje && diaHoje.itens.some((i) => i.concluido));

  const frase = fraseDoDia(dias);
  const mostrarResumo = streak > 0 || (resumo && resumo.totalQuestoes > 0);

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-7xl md:px-8 md:py-8">
        {/* Header interno com wordmark + settings — mobile only. Fica FORA do card, como a sidebar. */}
        <div className="flex items-baseline justify-between mb-4 md:hidden">
          <Brand size="mobile" />
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-cream-400 hover:text-cream-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            aria-label="Ajustes"
          >
            <CogIcon />
          </button>
        </div>

        {/* Card flutuante — envolve todo o conteúdo principal da Início */}
        <div className="bg-ink-950 border border-ink-800 rounded-3xl shadow-[0_10px_35px_rgba(42,36,34,0.04)] p-5 sm:p-6 md:p-8">
          {/* ===== Bloco 1: Data + Saudação + contagem regressiva pra prova ===== */}
          <div className="flex flex-col gap-6 mb-8 md:flex-row md:items-start md:justify-between md:gap-10">
            <div className="min-w-0 md:max-w-2xl">
              <div className="text-[11px] tracking-widest uppercase text-brass font-medium mb-2">
                {formatarDataCurta(new Date())}
              </div>
              <h1
                className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight flex items-center gap-2 flex-wrap"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                {nome ? (
                  <span>
                    {saudacao()}, <span className="text-brass italic">{nome}</span>.
                  </span>
                ) : (
                  "Bom estudo hoje."
                )}
              </h1>

              <p className="text-cream-400 text-sm leading-relaxed mt-3">
                {frase.texto}
                {diaHoje && diaHoje.itens.length > 0 && (
                  <>
                    {" "}
                    Hoje seu plano tem{" "}
                    <span className="text-cream-50 font-medium">
                      {diaHoje.itens.length}{" "}
                      {diaHoje.itens.length === 1 ? "bloco" : "blocos"}
                    </span>{" "}
                    — cerca de{" "}
                    <span className="text-cream-50 font-medium">
                      {formatarDuracao(
                        diaHoje.itens.reduce((acc, i) => acc + i.minutos, 0),
                      )}
                    </span>{" "}
                    no total.
                  </>
                )}
              </p>
              {!estudouHoje && (
                <button
                  onClick={() => onGoto("simulado-landing")}
                  className="min-h-11 text-sm text-cream-400 hover:text-brass transition-colors text-left flex items-center gap-2 mt-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  <BookOpenIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Hoje você ainda não estudou.{" "}
                    <span className="text-brass-dim">
                      Que tal resolver um simulado rápido?
                    </span>
                  </span>
                </button>
              )}
            </div>

            {dias !== null && dias >= 0 && (
              <div className="w-full sm:w-auto sm:min-w-[220px] text-right shrink-0 border border-brass rounded-2xl px-4 py-3">
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                  Próxima prova
                </div>
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span
                    className="font-serif text-4xl text-brass leading-none"
                    style={{ fontVariationSettings: '"opsz" 144' }}
                  >
                    {dias}
                  </span>
                  <span className="text-sm text-cream-400">dias</span>
                </div>
                <div className="text-[11px] text-cream-600 mt-1">
                  {formatarDataLonga(settings.dataProva)}
                </div>
                <button
                  onClick={() => onGoto("cronograma-config")}
                  className="min-h-8 text-[11px] text-brass-dim hover:text-brass transition-colors mt-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Ajustar plano →
                </button>
              </div>
            )}
            {dias === null && (
              <button
                onClick={() => onGoto("cronograma-config")}
                className="w-full sm:w-auto sm:min-w-[220px] text-right shrink-0 border border-brass rounded-2xl px-4 py-3 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                  Próxima prova
                </div>
                <div
                  className="font-serif text-4xl text-brass leading-none"
                  style={{ fontVariationSettings: '"opsz" 144' }}
                >
                  —
                </div>
                <div className="text-[11px] text-brass-dim mt-1">
                  Definir em Ajustar plano
                </div>
              </button>
            )}
            {dias !== null && dias < 0 && (
              <button
                onClick={() => onGoto("cronograma-config")}
                className="w-full sm:w-auto sm:min-w-[220px] text-right shrink-0 border border-brass rounded-2xl px-4 py-3 hover:opacity-70 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                  Próxima prova
                </div>
                <div className="text-xs text-cream-400 max-w-[180px]">
                  Data já passou. Atualize em Ajustar plano →
                </div>
              </button>
            )}
          </div>

          {/*Bloco 2: Foco de hoje*/}
          {diaHoje &&
            (() => {
              const totalItens = diaHoje.itens.length;
              const concluidos = diaHoje.itens.filter((i) => i.concluido).length;
              const materias = [
                ...new Set(
                  diaHoje.itens
                    .filter((i) => i.tipo === "revisar" && i.materia)
                    .map((i) => i.materia),
                ),
              ];
              return (
                <section className="mb-8" aria-labelledby="foco-de-hoje">
                  <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2
                        id="foco-de-hoje"
                        className="font-serif text-2xl text-cream-50 leading-tight"
                        style={{ fontVariationSettings: '"opsz" 60' }}
                      >
                        Foco de hoje
                      </h2>
                      {materias.length > 0 && (
                        <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mt-1">
                          {materias.join(" & ")}
                        </p>
                      )}
                    </div>
                    <span className="self-start shrink-0 text-xs font-medium text-brass-dim bg-brass/10 px-3 py-1.5 rounded-full tabular-nums" aria-label={`${concluidos} de ${totalItens} blocos concluídos`}>
                      {concluidos} de {totalItens} concluído
                      {concluidos === 1 && totalItens === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="bg-ink-900 border border-ink-800 rounded-2xl p-4 sm:p-5">
                    <div className="divide-y divide-ink-800">
                      {diaHoje.itens.map((item, i) => (
                        <FocoHojeItem
                          key={item.id ?? i}
                          item={item}
                          onGoto={onGoto}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => onGoto("cronograma")}
                      className="min-h-10 text-xs text-brass-dim hover:text-brass mt-3 flex items-center gap-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
                    >
                      Ver plano completo <span>→</span>
                    </button>
                  </div>
                </section>
              );
            })()}

          {/*Bloco 3: Sequência + Aproveitamento*/}
          {mostrarResumo && (
            <section className="grid grid-cols-1 gap-3 mb-8 sm:grid-cols-2" aria-label="Progresso de estudo">
              {streak > 0 && (
                <div className="bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3.5">
                  <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
                    Sequência de estudo
                  </div>
                  <div className="flex items-center gap-3 text-cream-400">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#F7E4EA" }}
                      aria-hidden="true"
                    >
                      <FireIcon className="w-4 h-4 text-brass" />
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="font-serif text-2xl text-cream-50 leading-none"
                        style={{ fontVariationSettings: '"opsz" 96' }}
                      >
                        {streak}
                      </span>
                      <span className="text-sm">
                        {streak === 1 ? "dia seguido" : "dias seguidos"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {resumo && resumo.totalQuestoes > 0 && (
                <div className="bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3.5">
                  <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
                    Aproveitamento
                  </div>
                  <div className="flex items-baseline gap-1.5 text-cream-400">
                    <span
                      className="font-serif text-2xl text-cream-50 leading-none"
                      style={{ fontVariationSettings: '"opsz" 96' }}
                    >
                      {resumo.aproveitamento}%
                    </span>
                    <span className="text-sm">de aproveitamento</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/*Bloco 4: Matérias que pedem atenção*/}
          {porMateria.length > 0 && (
            <section aria-labelledby="materias-atencao">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 id="materias-atencao" className="flex items-center gap-1.5 text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                  <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                  Matérias que pedem atenção
                </h2>
                <button
                  onClick={() => onGoto("estatisticas")}
                  className="min-h-10 text-xs text-brass-dim hover:text-brass transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Ver todas →
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {porMateria.slice(0, 3).map((m) => (
                  <MateriaAtencaoCard key={m.materia} m={m} onGoto={onGoto} />
                ))}
              </div>
            </section>
          )}
        </div>

        <button
          onClick={() => onGoto("estatisticas")}
          className="w-full min-h-11 text-left text-xs text-cream-400 hover:text-brass mt-4 py-2 flex items-center gap-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 md:hidden"
        >
          Ver estatísticas de progresso <span>→</span>
        </button>
      </div>
    </div>
  );
}

// Título em negrito + subtítulo muted — só com campos reais do item
// (tipo/matéria/minutos; simulado sempre tem 10 questões, é constante
// da geração no backend, não é valor inventado).
function focoHojeTextos(item) {
  if (item.tipo === "simulado") {
    return { titulo: "Simulado rápido", subtitulo: `10 questões · ~${item.minutos} min` };
  }
  if (item.tipo === "caderno") {
    return { titulo: "Revisar caderno", subtitulo: `Caderno · ${item.minutos} min` };
  }
  return { titulo: item.materia, subtitulo: `Revisão · ${item.minutos} min` };
}

// Item individual do card "Foco de hoje" — ação padronizada à direita:
// "Concluído" (texto), "Começar" (botão sólido, itens de simulado) ou
// "Abrir" (link, itens de revisão/caderno).
function FocoHojeItem({ item, onGoto }) {
  const { titulo, subtitulo } = focoHojeTextos(item);

  if (item.concluido) {
    return (
      <div className="flex items-start gap-3 py-2.5 sm:items-center">
        <CheckCircleIcon
          className="w-6 h-6 shrink-0"
          style={{ color: "#10b981" }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-cream-600 line-through truncate">
            {titulo}
          </div>
          <div className="text-xs text-cream-600">{subtitulo}</div>
        </div>
        <span className="text-xs text-cream-600 shrink-0">Concluído</span>
      </div>
    );
  }

  const destino =
    item.tipo === "simulado"
      ? "simulado-landing"
      : item.tipo === "caderno"
        ? "caderno"
        : "chat";

  return (
    <div className="flex items-start gap-3 py-2.5 sm:items-center">
      <span className="w-6 h-6 rounded-full border-2 border-ink-700 shrink-0"></span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-cream-50 truncate">
          {titulo}
        </div>
        <div className="text-xs text-cream-400">{subtitulo}</div>
      </div>
      {item.tipo === "simulado" ? (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 min-h-10 flex items-center gap-1 text-xs font-medium text-cream-50 bg-brass hover:bg-brass-hover px-3.5 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
        >
          Começar <PlayIcon className="w-3 h-3" />
        </button>
      ) : (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 min-h-10 flex items-center gap-0.5 text-xs font-medium text-brass hover:text-brass-hover rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
        >
          Abrir <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Cor por faixa de aproveitamento — mesmo critério de Estatisticas.jsx
// (corPorPerformance), com par bg/texto pra pílula. Duplicado aqui pra
// não acoplar os dois componentes.
function corPorPerformance(pct) {
  if (pct < 30) return { texto: "#ef4444", fundo: "#fee2e2" };
  if (pct <= 70) return { texto: "#b45309", fundo: "#fef3c7" };
  return { texto: "#059669", fundo: "#d1fae5" };
}

function MateriaAtencaoCard({ m, onGoto }) {
  const p = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0;
  const { texto, fundo } = corPorPerformance(p);
  return (
    <button
      onClick={() => onGoto("chat")}
      className="min-h-[132px] text-left bg-ink-900 border border-ink-800 rounded-2xl p-4 hover:border-brass-dim transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      aria-label={`Revisar ${m.materia} com o mentor. Aproveitamento: ${p}%.`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm text-cream-50 font-medium truncate">
          {m.materia}
        </span>
        <span
          className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full"
          style={{ color: texto, backgroundColor: fundo }}
        >
          {p}%
        </span>
      </div>
      <div
        className="h-1.5 bg-ink-800 rounded-full overflow-hidden mb-2"
        role="progressbar"
        aria-label={`Aproveitamento em ${m.materia}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${p}%`, backgroundColor: texto }}
        ></div>
      </div>
      <span className="text-xs font-medium text-brass-dim">
        Revisar com mentor →
      </span>
    </button>
  );
}

function formatarDataLonga(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const dias = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

// "QUARTA · 16 DE SETEMBRO" — label curto do dia atual, pro cabeçalho.
function formatarDataCurta(d) {
  const dias = [
    "DOMINGO",
    "SEGUNDA",
    "TERÇA",
    "QUARTA",
    "QUINTA",
    "SEXTA",
    "SÁBADO",
  ];
  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];
  return `${dias[d.getDay()]} · ${d.getDate()} DE ${meses[d.getMonth()]}`;
}

// Soma de minutos -> "1h20" (ou "45 min" se for menos de 1h).
function formatarDuracao(totalMinutos) {
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}

function CogIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );
}
