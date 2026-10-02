import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  FireIcon,
  FlagIcon,
  MoonIcon,
  RocketLaunchIcon,
  ScaleIcon,
  SparklesIcon,
  SunIcon,
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
  percentualConcluido,
  planoDeHoje,
  planoEstaValido,
  subscribeCrono,
} from "../lib/cronograma";
import {
  loadLastChat,
  subscribeActivity,
  tempoRelativo,
} from "../lib/lastActivity";
import {
  diasAteProva,
  loadSettings,
  saudacao,
  subscribeSettings,
} from "../lib/settings";
import {
  listarSimulados,
  subscribeSimulados,
  ultimoSimulado,
} from "../lib/simulados";

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

// Mesmos limiares de hora que saudacao() (lib/settings.js), só que como
// rótulo substantivo — "Turno da X" — em vez de saudação ("Boa X"). O ícone
// usa os heroicons já presentes no projeto (sem nova dependência).
function turnoDoDia() {
  const h = new Date().getHours();
  if (h < 6) return { label: "Turno da madrugada", Icon: MoonIcon };
  if (h < 12) return { label: "Turno da manhã", Icon: SunIcon };
  if (h < 18) return { label: "Turno da tarde", Icon: SunIcon };
  return { label: "Turno da noite", Icon: MoonIcon };
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
  const turno = turnoDoDia();
  const planoPercentual = percentualConcluido(plano);
  const temQuestoes = resumo && resumo.totalQuestoes > 0;

  // Indicadores — só os que têm dado real entram; a largura de cada card se
  // adapta à contagem (não força 4 colunas quando só há 2 ou 3 reais).
  const indicadores = [
    ...(temQuestoes
      ? [{ key: "questoes", Icon: CheckBadgeIcon, label: "Questões resolvidas", valor: resumo.totalQuestoes }]
      : []),
    ...(temQuestoes && resumo.aproveitamento !== null
      ? [{
          key: "aproveitamento",
          Icon: ChartBarIcon,
          label: "Aproveitamento",
          valor: `${resumo.aproveitamento}%`,
          ...corPorPerformance(resumo.aproveitamento),
        }]
      : []),
    ...(streak > 0
      ? [{ key: "sequencia", Icon: FireIcon, label: "Sequência", valor: `${streak} ${streak === 1 ? "dia" : "dias"}` }]
      : []),
  ];
  const INDICADOR_GRID_CLASS = {
    1: "sm:grid-cols-1 sm:max-w-xs",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
  };

  // Atividade recente — combina as 3 fontes reais já carregadas (nenhum
  // dado inventado): última conversa, histórico de simulados e caderno.
  const atividades = [
    ...(lastChat
      ? [
          {
            key: `chat-${lastChat.updatedAt}`,
            tipo: "chat",
            timestamp: lastChat.updatedAt,
            titulo: "Conversa com o mentor",
            subtitulo: lastChat.materia || "Dúvida geral",
          },
        ]
      : []),
    ...listarSimulados()
      .slice(0, 5)
      .map((s) => ({
        key: `sim-${s.id ?? s.createdAt}`,
        tipo: "simulado",
        timestamp: s.createdAt,
        titulo: "Simulado concluído",
        subtitulo: `${s.acertos}/${s.total} acertos`,
        // Verde só quando faz sentido semanticamente (bom desempenho real);
        // os demais eventos ficam no tom neutro/vinho.
        positivo: s.total > 0 && s.acertos / s.total >= 0.7,
      })),
    ...cadItems.slice(0, 5).map((c) => ({
      key: `cad-${c.id}`,
      tipo: "caderno",
      timestamp: c.createdAt,
      titulo:
        c.origin === "simulado"
          ? "Erro registrado no caderno"
          : "Pergunta salva no caderno",
      subtitulo: c.materia || "Geral",
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="w-full max-w-[1600px] mx-auto px-4 pt-6 pb-10 sm:px-6 md:px-8 lg:px-10">
        {/* Header interno com wordmark + settings — mobile only. */}
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

        {/* ===== Header: saudação à esquerda + próxima prova compacta à direita ===== */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 sm:max-w-2xl">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="inline-flex items-center rounded-full bg-brass/5 border border-brass/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brass">
                {formatarDataCurta(new Date())}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-cream-600">
                <turno.Icon className="w-3.5 h-3.5 text-brass/70 shrink-0" aria-hidden="true" />
                {turno.label}
              </span>
            </div>
            <h1
              className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight flex items-center gap-2 flex-wrap"
              style={{ fontVariationSettings: '"opsz" 96' }}
            >
              {nome ? (
                <span>
                  {saudacao()},{" "}
                  <span className="relative inline-block italic text-brass">
                    {nome}.
                    <svg
                      className="pointer-events-none absolute -bottom-1.5 left-0 h-2 w-full overflow-visible text-brass/50"
                      viewBox="0 0 120 8"
                      fill="none"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 5.5C25 2 75 1.5 119 5.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
              ) : (
                "Bom estudo hoje."
              )}
            </h1>

            <p className="text-cream-400 text-sm leading-relaxed mt-2">
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
          </div>

          {/* Próxima prova — card compacto: quadrado vinho com os dias +
              label/data/ação; sem borda vinho envolvendo o card inteiro. */}
          {dias !== null && dias >= 0 && (
            <div className="w-full sm:w-auto sm:min-w-[240px] shrink-0 bg-ink-900 border border-ink-800 rounded-xl p-3 flex items-center gap-3">
              <div className="shrink-0 w-14 h-14 bg-brass rounded-lg flex flex-col items-center justify-center text-white">
                <span
                  className="font-serif text-xl leading-none"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  {dias}
                </span>
                <span className="text-[9px] uppercase tracking-wide leading-none mt-1">
                  {dias === 1 ? "dia" : "dias"}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] tracking-widest uppercase text-brass/70 font-medium mb-0.5">
                  Próxima prova OAB
                </div>
                <div className="text-xs text-cream-400 truncate">
                  {formatarDataLonga(settings.dataProva)}
                </div>
                <button
                  onClick={() => onGoto("cronograma-config")}
                  className="min-h-6 text-[11px] text-brass hover:underline transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Ajustar cronograma
                </button>
              </div>
            </div>
          )}
          {dias === null && (
            <button
              onClick={() => onGoto("cronograma-config")}
              className="w-full sm:w-auto sm:min-w-[240px] shrink-0 bg-ink-900 border border-ink-800 rounded-xl p-3 flex items-center gap-3 hover:border-brass/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              <div className="shrink-0 w-14 h-14 bg-brass/20 rounded-lg flex items-center justify-center text-brass">
                <span
                  className="font-serif text-xl leading-none"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  —
                </span>
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[10px] tracking-widest uppercase text-brass/70 font-medium mb-0.5">
                  Próxima prova OAB
                </div>
                <div className="text-[11px] text-cream-400">
                  Definir em Ajustar cronograma
                </div>
              </div>
            </button>
          )}
          {dias !== null && dias < 0 && (
            <button
              onClick={() => onGoto("cronograma-config")}
              className="w-full sm:w-auto sm:min-w-[240px] shrink-0 bg-ink-900 border border-ink-800 rounded-xl p-3 flex items-center gap-3 hover:border-brass/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              <div className="shrink-0 w-14 h-14 bg-alert/10 rounded-lg flex items-center justify-center text-alert">
                <span
                  className="font-serif text-xl leading-none"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  !
                </span>
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[10px] tracking-widest uppercase text-brass/70 font-medium mb-0.5">
                  Próxima prova OAB
                </div>
                <div className="text-[11px] text-cream-400">
                  Data já passou. Atualize em Ajustar cronograma
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ===== Faixa de ação do dia — reaproveita o nudge real de "ainda não estudou" ===== */}
        {!estudouHoje && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-ink-900 border border-ink-800 rounded-xl px-4 py-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-full bg-brass/10 flex items-center justify-center shrink-0">
                <BookOpenIcon className="w-4 h-4 text-brass" aria-hidden="true" />
              </span>
              <p className="text-sm text-cream-400 truncate">
                Você ainda não iniciou sua meta de hoje. Que tal aquecer com um
                simulado rápido de 10 questões comentadas?
              </p>
            </div>
            <button
              onClick={() => onGoto("simulado-landing")}
              className="shrink-0 min-h-9 text-xs font-medium text-ink-950 bg-brass hover:bg-brass-hover px-3.5 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Iniciar Aquecimento
            </button>
          </div>
        )}

        {/* ===== Indicadores — compactos, só com dado real; ficam acima da divisão em colunas ===== */}
        {indicadores.length > 0 && (
          <div className={`grid grid-cols-1 gap-3 mb-6 ${INDICADOR_GRID_CLASS[indicadores.length]}`}>
            {indicadores.map((ind) => (
              <IndicatorCard key={ind.key} {...ind} />
            ))}
          </div>
        )}

        {/* ===== Coluna principal (Foco de hoje + Matérias) + coluna lateral
            (Progresso + Atividade recente) — 2 colunas a partir de lg. ===== */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)] lg:items-start lg:gap-6">
          {/* Coluna principal */}
          <div className="flex flex-col gap-6 min-w-0">
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
                  <section aria-labelledby="foco-de-hoje">
                    <div className="bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5">
                      <div className="flex flex-col gap-2 pb-3 mb-4 border-b border-ink-800 sm:flex-row sm:items-baseline sm:justify-between">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <p className="text-[11px] tracking-widest uppercase text-brass/70 font-medium">
                            Foco de hoje
                          </p>
                          <h2
                            id="foco-de-hoje"
                            className="font-serif text-xl text-cream-50 leading-tight"
                            style={{ fontVariationSettings: '"opsz" 60' }}
                          >
                            {materias.length > 0
                              ? materias.join(" & ")
                              : "Seu plano de hoje"}
                          </h2>
                        </div>
                        <span
                          className="self-start shrink-0 text-xs font-medium text-brass bg-brass/10 px-3 py-1.5 rounded-full tabular-nums"
                          aria-label={`${concluidos} de ${totalItens} blocos concluídos`}
                        >
                          {concluidos} de {totalItens} concluído
                          {concluidos === 1 && totalItens === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {diaHoje.itens.map((item, i) => (
                          <FocoHojeItem key={item.id ?? i} item={item} onGoto={onGoto} />
                        ))}
                      </div>
                      <button
                        onClick={() => onGoto("cronograma")}
                        className="min-h-9 text-xs text-brass hover:bg-brass/5 mt-2 px-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                      >
                        Ver plano completo
                      </button>
                    </div>
                  </section>
                );
              })()}

            {porMateria.length > 0 && (
              <section aria-labelledby="materias-atencao">
                <div className="bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-baseline justify-between gap-3 pb-3 mb-4 border-b border-ink-800">
                    <h2 id="materias-atencao" className="flex items-center gap-1.5 text-[11px] tracking-widest uppercase text-brass/70 font-medium">
                      <ExclamationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                      Matérias que pedem atenção
                    </h2>
                    <button
                      onClick={() => onGoto("estatisticas")}
                      className="min-h-10 text-xs text-brass hover:bg-brass/5 px-2 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                    >
                      Ver todas
                    </button>
                  </div>
                  <div className="space-y-2">
                    {porMateria.slice(0, 3).map((m) => (
                      <MateriaAtencaoRow key={m.materia} m={m} onGoto={onGoto} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-6 min-w-0">
            {planoPercentual !== null && (
              <ProgressoCard
                planoPercentual={planoPercentual}
                resumo={resumo}
                streak={streak}
              />
            )}

            {/*Atividade recente — timeline vertical; combina 3 fontes reais já
                carregadas (chat, histórico de simulados, caderno)*/}
            <section aria-labelledby="atividade-recente">
              <div className="bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-3 pb-3 mb-4 border-b border-ink-800">
                  <h2 id="atividade-recente" className="text-[11px] tracking-widest uppercase text-brass/70 font-medium">
                    Atividade recente
                  </h2>
                  <button
                    onClick={() => onGoto("estatisticas")}
                    className="min-h-10 text-xs text-brass hover:bg-brass/5 px-2 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                  >
                    Ver histórico
                  </button>
                </div>
                {atividades.length === 0 ? (
                  <p className="text-sm text-cream-400">
                    Sua atividade recente aparece aqui.
                  </p>
                ) : (
                  <div>
                    {atividades.map((a, i) => (
                      <AtividadeTimelineItem
                        key={a.key}
                        atividade={a}
                        ultimo={i === atividades.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <button
          onClick={() => onGoto("estatisticas")}
          className="w-full min-h-11 text-left text-xs text-cream-400 hover:text-brass mt-4 py-2 flex items-center gap-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 md:hidden"
        >
          Ver estatísticas de progresso
        </button>
      </div>
    </div>
  );
}

// Categoria real derivada de item.tipo (único dado categórico que existe —
// não inventa "TEORIA + QUESTÕES" etc. sem equivalente real).
const CATEGORIA_LABEL = { revisar: "Revisão", simulado: "Simulado", caderno: "Caderno" };

// Título em negrito + subtítulo muted — só com campos reais do item
// (tipo/matéria/minutos; simulado sempre tem 10 questões, é constante
// da geração no backend, não é valor inventado).
function focoHojeTextos(item) {
  const categoria = CATEGORIA_LABEL[item.tipo] || "Revisão";
  if (item.tipo === "simulado") {
    return { titulo: "Simulado rápido", subtitulo: `10 questões · ~${item.minutos} min`, categoria };
  }
  if (item.tipo === "caderno") {
    return { titulo: "Revisar caderno", subtitulo: `${item.minutos} min`, categoria };
  }
  return { titulo: item.materia, subtitulo: `${item.minutos} min`, categoria };
}

// Item individual do "Foco de hoje" — cartão interno leve (bg-sand-50) sobre
// a superfície branca do card. Ação à direita varia por tipo real:
// "Estudar" (revisar, secondary), "Abrir notas" (caderno, ghost) ou
// "Começar" (simulado, primary) — sem seta nos botões.
function FocoHojeItem({ item, onGoto }) {
  const { titulo, subtitulo, categoria } = focoHojeTextos(item);

  if (item.concluido) {
    return (
      <div className="flex items-center gap-3 bg-sand-50 border border-brass/10 rounded-xl p-3">
        <CheckCircleIcon
          className="w-5 h-5 shrink-0"
          style={{ color: "#10b981" }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold line-through truncate text-cream-600">
            {titulo}
          </div>
          <div className="text-xs text-cream-600">{subtitulo}</div>
        </div>
        <span className="text-xs shrink-0 text-cream-600">Concluído</span>
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
    <div className="flex items-center gap-3 bg-sand-50 border border-brass/10 rounded-xl p-3">
      <span className="w-5 h-5 rounded-full border-2 border-ink-700 shrink-0"></span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate text-cream-50">
            {titulo}
          </span>
          <span className="shrink-0 text-[9px] tracking-wide uppercase font-medium text-brass bg-brass/10 px-1.5 py-0.5 rounded">
            {categoria}
          </span>
        </div>
        <div className="text-xs text-cream-400 mt-0.5">{subtitulo}</div>
      </div>
      {item.tipo === "simulado" && (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 min-h-9 text-xs font-medium px-3.5 py-1.5 rounded-lg transition-colors text-ink-950 bg-brass hover:bg-brass-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
        >
          Começar
        </button>
      )}
      {item.tipo === "revisar" && (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 min-h-9 text-xs font-medium px-3.5 py-1.5 rounded-lg border border-ink-800 bg-ink-950 hover:bg-brass/5 transition-colors text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
        >
          Estudar
        </button>
      )}
      {item.tipo === "caderno" && (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 min-h-9 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors text-brass hover:bg-brass/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
        >
          Abrir notas
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

function MateriaAtencaoRow({ m, onGoto }) {
  const p = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0;
  const { texto } = corPorPerformance(p);
  return (
    <div className="flex items-center gap-4 bg-sand-50 border border-brass/10 rounded-xl p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm text-cream-50 font-medium truncate">
            {m.materia}
          </span>
          <span className="text-xs font-semibold shrink-0" style={{ color: texto }}>
            {p}%
          </span>
        </div>
        <div
          className="h-1.5 bg-ink-800 rounded-full overflow-hidden"
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
      </div>
      <button
        onClick={() => onGoto("chat")}
        className="shrink-0 min-h-9 text-xs font-medium text-brass border border-brass/20 hover:bg-brass/5 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50"
        aria-label={`Revisar ${m.materia} com o mentor. Aproveitamento: ${p}%.`}
      >
        Revisar
      </button>
    </div>
  );
}

// Card compacto de indicador — ícone + label + valor, pouco espaço vertical.
// `texto`/`fundo` (opcionais) reaproveitam corPorPerformance pro Aproveitamento
// (verde/âmbar/vermelho real, não cor decorativa arbitrária).
function IndicatorCard({ Icon, label, valor, texto, fundo }) {
  return (
    <div className="flex items-center gap-3 bg-ink-950 border border-ink-800 rounded-xl px-4 py-3">
      <span
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${fundo ? "" : "bg-brass/10"}`}
        style={fundo ? { backgroundColor: fundo } : undefined}
      >
        <Icon
          className={`w-4 h-4 ${texto ? "" : "text-brass"}`}
          style={texto ? { color: texto } : undefined}
          aria-hidden="true"
        />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] tracking-widest uppercase text-brass/70 font-medium truncate">
          {label}
        </div>
        <div
          className="font-serif text-xl text-cream-50 leading-tight"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          {valor}
        </div>
      </div>
    </div>
  );
}

// Anel de progresso simples em SVG (sem dependência nova). stroke-dasharray
// representa o percentual real; 0% desenha o anel vazio corretamente.
function CircularProgress({ percent, size = 104, stroke = 9 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-ink-800"
        strokeWidth={stroke}
      />
      {percent > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-brass"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// "Progresso geral" — anel com o % real do plano em destaque, mais linhas
// compactas pros demais indicadores reais já carregados.
function ProgressoCard({ planoPercentual, resumo, streak }) {
  const linhas = [
    ...(resumo && resumo.totalQuestoes > 0
      ? [{ key: "questoes", label: "Questões resolvidas", valor: resumo.totalQuestoes }]
      : []),
    ...(resumo && resumo.totalQuestoes > 0 && resumo.aproveitamento !== null
      ? [{ key: "aproveitamento", label: "Aproveitamento", valor: `${resumo.aproveitamento}%` }]
      : []),
    ...(streak > 0
      ? [{ key: "sequencia", label: "Sequência", valor: `${streak} ${streak === 1 ? "dia" : "dias"}` }]
      : []),
  ];

  return (
    <div className="bg-ink-950 border border-ink-800 rounded-2xl p-5">
      <p className="text-[11px] tracking-widest uppercase text-brass/70 font-medium pb-3 mb-4 border-b border-ink-800">
        Progresso geral
      </p>
      <div
        className="relative mx-auto mb-4"
        style={{ width: 120, height: 120 }}
        role="progressbar"
        aria-label="Progresso do plano de estudos"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={planoPercentual}
      >
        <CircularProgress percent={planoPercentual} size={120} stroke={8} />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <span
            className="font-serif text-3xl text-cream-50 leading-none tabular-nums"
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            {planoPercentual}%
          </span>
          <span className="font-sans text-[10px] uppercase tracking-wide text-cream-600 leading-tight mt-1.5">
            concluído
          </span>
        </div>
      </div>
      {linhas.length > 0 && (
        <div className="divide-y divide-ink-800">
          {linhas.map((l) => (
            <div key={l.key} className="flex items-center justify-between py-2">
              <span className="text-sm text-cream-400">{l.label}</span>
              <span
                className="font-serif text-base text-cream-50"
                style={{ fontVariationSettings: '"opsz" 60' }}
              >
                {l.valor}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Timeline vertical — ponto + linha conectando os eventos via flexbox (sem
// posicionamento absoluto com valores mágicos). Verde só quando a atividade
// é semanticamente positiva (ex.: simulado com bom desempenho real).
function AtividadeTimelineItem({ atividade, ultimo }) {
  const corPonto = atividade.positivo ? "bg-[#10b981]" : "bg-brass";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <span className={`w-2 h-2 rounded-full mt-1.5 ${corPonto}`} aria-hidden="true" />
        {!ultimo && <span className="w-px flex-1 bg-ink-800 my-1" aria-hidden="true" />}
      </div>
      <div className={`min-w-0 ${ultimo ? "" : "pb-5"}`}>
        <div className="text-sm text-cream-50 font-medium truncate">
          {atividade.titulo}
        </div>
        <div className="text-xs text-cream-400 mt-0.5 truncate">
          {atividade.subtitulo} · {tempoRelativo(atividade.timestamp)}
        </div>
      </div>
    </div>
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
