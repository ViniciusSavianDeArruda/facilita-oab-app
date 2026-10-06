import {
  ArrowTrendingDownIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckBadgeIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  FireIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import Brand from "./Brand";
import { ItemCheckbox } from "./Cronograma";
import { useEffect, useState } from "react";
import { authFetchJson } from "../lib/api";
import {
  listar as listarCaderno,
  subscribe as subscribeCaderno,
} from "../lib/caderno";
import {
  loadPlano,
  marcarItemConcluido,
  percentualConcluido,
  planoDeHoje,
  planoEstaValido,
  planoFoiCarregado,
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
  { texto: "Cada questão resolvida hoje aproxima você da aprovação." },
  { texto: "A aprovação é construída um estudo de cada vez." },
  { texto: "Pequenos avanços diários geram grandes resultados." },
  { texto: "Seu futuro como advogado começa com a próxima questão." },
  { texto: "Continue firme. A OAB recompensa a constância." },
];

const FRASES_RETA_FINAL = [
  { texto: "Faltam poucos dias. Mantenha o ritmo!" },
  { texto: "Hora da reta final. Foque nas revisões." },
  { texto: "Você chegou até aqui. Continue!" },
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

// Registros legados ou de teste podem não seguir o formato atual de 10 questões.
function resultadoCompativelComSintese(resultado) {
  return Boolean(
    resultado &&
    Number.isFinite(Date.parse(resultado.createdAt)) &&
    Array.isArray(resultado.questoes) &&
    resultado.questoes.length === 10 &&
    resultado.total === resultado.questoes.length &&
    Number.isInteger(resultado.acertos) &&
    resultado.acertos >= 0 &&
    resultado.acertos <= resultado.total,
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
  const [planoConsultado, setPlanoConsultado] = useState(planoFoiCarregado());
  const [streak, setStreak] = useState(0);
  const [resumo, setResumo] = useState(null);
  const [porMateria, setPorMateria] = useState([]);

  useEffect(() => {
    const u1 = subscribeSettings(() => setSettings(loadSettings()));
    const u2 = subscribeActivity(() => setLastChat(loadLastChat()));
    const u3 = subscribeCaderno(() => {
      setCadItems(listarCaderno());
    });
    const u4 = subscribeCrono(() => {
      setPlano(loadPlano());
      setPlanoConsultado(planoFoiCarregado());
    });
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
        // Sem a guarda, um payload sem `trend` lança dentro do .then() e cai
        // no .catch(), deixando `resumo` nulo para sempre — o que congela a
        // Home num limbo de carregamento.
        const trend = Array.isArray(s.trend) ? s.trend : [];
        const totalQuestoes = trend.reduce((acc, t) => acc + (t.total || 0), 0);
        const totalAcertos = trend.reduce((acc, t) => acc + (t.acertos || 0), 0);
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
  // Plano existe mas não cobre mais a data da prova atual. Não é o mesmo que
  // "hoje está livre": o plano precisa ser regerado, não apenas consultado.
  const planoDesatualizado = Boolean(plano) && !planoValido;

  const resultadosValidos = listarSimulados()
    .filter(resultadoCompativelComSintese)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const ultimoResultado = resultadosValidos[0];
  const resultadoAnterior = resultadosValidos[1];
  const percentualUltimo = ultimoResultado
    ? Math.round((ultimoResultado.acertos / ultimoResultado.total) * 100)
    : null;
  const diferencaPontos = resultadoAnterior &&
    Date.parse(ultimoResultado.createdAt) > Date.parse(resultadoAnterior.createdAt)
    ? percentualUltimo - Math.round((resultadoAnterior.acertos / resultadoAnterior.total) * 100)
    : null;

  const estudouHoje =
    isHoje(lastChat?.updatedAt) ||
    isHoje(lastSim?.updatedAt) ||
    Boolean(diaHoje && diaHoje.itens.some((i) => i.concluido));

  const frase = fraseDoDia(dias);
  const turno = turnoDoDia();
  const planoPercentual = percentualConcluido(plano);
  const temQuestoes = resumo && resumo.totalQuestoes > 0;

  // Ausência de plano só é confirmada após a leitura bem-sucedida do endpoint.
  // Uma falha de /me/stats também impede o estado inicial.
  const statsCarregou = resumo !== null;
  const semPlano = planoPercentual === null;
  const ausenciaConfirmada = !semPlano || (statsCarregou && planoConsultado);

  // Indicadores — só os que têm dado real entram; a largura de cada card se
  // adapta à contagem (não força 4 colunas quando só há 2 ou 3 reais). Os três
  // compartilham o mesmo vocabulário visual: nenhum recebe cor própria, porque
  // a diferença entre eles é de métrica, não de severidade.
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
  // `destino` só é preenchido quando existe rota real para o conteúdo. Não há
  // rota para reabrir o resultado de um simulado passado, então simulado fica
  // informativo — nada de hover/chevron fingindo interatividade.
  const atividades = [
    ...(lastChat
      ? [
          {
            key: `chat-${lastChat.updatedAt}`,
            tipo: "chat",
            timestamp: lastChat.updatedAt,
            rotulo: "Mentor Jurídico",
            descricao:
              lastChat.pergunta || lastChat.materia || "Dúvida geral",
            destino: "chat",
          },
        ]
      : []),
    ...listarSimulados()
      .slice(0, 5)
      .map((s) => {
        const percentual =
          s.total > 0 ? Math.round((s.acertos / s.total) * 100) : null;
        return {
          key: `sim-${s.id ?? s.createdAt}`,
          tipo: "simulado",
          timestamp: s.createdAt,
          rotulo: "Simulado",
          descricao:
            percentual === null
              ? `${s.acertos}/${s.total} acertos`
              : `${s.acertos}/${s.total} acertos · ${percentual}% de aproveitamento`,
          destino: null,
        };
      }),
    ...cadItems.slice(0, 5).map((c) => ({
      key: `cad-${c.id}`,
      tipo: "caderno",
      timestamp: c.createdAt,
      rotulo: "Caderno",
      descricao: c.pergunta || c.materia || "Geral",
      destino: "caderno",
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 4);

  // Não afirma "primeiro acesso": os sinais provam ausência de dados, não que
  // a pessoa nunca usou o app. Depende de `statsCarregou` para não aparecer
  // durante a carga nem quando /me/stats falha.
  const estadoInicial =
    statsCarregou &&
    planoConsultado &&
    semPlano &&
    resultadosValidos.length === 0 &&
    atividades.length === 0 &&
    resumo.totalQuestoes === 0 &&
    streak === 0;

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="w-full max-w-[1600px] mx-auto px-4 pt-6 pb-10 sm:px-6 md:px-8 lg:px-10">
        {/* Header interno com wordmark + settings — mobile only. */}
        <div
          className="dashboard-enter flex items-baseline justify-between mb-4 md:hidden"
          style={{ "--dashboard-delay": "0ms" }}
        >
          <Brand size="mobile" />
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-cream-400 hover:text-cream-50 transition-[color,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"
            aria-label="Ajustes"
          >
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* ===== Header: saudação à esquerda + próxima prova compacta à direita ===== */}
        <div
          className={`dashboard-enter flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${ultimoResultado ? "mb-4" : "mb-6"}`}
          style={{ "--dashboard-delay": "40ms" }}
        >
          <div className="min-w-0 sm:max-w-2xl">
            <div className="mb-2.5 inline-flex w-fit items-center gap-2 rounded-full border border-surface-pill-border bg-surface-pill px-3.5 py-1.5">
              <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-brass">
                {formatarDataCurta(new Date())}
              </span>
              <span className="select-none text-xs leading-none text-brass/[0.35]" aria-hidden="true">
                •
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-normal leading-none text-cream-450">
                <turno.Icon className="h-3.5 w-3.5 shrink-0 text-brass/60" aria-hidden="true" />
                {turno.label}
              </span>
            </div>
            <h1
              className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight flex items-center gap-2 flex-wrap"
              style={{ fontVariationSettings: '"opsz" 96' }}
            >
              {nome ? (
                <span className="font-medium">
                  {saudacao()},{" "}
                  <span className="relative inline-block font-semibold italic text-brass">
                    {nome}.
                    {/* `preserveAspectRatio="none"` estica a curva até a
                        largura real do nome — é o que queremos. O que não
                        queremos é o traço engrossar/afinar junto: daí o
                        vector-effect, que trava a espessura em 2.5px para
                        qualquer nome. */}
                    <svg
                      className="pointer-events-none absolute -bottom-1 left-0 h-[7px] w-full overflow-visible text-brass/75"
                      viewBox="0 0 120 8"
                      fill="none"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M1 5.5C25 2 75 1.5 119 5.5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
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
            <div className="w-full sm:w-auto sm:min-w-[240px] shrink-0 bg-ink-950 border border-ink-800 rounded-xl p-3 flex items-center gap-3">
              <div className="shrink-0 w-12 h-12 bg-brass rounded-lg flex flex-col items-center justify-center text-white">
                <span className="text-lg font-bold leading-none tabular-nums">
                  {dias}
                </span>
                <span className="text-[10px] uppercase tracking-wide leading-none mt-0.5">
                  {dias === 1 ? "dia" : "dias"}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] tracking-wider uppercase text-cream-400 font-medium mb-0.5">
                  Próxima prova OAB
                </div>
                <div className="text-xs text-cream-400 truncate">
                  {formatarDataLonga(settings.dataProva)}
                </div>
                <button
                  onClick={() => onGoto("cronograma-config")}
                  className="min-h-6 text-[11px] text-brass hover:text-brass-link-hover hover:underline transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Ajustar cronograma
                </button>
              </div>
            </div>
          )}
          {dias === null && (
            <button
              onClick={() => onGoto("cronograma-config")}
              className="w-full sm:w-auto sm:min-w-[240px] shrink-0 bg-ink-950 border border-ink-800 rounded-xl p-3 flex items-center gap-3 hover:border-brass/20 transition-[border-color,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"
            >
              <div className="shrink-0 w-12 h-12 bg-brass-soft rounded-lg flex items-center justify-center text-brass">
                <span className="text-lg font-bold leading-none">—</span>
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[11px] tracking-wider uppercase text-cream-400 font-medium mb-0.5">
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
              className="w-full sm:w-auto sm:min-w-[240px] shrink-0 bg-ink-950 border border-ink-800 rounded-xl p-3 flex items-center gap-3 hover:border-brass/20 transition-[border-color,transform] duration-150 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none"
            >
              <div className="shrink-0 w-12 h-12 bg-alert/10 rounded-lg flex items-center justify-center text-alert">
                <span className="text-lg font-bold leading-none">!</span>
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[11px] tracking-wider uppercase text-cream-400 font-medium mb-0.5">
                  Próxima prova OAB
                </div>
                <div className="text-[11px] text-cream-400">
                  Data já passou. Atualize em Ajustar cronograma
                </div>
              </div>
            </button>
          )}
        </div>

        {ultimoResultado && (
          <div
            className="dashboard-enter mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs leading-relaxed text-cream-400"
            style={{ "--dashboard-delay": "70ms" }}
          >
            <span>Último simulado</span>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-cream-600" aria-hidden="true">·</span>
              <span key={`${ultimoResultado.id}-placar`} className="dashboard-value-change inline-block font-medium tabular-nums text-cream-50">
                {ultimoResultado.acertos}/{ultimoResultado.total}
              </span>
            </span>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-cream-600" aria-hidden="true">·</span>
              <span>
                <span key={`${ultimoResultado.id}-percentual`} className="dashboard-value-change inline-block font-semibold tabular-nums text-brass">
                  {percentualUltimo}%
                </span>{" "}
                de aproveitamento
              </span>
            </span>
            {diferencaPontos !== null && (
              <span className="inline-flex items-baseline gap-2">
                <span className="text-cream-600" aria-hidden="true">·</span>
                <span key={`${ultimoResultado.id}-diferenca`} className={`dashboard-value-change inline-block font-medium tabular-nums ${
                  diferencaPontos > 0
                    ? "text-feedback-success-text"
                    : diferencaPontos < 0
                      ? "text-feedback-danger"
                      : "text-cream-400"
                }`}>
                  {diferencaPontos > 0 ? "+" : ""}{diferencaPontos} p.p. vs anterior
                </span>
              </span>
            )}
          </div>
        )}

        {/* ===== Faixa de convite — mesma condição real de "ainda não estudou
            hoje", mas propondo em vez de cobrar. Fica fora do estado inicial:
            lá o card "Comece sua preparação" já carrega a primeira ação, e
            duas faixas dizendo que nada começou viram ruído. ===== */}
        {!estudouHoje && !estadoInicial && (
          <div
            className="dashboard-enter flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-ink-900 border border-ink-800 rounded-xl px-4 py-3 mb-8"
            style={{ "--dashboard-delay": "80ms" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Único círculo brass-soft que sobrou: o vocabulário de chip de
                  dado é quadrado (rounded-lg sobre ink-900). */}
              <span className="w-8 h-8 rounded-full bg-brass-soft flex items-center justify-center shrink-0">
                <BookOpenIcon className="w-4 h-4 text-brass" aria-hidden="true" />
              </span>
              <p className="text-sm text-cream-400">
                Comece o dia com um aquecimento de 10 questões comentadas.
              </p>
            </div>
            {/* `self-start` só no mobile: o container é `flex-col` lá, e em
                coluna o align-items padrão (stretch) esticava o botão de ponta
                a ponta. A partir de sm o alinhamento volta a ser o do
                container (`sm:items-center`). */}
            <button
              onClick={() => onGoto("simulado-landing")}
              className={`${BTN_PRIMARIO} self-start sm:self-auto`}
            >
              <span className="sm:hidden">Começar</span>
              <span className="hidden sm:inline">Iniciar aquecimento</span>
              <SetaBotao />
            </button>
          </div>
        )}

        {/* ===== Comece sua preparação — só no estado inicial confirmado.
            Ocupa a coluna principal para a Home vazia não ficar oca. ===== */}
        {estadoInicial && (
          <section
            aria-labelledby="comece-preparacao"
            className="dashboard-enter bg-ink-950 border border-ink-800 rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-8"
            style={{ "--dashboard-delay": "100ms" }}
          >
            {/* Sem rótulo acima do título: o h2 editorial carrega sozinho a
                abertura do bloco. */}
            <h2
              id="comece-preparacao"
              className="font-serif text-2xl text-cream-50 leading-tight tracking-tight"
              style={{ fontVariationSettings: '"opsz" 60' }}
            >
              Comece sua preparação
            </h2>
            <p className="mt-2 max-w-[460px] text-pretty text-sm leading-relaxed text-cream-400">
              Monte seu plano, pratique com simulados e revise seus erros com
              ajuda do Mentor Jurídico.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => onGoto("cronograma-config")}
                className={BTN_PRIMARIO}
              >
                Criar meu plano
                <SetaBotao />
              </button>
              <button onClick={() => onGoto("chat")} className={BTN_SECUNDARIO}>
                Perguntar ao Mentor
              </button>
            </div>

            {/* Explicação das três áreas do produto — não é dado do usuário. */}
            <ul className="mt-6 grid grid-cols-1 border-t border-border-subtle pt-5 divide-y divide-border-subtle sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {ETAPAS_INICIAIS.map((etapa, i) => (
                <li
                  key={etapa.titulo}
                  className="flex gap-3 py-3 sm:py-0 sm:px-5 sm:first:pl-0 sm:last:pr-0"
                >
                  <span
                    className="shrink-0 text-[11px] font-semibold leading-5 tabular-nums text-brass/70"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-5 text-cream-50">
                      {etapa.titulo}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-cream-400">
                      {etapa.descricao}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ===== Indicadores — compactos, só com dado real; ficam acima da divisão em colunas ===== */}
        {indicadores.length > 0 && (
          <div className={`grid grid-cols-1 gap-3 mb-8 ${INDICADOR_GRID_CLASS[indicadores.length]}`}>
            {indicadores.map((ind, index) => (
              <IndicatorCard
                key={ind.key}
                {...ind}
                animationDelay={`${100 + index * 35}ms`}
              />
            ))}
          </div>
        )}

        {/* ===== Coluna principal (Foco de hoje + Matérias) + coluna lateral
            (Progresso + Atividade recente) — 2 colunas a partir de lg. ===== */}
        {/* No estado inicial sobram exatamente 3 cards (Matérias fica oculto):
            os wrappers viram `contents` e os cards passam a ser itens diretos
            do grid, numa linha de 3. Nos demais estados, grid normal. */}
        <div
          className={
            estadoInicial
              ? "grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3"
              : // A divisão abre em xl, não em lg: em 1024px, descontada a
                // sidebar de 288px, sobram ~632px — a lateral trava no piso e
                // a coluna "2fr" fica mais estreita que ela. A proporção 2:0.8
                // só é real a partir de ~1400px.
                "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.8fr)] xl:items-start"
          }
        >
          {/* Coluna principal */}
          <div
            className={
              estadoInicial
                ? "contents"
                : "dashboard-enter flex flex-col gap-6 min-w-0"
            }
            style={{ "--dashboard-delay": "180ms" }}
          >
            {diaHoje &&
              (() => {
                const totalItens = diaHoje.itens.length;
                const concluidos = diaHoje.itens.filter((i) => i.concluido).length;
                const progressoHoje = totalItens > 0 ? concluidos / totalItens : 0;
                const focoCompleto = totalItens > 0 && concluidos === totalItens;
                const materias = [
                  ...new Set(
                    diaHoje.itens
                      .filter((i) => i.tipo === "revisar" && i.materia)
                      .map((i) => i.materia),
                  ),
                ];
                return (
                  <section aria-labelledby="foco-de-hoje">
                    {/* Card primário: a hierarquia vem do padding maior que o
                        dos demais cards. O acento vinho na lateral saiu porque
                        o item concluído já carrega estado visual próprio e os
                        dois feedbacks competiam. */}
                    <div className="bg-ink-950 border border-ink-800 rounded-2xl p-5 sm:p-6">
                      <div className="relative flex flex-col gap-2 pb-3 mb-4 border-b border-border-subtle sm:flex-row sm:items-baseline sm:justify-between">
                        {/* O título do card é "Foco de hoje"; as matérias do
                            dia descem para subtítulo em sans. Antes o rótulo
                            miúdo competia com um h2 que mudava de texto. */}
                        <div className="min-w-0">
                          <h2
                            id="foco-de-hoje"
                            className="font-serif text-lg text-cream-50 leading-tight"
                            style={{ fontVariationSettings: '"opsz" 60' }}
                          >
                            Foco de hoje
                          </h2>
                          {materias.length > 0 && (
                            <p className="mt-0.5 truncate text-[13px] leading-snug text-cream-400">
                              {materias.join(" & ")}
                            </p>
                          )}
                        </div>
                        <span
                          className={`self-start shrink-0 text-xs font-medium px-3 py-1.5 rounded-full tabular-nums transition-[background-color,color] duration-200 motion-reduce:transition-none ${
                            focoCompleto
                              ? "bg-feedback-success/10 text-feedback-success-text"
                              : "bg-brass-soft text-brass"
                          }`}
                          aria-label={`${concluidos} de ${totalItens} blocos concluídos`}
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          <span
                            key={`${concluidos}-${totalItens}`}
                            className="dashboard-value-change inline-block"
                          >
                            {concluidos} de {totalItens} concluído
                            {concluidos === 1 && totalItens === 1 ? "" : "s"}
                          </span>
                        </span>
                        <div
                          className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden bg-surface-track"
                          role="progressbar"
                          aria-label="Progresso das atividades de hoje"
                          aria-valuemin={0}
                          aria-valuemax={totalItens}
                          aria-valuenow={concluidos}
                        >
                          <span
                            className={`dashboard-focus-progress block h-full w-full ${
                              focoCompleto ? "bg-feedback-success" : "bg-brass"
                            }`}
                            style={{ "--dashboard-focus-progress": progressoHoje }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {diaHoje.itens.map((item, i) => (
                          <FocoHojeItem
                            key={item.id ?? i}
                            item={item}
                            idx={i}
                            dataDia={diaHoje.data}
                            onGoto={onGoto}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => onGoto("cronograma")}
                        className="min-h-9 text-xs text-brass hover:text-brass-link-hover hover:underline mt-2 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
                      >
                        Ver plano completo
                      </button>
                    </div>
                  </section>
                );
              })()}

            {/* Sem atividades hoje: o card permanece, com mensagem e CTA que
                dependem de existir plano ou não. */}
            {!diaHoje && ausenciaConfirmada && (
              <section aria-labelledby="foco-de-hoje-vazio">
                {/* Compacto de propósito: card vazio não deve ter a mesma
                    altura de um card com conteúdo. */}
                <div className="h-full bg-ink-950 border border-ink-800 rounded-2xl px-4 py-4 sm:px-5">
                  <h2
                    id="foco-de-hoje-vazio"
                    className="font-serif text-lg text-cream-50 leading-tight"
                    style={{ fontVariationSettings: '"opsz" 60' }}
                  >
                    Foco de hoje
                  </h2>
                  {estadoInicial ? (
                    // Coluna estreita: empilha ícone e texto. Sem CTA aqui —
                    // "Criar meu plano" já é a ação primária do card de
                    // abertura logo acima; repetir vira dois botões para a
                    // mesma coisa na mesma tela.
                    <div className="mt-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-subtle bg-ink-900">
                        <CalendarDaysIcon
                          className="h-4 w-4 text-brass"
                          aria-hidden="true"
                        />
                      </span>
                      <p className="mt-3 text-sm leading-snug text-cream-400">
                        Seu foco diário aparece aqui assim que você criar um
                        plano.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-ink-900">
                        <CalendarDaysIcon
                          className="h-4 w-4 text-brass"
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-cream-400">
                          {semPlano
                            ? "Nenhum plano de estudos criado ainda."
                            : planoDesatualizado
                              ? "Seu plano não cobre mais a data da prova atual."
                              : "Seu plano não possui atividades para hoje."}
                        </p>
                        {semPlano && (
                          <p className="mt-1 text-xs leading-relaxed text-cream-600">
                            Crie um plano para organizar o que estudar a cada
                            dia.
                          </p>
                        )}
                        {planoDesatualizado && (
                          <p className="mt-1 text-xs leading-relaxed text-cream-600">
                            Gere o plano de novo para voltar a ver o foco do
                            dia.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          onGoto(
                            semPlano || planoDesatualizado
                              ? "cronograma-config"
                              : "cronograma",
                          )
                        }
                        className={BTN_SECUNDARIO}
                      >
                        {semPlano
                          ? "Criar plano"
                          : planoDesatualizado
                            ? "Atualizar plano"
                            : "Ver plano completo"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {porMateria.length > 0 && (
              <section aria-labelledby="materias-atencao">
                <div className="bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-baseline justify-between gap-3 pb-3 mb-4 border-b border-border-subtle">
                    <h2
                      id="materias-atencao"
                      className="flex min-w-0 items-center gap-2 font-serif text-lg text-cream-50 leading-tight"
                      style={{ fontVariationSettings: '"opsz" 60' }}
                    >
                      <ArrowTrendingDownIcon className="h-4 w-4 shrink-0 text-brass" />
                      Matérias que pedem atenção
                    </h2>
                    <button
                      onClick={() => onGoto("estatisticas")}
                      className="min-h-10 text-xs text-brass hover:text-brass-link-hover hover:underline transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                    >
                      Ver todas
                    </button>
                  </div>
                  <div>
                    {porMateria.slice(0, 3).map((m, i, arr) => (
                      <MateriaAtencaoRow
                        key={m.materia}
                        m={m}
                        onGoto={onGoto}
                        ultimo={i === arr.length - 1}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Coluna lateral */}
          <div
            className={
              estadoInicial
                ? "contents"
                : "dashboard-enter flex flex-col gap-6 min-w-0"
            }
            style={{ "--dashboard-delay": "230ms" }}
          >
            {planoPercentual !== null ? (
              <ProgressoCard planoPercentual={planoPercentual} />
            ) : statsCarregou ? (
              // Card mantido, mas sem arco: ausência de plano não é 0%. A
              // track vazia dá presença visual sem fingir um valor.
              <section
                aria-labelledby="progresso-geral-vazio"
                className="h-full bg-ink-950 border border-ink-800 rounded-2xl p-5"
              >
                <h2
                  id="progresso-geral-vazio"
                  className="font-serif text-lg text-cream-50 leading-tight pb-3 mb-4 border-b border-border-subtle"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  Progresso geral
                </h2>
                <div
                  className="h-1.5 rounded-full bg-surface-track"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm leading-relaxed text-cream-400">
                  {estadoInicial
                    ? "Seu progresso aparecerá conforme você concluir seus primeiros blocos."
                    : "Seu progresso começa a aparecer conforme você conclui atividades e simulados."}
                </p>
              </section>
            ) : null}

            {/*Atividade recente — timeline vertical; combina 3 fontes reais já
                carregadas (chat, histórico de simulados, caderno)*/}
            <section
              aria-labelledby="atividade-recente"
              className={estadoInicial ? "sm:col-span-2 xl:col-span-1" : undefined}
            >
              <div className="h-full bg-ink-950 border border-ink-800 rounded-2xl p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-3 pb-3 mb-4 border-b border-border-subtle">
                  <h2
                    id="atividade-recente"
                    className="font-serif text-lg text-cream-50 leading-tight"
                    style={{ fontVariationSettings: '"opsz" 60' }}
                  >
                    Atividade recente
                  </h2>
                  <button
                    onClick={() => onGoto("estatisticas")}
                    className="min-h-10 text-xs text-brass hover:text-brass-link-hover hover:underline transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                  >
                    Ver histórico
                  </button>
                </div>
                {atividades.length === 0 ? (
                  <div className="py-2">
                    <p className="text-sm text-cream-400">
                      Nenhuma atividade recente ainda.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-cream-600">
                      Seus estudos aparecerão aqui conforme você usar o
                      Facilita OAB.
                    </p>
                  </div>
                ) : (
                  <div>
                    {atividades.map((a, i) => (
                      <AtividadeItem
                        key={a.key}
                        atividade={a}
                        ultimo={i === atividades.length - 1}
                        animationDelay={`${260 + i * 35}ms`}
                        onGoto={onGoto}
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
// Explicação das três áreas do produto no estado inicial. Conteúdo fixo de
// interface — não é métrica nem dado do usuário.
const ETAPAS_INICIAIS = [
  { titulo: "Planeje", descricao: "Defina sua rotina de estudo" },
  { titulo: "Pratique", descricao: "Resolva questões e simulados" },
  { titulo: "Revise", descricao: "Entenda seus erros com o Mentor" },
];

const CATEGORIA_LABEL = { revisar: "Revisão", simulado: "Simulado", caderno: "Caderno" };

// Badge de categoria em superfície neutra quente e única. As cores anteriores
// (azul e âmbar da paleta padrão do Tailwind) eram frias e arbitrárias: não
// codificavam nada que o próprio rótulo já não diga. Um tom só mantém o vinho
// reservado para ação e acento.
const CATEGORIA_BADGE = "bg-sand-100 text-cream-400";

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

// Classes dos dois pesos de ação da linha. A seta usa um group nomeado
// (`group/btn`) pra se mover sozinha, sem reagir ao hover da linha inteira.
// Foco sempre no vinho do projeto: o azul padrão do navegador é removido em
// focus/focus-visible/active, e devolvido como ring discreto do mesmo token.
const BTN_BASE =
  "group/btn appearance-none shrink-0 inline-flex items-center gap-1.5 min-h-9 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px focus:outline-none focus-visible:outline-none active:outline-none motion-reduce:transition-none motion-reduce:transform-none";
const BTN_SECUNDARIO = `${BTN_BASE} bg-ink-950 border border-surface-border-button text-cream-50 hover:bg-surface-button-hover hover:border-surface-border-button-hover hover:text-brass focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass`;
const BTN_PRIMARIO = `${BTN_BASE} bg-brass text-ink-950 shadow-btn-primary hover:bg-brass-hover hover:shadow-btn-primary-hover focus-visible:ring-2 focus-visible:ring-brass/40`;

function SetaBotao() {
  return (
    <span
      aria-hidden="true"
      className="inline-block transition-transform duration-200 ease-in-out group-hover/btn:translate-x-[3px] motion-reduce:transition-none motion-reduce:transform-none"
    >
      →
    </span>
  );
}

// Item individual do "Foco de hoje" — cartão interno leve sobre a superfície
// branca do card, tratado como componente completo: checkbox, título, badge
// de categoria real, metadados e ação.
//
// O círculo é o mesmo ItemCheckbox do Cronograma e grava pela função real
// `marcarItemConcluido`. Antes ele era um `span` decorativo: tinha aparência
// de controle sem comportamento nenhum.
function FocoHojeItem({ item, idx, dataDia, onGoto }) {
  const { titulo, subtitulo, categoria } = focoHojeTextos(item);
  const alternar = () => marcarItemConcluido(dataDia, idx, !item.concluido);

  if (item.concluido) {
    return (
      <div className="flex items-center gap-3 bg-ink-900 border border-surface-border-subtle hover:bg-surface-subcard-hover hover:border-surface-border-hover hover:shadow-subcard-hover transition-[background-color,border-color,box-shadow] duration-200 ease-editorial rounded-xl p-3">
        <ItemCheckbox marcado onToggle={alternar} rotulo={titulo} />
        <div className="dashboard-focus-complete flex-1 min-w-0">
          <div className="text-sm font-semibold line-through truncate text-cream-600">
            {titulo}
          </div>
          <div className="text-xs text-cream-600">{subtitulo}</div>
        </div>
        <span className="dashboard-focus-complete text-xs font-medium shrink-0 text-feedback-success-text">
          Concluído
        </span>
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
    <div className="flex items-center gap-3 bg-ink-900 border border-surface-border-subtle hover:bg-surface-subcard-hover hover:border-surface-border-hover hover:shadow-subcard-hover transition-[background-color,border-color,box-shadow] duration-200 ease-editorial rounded-xl p-3">
      <ItemCheckbox marcado={false} onToggle={alternar} rotulo={titulo} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate text-cream-50">
            {titulo}
          </span>
          <span
            className={`shrink-0 text-[10px] tracking-wide uppercase font-medium px-1.5 py-0.5 rounded ${CATEGORIA_BADGE}`}
          >
            {categoria}
          </span>
        </div>
        <div className="text-xs text-cream-400 mt-0.5">{subtitulo}</div>
      </div>
      {item.tipo === "revisar" && (
        <button onClick={() => onGoto(destino)} className={BTN_PRIMARIO}>
          Estudar
          <SetaBotao />
        </button>
      )}
      {item.tipo === "simulado" && (
        <button onClick={() => onGoto(destino)} className={BTN_SECUNDARIO}>
          Começar
          <SetaBotao />
        </button>
      )}
      {item.tipo === "caderno" && (
        <button onClick={() => onGoto(destino)} className={BTN_SECUNDARIO}>
          Abrir notas
          <SetaBotao />
        </button>
      )}
    </div>
  );
}

// Cor por faixa de aproveitamento. Mesmo critério de Estatisticas.jsx,
// duplicado aqui pra não acoplar os dois componentes.
//
// Os extremos usam valores de token: #C23B2E é `alert`/`feedback-danger`
// (5,3:1 sobre branco) e #059669 é `feedback-success-text` (3,77:1 — já
// documentado e aceito no design-system). A faixa intermediária continua hex
// solto porque promovê-la a token exigiria editar tailwind.config.js, fora do
// escopo autorizado; #B45309 tem 5,0:1 e atende AA. Pendência registrada.
function corPorPerformance(pct) {
  if (pct < 30) return { texto: "#C23B2E" };
  if (pct <= 70) return { texto: "#B45309" };
  return { texto: "#059669" };
}

// Linha editorial, não card: sem borda completa nem radius próprio — as
// matérias são separadas por um divisor inferior dentro do card mestre,
// evitando o efeito de caixa dentro de caixa.
function MateriaAtencaoRow({ m, onGoto, ultimo }) {
  const p = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0;
  const { texto } = corPorPerformance(p);
  return (
    <div
      className={`flex items-center gap-4 px-1 py-3 transition-[background-color,border-color] duration-200 ease-editorial hover:bg-ink-900 ${
        ultimo
          ? ""
          : "border-b border-border-subtle hover:border-surface-border-subtle"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm text-cream-50 font-medium truncate">
            {m.materia}
          </span>
          <span className="text-xs font-semibold shrink-0 tabular-nums" style={{ color: texto }}>
            {p}%
          </span>
        </div>
        <div
          className="h-1.5 bg-surface-track rounded-full overflow-hidden"
          role="progressbar"
          aria-label={`Aproveitamento em ${m.materia}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={p}
        >
          <div
            className="dashboard-progress-fill h-full w-full rounded-full"
            style={{
              "--dashboard-progress-scale": p / 100,
              backgroundColor: texto,
            }}
          ></div>
        </div>
      </div>
      <button
        onClick={() => onGoto("chat")}
        className={BTN_SECUNDARIO}
        aria-label={`Revisar ${m.materia} com o mentor. Aproveitamento: ${p}%.`}
      >
        Revisar
      </button>
    </div>
  );
}

// Card compacto de indicador — ícone + label + valor, pouco espaço vertical.
// Os três compartilham o mesmo chip (28px, rounded-lg, ink-900, borda
// subtle, glifo 16px) e a mesma tipografia: a diferença entre eles é de
// métrica, não de severidade, então nenhum ganha cor própria.
function IndicatorCard({ Icon, label, valor, animationDelay }) {
  return (
    <div
      className="dashboard-enter flex items-center gap-3 bg-ink-950 border border-ink-800 rounded-2xl px-4 py-3.5"
      style={{ "--dashboard-delay": animationDelay }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-ink-900">
        <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {/* Rótulo em neutro, não em vinho: o acento fica reservado para ação
            e para o próprio dado quando ele tem leitura semântica. */}
        <div className="text-[11px] tracking-wider uppercase text-cream-400 font-medium truncate">
          {label}
        </div>
        {/* Valor em Manrope, fora da escala serif: Fraunces fica reservado à
            saudação, aos cabeçalhos de card e ao % do anel. */}
        <div
          key={String(valor)}
          className="dashboard-value-change mt-0.5 text-lg font-bold leading-tight tabular-nums text-cream-50"
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
        className="stroke-surface-track"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="dashboard-progress-arc stroke-brass"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          "--dashboard-progress-start": circumference,
          "--dashboard-progress-end": offset,
        }}
      />
    </svg>
  );
}

// "Progresso geral" — responde uma pergunta só: quanto do plano já foi. As
// três linhas de Questões/Aproveitamento/Sequência saíram daqui: eram os
// mesmos valores da linha de indicadores do topo, construídos duas vezes.
function ProgressoCard({ planoPercentual }) {
  return (
    <section
      aria-labelledby="progresso-geral"
      className="bg-ink-950 border border-ink-800 rounded-2xl p-5"
    >
      <h2
        id="progresso-geral"
        className="font-serif text-lg text-cream-50 leading-tight pb-3 mb-5 border-b border-border-subtle"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        Progresso geral
      </h2>
      <div
        className="relative mx-auto mb-1"
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
            key={planoPercentual}
            className="dashboard-value-change font-serif text-[32px] text-cream-50 leading-none tabular-nums"
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            {planoPercentual}%
          </span>
          <span className="font-sans text-[10px] uppercase tracking-wide text-cream-600 leading-tight mt-1.5">
            concluído
          </span>
        </div>
      </div>
    </section>
  );
}

// Timeline vertical — ponto + linha conectando os eventos via flexbox (sem
// posicionamento absoluto com valores mágicos). Verde só quando a atividade
// é semanticamente positiva (ex.: simulado com bom desempenho real).
const ATIVIDADE_ICONE = {
  chat: ChatBubbleLeftRightIcon,
  simulado: ClipboardDocumentCheckIcon,
  caderno: BookOpenIcon,
};

// Linha editorial separada por divisor — sem card por item. Vira botão só
// quando `destino` existe; caso contrário permanece informativa, sem hover.
function AtividadeItem({ atividade, ultimo, animationDelay, onGoto }) {
  const Icone = ATIVIDADE_ICONE[atividade.tipo] || BookOpenIcon;
  const clicavel = Boolean(atividade.destino);

  const conteudo = (
    <>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-ink-900">
        <Icone className="h-4 w-4 text-brass" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-cream-50">
            {atividade.rotulo}
          </span>
          <span className="shrink-0 text-[11px] text-cream-600">
            {tempoRelativo(atividade.timestamp)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm tabular-nums text-cream-400">
          {atividade.descricao}
        </span>
      </span>
      {clicavel && (
        <ChevronRightIcon
          className="mt-1 h-3.5 w-3.5 shrink-0 text-cream-600 opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover/atv:translate-x-0.5 group-hover/atv:opacity-100 group-focus-visible/atv:translate-x-0.5 group-focus-visible/atv:opacity-100"
          aria-hidden="true"
        />
      )}
    </>
  );

  const base = `dashboard-activity-enter flex gap-3 py-3 ${
    ultimo ? "" : "border-b border-border-subtle"
  }`;

  if (!clicavel) {
    return (
      <div
        className={base}
        style={{ "--dashboard-delay": animationDelay }}
      >
        {conteudo}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onGoto(atividade.destino)}
      className={`group/atv ${base} -mx-2 w-[calc(100%+1rem)] rounded-lg px-2 text-left transition-colors duration-150 ease-out hover:bg-ink-900 active:translate-y-px focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20`}
      style={{ "--dashboard-delay": animationDelay }}
    >
      {conteudo}
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

// "QUARTA, 16 DE SETEMBRO" — label curto do dia atual, pro cabeçalho. A
// vírgula separa dia e data; o "•" da pill separa a data do turno.
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
  return `${dias[d.getDay()]}, ${d.getDate()} DE ${meses[d.getMonth()]}`;
}

// Soma de minutos -> "1h20" (ou "45 min" se for menos de 1h).
function formatarDuracao(totalMinutos) {
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}
