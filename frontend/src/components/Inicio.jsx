import {
  AcademicCapIcon,
  BookOpenIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  RocketLaunchIcon,
  ScaleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
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
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-none md:mx-0 md:px-8 md:py-10">
        {/* Header interno com wordmark + settings — mobile only. Fica FORA do card, como a sidebar. */}
        <div className="flex items-baseline justify-between mb-4 md:hidden">
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

        {/* Card flutuante — envolve todo o conteúdo principal da Início */}
        <div className="bg-ink-950 rounded-2xl shadow-sm p-6 md:p-10">
          {/* ===== Bloco 1: Data + Saudação + contagem regressiva pra prova ===== */}
          <div className="flex items-start justify-between gap-6 flex-wrap mb-4">
            <div className="min-w-0">
              <div className="text-[11px] tracking-widest uppercase text-brass font-medium mb-2">
                {formatarDataCurta(new Date())}
              </div>
              <h1
                className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight flex items-center gap-2 flex-wrap"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                {nome ? (
                  <span>
                    {saudacao()}, <span className="text-brass">{nome}</span>.
                  </span>
                ) : (
                  "Bom estudo hoje."
                )}
              </h1>
            </div>

            {dias !== null && dias >= 0 && (
              <div className="text-right shrink-0">
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
              </div>
            )}
            {dias === null && (
              <button
                onClick={() => onGoto("cronograma-config")}
                className="text-right shrink-0 hover:opacity-70 transition-opacity"
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
                className="text-right shrink-0 hover:opacity-70 transition-opacity"
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

          <p className="text-cream-400 text-sm mb-8">
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
              className="text-sm text-cream-400 hover:text-brass transition-colors text-left flex items-start gap-2 mb-8 -mt-6"
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

          {/* ===== Bloco 2: Foco de hoje ===== */}
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
                <div className="mb-8">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                        Foco de hoje
                      </div>
                      {materias.length > 0 && (
                        <div
                          className="font-serif text-xl text-cream-50"
                          style={{ fontVariationSettings: '"opsz" 60' }}
                        >
                          {materias.join(" & ")}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-brass-dim bg-brass/10 px-2.5 py-1 rounded-full tabular-nums">
                      {concluidos} de {totalItens} concluído
                      {concluidos === 1 && totalItens === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5">
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
                      className="text-xs text-brass-dim hover:text-brass mt-4 flex items-center gap-1.5 transition-colors"
                    >
                      Ver plano completo <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          {/* ===== Bloco 3: Sequência + Aproveitamento (fundidos) ===== */}
          {mostrarResumo && (
            <div className="bg-ink-900 border border-ink-800 rounded-2xl px-6 py-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-cream-400 mb-8">
              {streak > 0 && (
                <span className="flex items-baseline gap-1.5">
                  <span
                    className="font-serif text-2xl text-cream-50"
                    style={{ fontVariationSettings: '"opsz" 96' }}
                  >
                    {streak}
                  </span>
                  {streak === 1 ? "dia seguido" : "dias seguidos"}
                </span>
              )}
              {streak > 0 && resumo && resumo.totalQuestoes > 0 && (
                <span className="text-cream-600">·</span>
              )}
              {resumo && resumo.totalQuestoes > 0 && (
                <span className="flex items-baseline gap-1.5">
                  <span
                    className="font-serif text-2xl text-cream-50"
                    style={{ fontVariationSettings: '"opsz" 96' }}
                  >
                    {resumo.aproveitamento}%
                  </span>
                  de aproveitamento
                </span>
              )}
            </div>
          )}

          {/* ===== Bloco 4: Matérias que pedem atenção ===== */}
          {porMateria.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <span className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                  Matérias que pedem atenção
                </span>
                <button
                  onClick={() => onGoto("estatisticas")}
                  className="text-xs text-brass-dim hover:text-brass transition-colors"
                >
                  Ver todas →
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {porMateria.slice(0, 3).map((m) => (
                  <MateriaAtencaoCard key={m.materia} m={m} onGoto={onGoto} />
                ))}
              </div>
            </div>
          )}
        </div>

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
      <div className="flex items-center gap-3 py-3">
        <CheckCircleIcon
          className="w-6 h-6 shrink-0"
          style={{ color: "#10b981" }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-cream-600 line-through truncate">
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
    <div className="flex items-center gap-3 py-3">
      <span className="w-6 h-6 rounded-full border-2 border-ink-700 shrink-0"></span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-cream-50 truncate">
          {titulo}
        </div>
        <div className="text-xs text-cream-400">{subtitulo}</div>
      </div>
      {item.tipo === "simulado" ? (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 text-xs font-medium text-cream-50 bg-brass hover:bg-brass-hover px-3.5 py-2 rounded-lg transition-colors"
        >
          Começar
        </button>
      ) : (
        <button
          onClick={() => onGoto(destino)}
          className="shrink-0 text-xs font-medium text-brass hover:text-brass-hover transition-colors"
        >
          Abrir
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
      className="text-left bg-ink-900 border border-ink-800 rounded-2xl p-4 hover:border-brass-dim transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
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
      <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${p}%`, backgroundColor: texto }}
        ></div>
      </div>
      <span className="text-xs text-brass-dim">
        {p < 60 ? "Revisar" : "Continuar"} →
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
