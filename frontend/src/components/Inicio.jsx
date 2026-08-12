import {
  AcademicCapIcon,
  BookmarkIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  ClockIcon,
  FireIcon,
  FlagIcon,
  HandRaisedIcon,
  ListBulletIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  ScaleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { authFetchJson } from "../lib/api";
import {
  contarPorStatus,
  listar as listarCaderno,
  subscribe as subscribeCaderno,
} from "../lib/caderno";
import {
  itemDescricao,
  loadPlano,
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

function SectionLabel({ children, className = "" }) {
  return (
    <div
      className={`text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3 ${className}`}
    >
      {children}
    </div>
  );
}

export default function Inicio({ onGoto, onOpenSettings, onDiscussCadItem }) {
  const [settings, setSettings] = useState(loadSettings());
  const [lastChat, setLastChat] = useState(loadLastChat());
  const [lastSim, setLastSim] = useState(ultimoSimulado());
  const [cadItems, setCadItems] = useState(listarCaderno());
  const [cadCounts, setCadCounts] = useState(contarPorStatus());
  const [plano, setPlano] = useState(loadPlano());
  const [streak, setStreak] = useState(0);
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    const u1 = subscribeSettings(() => setSettings(loadSettings()));
    const u2 = subscribeActivity(() => setLastChat(loadLastChat()));
    const u3 = subscribeCaderno(() => {
      setCadItems(listarCaderno());
      setCadCounts(contarPorStatus());
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

  // Progresso até a prova, baseado em quando o plano foi gerado.
  let progressoProva = null;
  if (planoValido && plano.geradoEm && settings.dataProva) {
    const inicio = new Date(plano.geradoEm).getTime();
    const fim = new Date(settings.dataProva + "T00:00:00").getTime();
    if (fim > inicio) {
      progressoProva = Math.min(
        100,
        Math.max(0, Math.round(((Date.now() - inicio) / (fim - inicio)) * 100)),
      );
    }
  }

  const frase = fraseDoDia(dias);
  const mostrarResumo = streak > 0 || (resumo && resumo.totalQuestoes > 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-6 pt-6 pb-8 md:max-w-[1100px] md:mx-auto md:px-10">
        {/* Header interno com wordmark + settings — mobile only, sidebar cobre desktop */}
        <div className="flex items-baseline justify-between mb-8 md:hidden">
          <div>
            <span
              className="font-serif text-xl text-cream-50"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              Facilita
            </span>
            <span
              className="font-serif text-xl text-brass ml-1.5"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              OAB
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-cream-400 hover:text-cream-50 transition-colors p-1"
            aria-label="Ajustes"
          >
            <CogIcon />
          </button>
        </div>

        {/* Saudação */}
        <h1
          className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight mb-4 flex items-center gap-2 flex-wrap"
          style={{ fontVariationSettings: '"opsz" 96' }}
        >
          {nome ? (
            <>
              <span>
                {saudacao()}, <span className="text-brass">{nome}</span>
              </span>
              <HandRaisedIcon className="w-5 h-5 text-brass-dim shrink-0" />
            </>
          ) : (
            "Bom estudo hoje."
          )}
        </h1>

        {/* Frase motivacional + sequência/lembrete */}
        <p className="text-cream-400 text-sm mb-2 flex items-start gap-2">
          <frase.Icon className="w-4 h-4 shrink-0 mt-0.5 text-brass-dim" />
          <span>{frase.texto}</span>
        </p>
        {!estudouHoje && (
          <button
            onClick={() => onGoto("simulado-landing")}
            className="text-sm text-cream-400 hover:text-brass transition-colors text-left flex items-start gap-2 mb-3"
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

        {/* Resumo rápido: sequência, questões, aproveitamento */}
        {mostrarResumo && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-cream-400 mb-8">
            {streak > 0 && (
              <span className="flex items-center gap-1.5">
                <FireIcon className="w-4 h-4 text-brass-dim" /> Sequência:{" "}
                {streak} {streak === 1 ? "dia" : "dias"}
              </span>
            )}
            {resumo && resumo.totalQuestoes > 0 && (
              <>
                <span className="flex items-center gap-1.5">
                  <ListBulletIcon className="w-4 h-4 text-brass-dim" /> Questões
                  resolvidas: {resumo.totalQuestoes}
                </span>
                <span className="flex items-center gap-1.5">
                  <ChartPieIcon className="w-4 h-4 text-brass-dim" />{" "}
                  Aproveitamento: {resumo.aproveitamento}%
                </span>
              </>
            )}
          </div>
        )}
        {!mostrarResumo && <div className="mb-8" />}

        {/* Próxima prova + Plano de hoje lado a lado no desktop */}
        <div
          className={`mb-8 ${diaHoje ? "md:grid md:grid-cols-2 md:gap-4 md:items-start" : ""}`}
        >
          <div>
            {dias !== null && dias >= 0 && (
              <div className="bg-ink-900 border border-ink-800 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium flex items-center gap-1.5">
                    <CalendarDaysIcon className="w-3.5 h-3.5" /> Próxima prova
                  </div>
                  <div className="text-xs text-cream-400">
                    {formatarDataLonga(settings.dataProva)}
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span
                    className="font-serif text-5xl text-brass leading-none"
                    style={{ fontVariationSettings: '"opsz" 144' }}
                  >
                    {dias}
                  </span>
                  <span className="text-sm text-cream-400">
                    {dias === 1 ? "dia restante" : "dias restantes"}
                  </span>
                </div>
                {progressoProva !== null && (
                  <div className="mb-3">
                    <div className="h-2.5 bg-ink-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brass rounded-full transition-all duration-500"
                        style={{ width: `${progressoProva}%` }}
                      ></div>
                    </div>
                    <div className="text-[11px] text-cream-600 mt-1.5">
                      {progressoProva}% do caminho percorrido
                    </div>
                  </div>
                )}
                <div className="text-xs text-brass-dim font-medium">
                  {dias <= 10
                    ? "Reta final — foque nas revisões!"
                    : "Continue firme!"}
                </div>
              </div>
            )}
            {dias === null && (
              <button
                onClick={() => onGoto("cronograma-config")}
                className="w-full h-full bg-ink-900 border border-ink-800 rounded-2xl p-6 text-left hover:border-brass-dim transition-colors"
              >
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3 flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-3.5 h-3.5" /> Próxima prova
                </div>
                <div
                  className="font-serif text-5xl text-brass leading-none mb-4"
                  style={{ fontVariationSettings: '"opsz" 144' }}
                >
                  —
                </div>
                <div className="text-xs text-brass-dim font-medium">
                  Defina em Ajustar plano →
                </div>
              </button>
            )}
            {dias !== null && dias < 0 && (
              <button
                onClick={() => onGoto("cronograma-config")}
                className="w-full h-full bg-ink-900 border border-ink-800 border-dashed rounded-2xl p-5 text-left hover:border-brass-dim transition-colors"
              >
                <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                  Próxima prova
                </div>
                <div className="text-sm text-cream-400">
                  A data configurada já passou. Atualize em Ajustar plano →
                </div>
              </button>
            )}
          </div>

          {/* Plano de hoje */}
          {diaHoje &&
            (() => {
              const pendentes = diaHoje.itens.filter((i) => !i.concluido);
              const totalItens = diaHoje.itens.length;
              return (
                <div className="mt-8 md:mt-0">
                  <SectionLabel>Plano de hoje</SectionLabel>
                  <button
                    onClick={() => onGoto("cronograma")}
                    className="w-full text-left bg-ink-900 border border-brass-dim rounded-2xl p-5 hover:bg-ink-800/40 transition-colors group"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <span className="text-[11px] tracking-widest uppercase text-brass font-medium">
                        Estude hoje
                      </span>
                      <span className="text-xs text-cream-400 tabular-nums">
                        {diaHoje.itens.filter((i) => i.concluido).length}/
                        {totalItens}
                      </span>
                    </div>
                    {pendentes.length === 0 ? (
                      <p className="text-sm text-cream-400 italic">
                        Tudo concluído hoje. Bom trabalho.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {pendentes.slice(0, 3).map((item, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm text-cream-50"
                          >
                            <span className="w-1 h-1 rounded-full bg-brass mt-2 shrink-0"></span>
                            <span>{itemDescricao(item)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-brass-dim mt-3 flex items-center gap-1.5 group-hover:text-brass transition-colors">
                      Abrir o plano{" "}
                      <span className="group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </div>
                  </button>
                </div>
              );
            })()}
        </div>

        {/* Ações rápidas */}
        <SectionLabel>Ações rápidas</SectionLabel>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => onGoto("chat")}
            className="bg-ink-900 border border-ink-800 rounded-2xl p-6 text-left hover:border-brass-dim hover:bg-ink-800/40 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="w-7 h-7 mb-3 text-brass" />
            <div className="text-sm text-cream-50 font-medium mb-1">
              Chat IA
            </div>
            <div className="text-xs text-brass-dim">
              {lastChat ? "Continuar" : "Iniciar"} →
            </div>
          </button>
          <button
            onClick={() => onGoto("simulado-landing")}
            className="bg-ink-900 border border-ink-800 rounded-2xl p-6 text-left hover:border-brass-dim hover:bg-ink-800/40 transition-colors"
          >
            <PencilSquareIcon className="w-7 h-7 mb-3 text-brass" />
            <div className="text-sm text-cream-50 font-medium mb-1">
              Simulado
            </div>
            <div className="text-xs text-brass-dim">
              {lastSim ? `${lastSim.acertos}/${lastSim.total}` : "Iniciar"} →
            </div>
          </button>
          <button
            onClick={() => onGoto("caderno")}
            className="bg-ink-900 border border-ink-800 rounded-2xl p-6 text-left hover:border-brass-dim hover:bg-ink-800/40 transition-colors"
          >
            <BookmarkIcon className="w-7 h-7 mb-3 text-brass" />
            <div className="text-sm text-cream-50 font-medium mb-1">
              Caderno
            </div>
            <div className="text-xs text-brass-dim">
              {cadCounts.aberto > 0 ? `${cadCounts.aberto} abertas` : "Em dia"}{" "}
              →
            </div>
          </button>
        </div>

        {/* Atividade recente */}
        {(lastChat || (!diaHoje && !lastChat)) && (
          <SectionLabel>Atividade recente</SectionLabel>
        )}
        {lastChat && (
          <button
            onClick={() => onGoto("chat")}
            className="w-full text-left bg-ink-900 border border-ink-800 rounded-2xl p-5 hover:border-brass-dim hover:bg-ink-800/40 transition-colors group"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm text-cream-50 font-medium">
                Última conversa
              </span>
              <span className="text-[11px] text-cream-600 shrink-0">
                {tempoRelativo(lastChat.updatedAt)}
              </span>
            </div>
            <div className="text-sm text-cream-400 italic line-clamp-2">
              &ldquo;{lastChat.pergunta.slice(0, 100)}
              {lastChat.pergunta.length > 100 ? "…" : ""}&rdquo;
            </div>
            <div className="text-xs text-brass-dim mt-3 flex items-center gap-1.5 group-hover:text-brass transition-colors">
              Continuar{" "}
              <span className="group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
          </button>
        )}

        {!diaHoje && !lastChat && (
          <button
            onClick={() => onGoto("chat")}
            className="w-full text-left bg-ink-900 border border-ink-800 rounded-2xl p-5 hover:border-brass-dim transition-colors"
          >
            <div
              className="font-serif text-lg text-cream-50 mb-1"
              style={{ fontVariationSettings: '"opsz" 60' }}
            >
              Ou apenas conversar
            </div>
            <div className="text-sm text-cream-400">
              Pergunte qualquer coisa sobre a 1ª fase →
            </div>
          </button>
        )}

        <button
          onClick={() => onGoto("estatisticas")}
          className="w-full text-left text-xs text-cream-400 hover:text-brass mt-4 py-2 flex items-center gap-1.5 transition-colors md:hidden"
        >
          Ver estatísticas de progresso <span>→</span>
        </button>
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
