import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  LightBulbIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { authFetchJson } from "../lib/api";
import { cx } from "../lib/format";
import {
  calcularEvolucao,
  calcularMediaGeral,
  calcularMelhorNota,
  calcularQuestoesFeitas,
  faixaMateria,
  formatarDataCurta,
  formatarDataLonga,
  MIN_SIMULADOS_PARA_EVOLUCAO,
  nomesMateriasFoco,
  priorizarMaterias,
  recortarTrend,
} from "../lib/estatisticas";


const RECORTE_OPCOES = [
  { value: "10", label: "Últimos 10" },
  { value: "30", label: "Últimos 30" },
  { value: "tudo", label: "Tudo" },
];

const EYEBROW = "text-[11px] font-medium uppercase tracking-widest text-brass";

export default function Estatisticas({ onGoto }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [recorte, setRecorte] = useState("10");

  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    authFetchJson("/me/stats")
      .then((data) => {
        if (vivo) setStats(data);
      })
      .catch((e) => {
        if (vivo)
          setError(e.message || "Não foi possível carregar as estatísticas.");
      });
    return () => {
      vivo = false;
    };
  }, [tentativa]);

  const tentarNovamente = () => {
    setError(null);
    setStats(null);
    setTentativa((t) => t + 1);
  };

  if (error) {
    return (
      <State
        title="Não foi possível carregar as estatísticas."
        detail={error}
        alert
        actionLabel="Tentar novamente"
        onAction={tentarNovamente}
      />
    );
  }
  if (!stats) return <State title="Carregando estatísticas…" />;

  const noSimulados = stats.totalSimulados === 0;

  return (
    <div className="h-full overflow-y-auto bg-surface-page">
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 md:px-8 md:pt-6">
        <Cabecalho />
        <Kpis
          totalSimulados={stats.totalSimulados}
          trend={stats.trend}
          noSimulados={noSimulados}
        />
        {noSimulados ? (
          <SemSimulados onGoto={onGoto} />
        ) : (
          <>
            <TrajetoriaRow
              trend={stats.trend}
              recorte={recorte}
              onRecorte={setRecorte}
              porMateria={stats.porMateria}
            />
            <AcertoPorMateria porMateria={stats.porMateria} />
          </>
        )}
        <CadernoResumo status={stats.cadernoStatus} onGoto={onGoto} />
      </main>
    </div>
  );
}

/* ============ Cabeçalho ============ */

function Cabecalho() {
  return (
    <header className="border-b border-border-subtle pb-4 sm:pb-5">
      <p className={EYEBROW}>Estatísticas</p>
      <h1 className="mt-0.5 font-serif text-3xl leading-tight tracking-tight text-text-primary sm:text-4xl">
        Seu progresso
      </h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Acompanhe seu desempenho nos simulados e identifique onde focar nos
        próximos estudos.
      </p>
    </header>
  );
}

/* ============ KPIs ============ */

function Kpis({ totalSimulados, trend, noSimulados }) {
  const media = calcularMediaGeral(trend);
  const feitas = calcularQuestoesFeitas(trend);
  const melhor = calcularMelhorNota(trend);
  const base = noSimulados
    ? "Faça um simulado para começar."
    : `A partir de ${totalSimulados} ${totalSimulados === 1 ? "simulado" : "simulados"}.`;

  return (
    <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={DocumentTextIcon}
        label="Simulados realizados"
        value={totalSimulados}
        subtitle={totalSimulados > 0 ? "Até agora." : "Nenhum até agora."}
      />
      <KpiCard
        icon={ChartBarIcon}
        label="Nota média"
        value={media === null ? "—" : `${media}%`}
        subtitle={base}
      />
      <KpiCard
        icon={ClipboardDocumentCheckIcon}
        label="Questões feitas"
        value={feitas}
        subtitle={feitas > 0 ? "Em simulados." : "Nenhuma até agora."}
      />
      <KpiCard
        icon={TrophyIcon}
        label="Melhor nota"
        value={melhor === null ? "—" : `${melhor.percentual}%`}
        subtitle={
          melhor === null
            ? "Após o primeiro simulado."
            : `Em ${formatarDataCurta(melhor.data)}.`
        }
      />
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle }) {
  return (
    <article className="rounded-2xl border border-border-default bg-surface-raised p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-subtle"
          aria-hidden="true"
        >
          <Icon className="h-4 w-4 text-brass" />
        </span>
        <p className={cx(EYEBROW, "min-w-0 leading-tight")}>{label}</p>
      </div>
      <p className="mt-2.5 font-serif text-[2rem] font-normal leading-none tracking-tight text-text-primary tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
          {subtitle}
        </p>
      )}
    </article>
  );
}

/* ============ Trajetória ============ */

function TrajetoriaRow({ trend, recorte, onRecorte, porMateria }) {
  const dados = useMemo(() => recortarTrend(trend, recorte), [trend, recorte]);
  return (
    <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <TrajetoriaCard
        dados={dados}
        total={trend.length}
        recorte={recorte}
        onRecorte={onRecorte}
      />
      <PainelLateral trend={trend} porMateria={porMateria} />
    </section>
  );
}

function TrajetoriaCard({ dados, total, recorte, onRecorte }) {
  const descricao =
    total === 0
      ? "Sem simulados ainda."
      : recorte === "tudo"
        ? `Sua nota em todos os ${total} simulados registrados.`
        : `Sua nota nos últimos ${dados.length} simulados.`;
  return (
    <article className="rounded-2xl border border-border-default bg-surface-raised p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-tight text-text-primary">
            Trajetória recente
          </h2>
          <p className="mt-1 text-sm text-text-secondary">{descricao}</p>
        </div>
        <SegmentedSwitch
          value={recorte}
          options={RECORTE_OPCOES}
          onChange={onRecorte}
          ariaLabel="Período da trajetória"
        />
      </header>
      <Chart dados={dados} />
    </article>
  );
}

function SegmentedSwitch({ value, options, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-surface-border-button bg-surface-raised p-0.5"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-h-8 rounded-md px-2.5 text-xs font-medium transition-colors duration-150 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:px-3",
              selected
                ? "bg-brass text-ink-950"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============ Chart (SVG, 0–100%) ============ */

const CHART = {
  W: 720,
  H_DESKTOP: 210,
  H_MOBILE: 220,
  PL: 36,
  PR: 16,
  PT: 28,
  PB: 28,
};
const Y_TICKS = [0, 25, 50, 75, 100];

function Chart({ dados }) {
  const [ativo, setAtivo] = useState(null);
  const mobile = useMobile();
  const h = mobile ? CHART.H_MOBILE : CHART.H_DESKTOP;
  const n = dados.length;

  if (n === 0) {
    return (
      <div className="mt-3 flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border-default bg-surface-subtle text-sm text-text-secondary">
        Sem simulados no período selecionado.
      </div>
    );
  }

  const usableW = CHART.W - CHART.PL - CHART.PR;
  const usableH = h - CHART.PT - CHART.PB;
  const y = (p) => CHART.PT + (1 - p / 100) * usableH;
  const x = (i) =>
    n === 1 ? CHART.PL + usableW / 2 : CHART.PL + (i * usableW) / (n - 1);

  const pontos = dados.map((r, i) => {
    const total = r.total || 0;
    const perc = total > 0 ? Math.round((r.acertos / total) * 100) : 0;
    return {
      i,
      perc,
      acertos: r.acertos || 0,
      total,
      createdAt: r.createdAt,
      x: x(i),
      y: y(perc),
    };
  });

  const path = pontos
    .map((p, i) => (i ? "L " : "M ") + p.x.toFixed(1) + " " + p.y.toFixed(1))
    .join(" ");

  // Rótulos de % acima só quando houver espaço. Em recorte "tudo" com muitos
  // simulados, mostramos a cada k passos para não virar muro de texto.
  const mostraLabelsPercentual = n <= 15 || mobile === false;
  const stepLabel = Math.max(1, Math.ceil(n / (mobile ? 5 : 10)));

  // Datas no eixo X — primeiro, último e amostras intermediárias.
  const stepData = Math.max(1, Math.ceil(n / (mobile ? 4 : 8)));

  const atual = ativo === null ? null : pontos[ativo];

  return (
    <div className="mt-2">
      <svg
        viewBox={`0 0 ${CHART.W} ${h}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Trajetória de notas em porcentagem nos últimos ${n} ${n === 1 ? "simulado" : "simulados"}.`}
      >
        {/* grade horizontal */}
        {Y_TICKS.map((v) => (
          <g key={v}>
            <line
              x1={CHART.PL}
              x2={CHART.W - CHART.PR}
              y1={y(v)}
              y2={y(v)}
              stroke="#F0EAE1"
              strokeWidth="1"
              strokeDasharray={v === 0 ? "0" : "2 4"}
            />
            <text
              x={CHART.PL - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#6E6760"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* linha */}
        {n > 1 && (
          <path
            d={path}
            fill="none"
            stroke="#7A1B38"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* pontos */}
        {pontos.map((p) => {
          const ultimo = p.i === n - 1;
          const ativoAqui = ativo === p.i;
          return (
            <g key={p.i}>
              {ultimo ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="6"
                  fill="#FFFFFF"
                  stroke="#7A1B38"
                  strokeWidth="2.5"
                />
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={ativoAqui ? 6 : 4.5}
                  fill="#7A1B38"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
              {/* área de hit maior para toque */}
              <circle
                cx={p.x}
                cy={p.y}
                r={mobile ? 22 : 16}
                fill="transparent"
                onMouseEnter={() => setAtivo(p.i)}
                onMouseLeave={() =>
                  setAtivo((cur) => (cur === p.i ? null : cur))
                }
                onClick={() => setAtivo(p.i)}
              />
            </g>
          );
        })}

        {/* rótulos % acima do ponto */}
        {mostraLabelsPercentual &&
          pontos.map(
            (p) =>
              (p.i % stepLabel === 0 || p.i === n - 1) && (
                <text
                  key={`l${p.i}`}
                  x={p.x}
                  y={p.y - 11}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="#7A1B38"
                >
                  {p.perc}%
                </text>
              ),
          )}

        {/* datas no eixo X */}
        {pontos.map(
          (p) =>
            (p.i % stepData === 0 || p.i === n - 1) && (
              <text
                key={`d${p.i}`}
                x={p.x}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#6E6760"
              >
                {formatarDataCurta(p.createdAt)}
              </text>
            ),
        )}
      </svg>

      <div
        className="mt-0.5 min-h-[1.25rem] text-center text-xs text-text-secondary"
        aria-live="polite"
      >
        {atual ? (
          <span>
            <span className="text-text-primary">
              {formatarDataLonga(atual.createdAt)}
            </span>
            {" · "}
            <span className="font-medium text-brass">{atual.perc}%</span>
            {" · "}
            {atual.acertos} de {atual.total} acertos
          </span>
        ) : (
          "Passe o mouse ou toque em um ponto para ver o detalhe."
        )}
      </div>

      {/* alternativa para leitores de tela */}
      <ul className="sr-only">
        {pontos.map((p) => (
          <li key={p.i}>
            Simulado de {formatarDataLonga(p.createdAt)}: {p.perc}% ({p.acertos}
            {" de "}
            {p.total}).
          </li>
        ))}
      </ul>
    </div>
  );
}

function useMobile() {
  const [m, setM] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < 768,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = (e) => setM(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

/* ============ Painel lateral ============ */

function PainelLateral({ trend, porMateria }) {
  const evolucao = calcularEvolucao(trend);
  const foco = nomesMateriasFoco(porMateria);
  return (
    <article className="flex flex-col divide-y divide-border-subtle rounded-2xl border border-border-default bg-surface-raised">
      <SuaEvolucao evolucao={evolucao} total={trend.length} />
      <OndeFocar foco={foco} />
    </article>
  );
}

function SuaEvolucao({ evolucao, total }) {
  const insuficiente = evolucao === null;
  const positivo = evolucao && evolucao.pontos > 0;
  const neutro = evolucao && evolucao.pontos === 0;
  const sinal = evolucao
    ? evolucao.pontos > 0
      ? "+"
      : evolucao.pontos < 0
        ? "−"
        : "±"
    : "";
  const absoluto = evolucao ? Math.abs(evolucao.pontos) : 0;
  return (
    <section className="p-3.5 sm:p-4">
      <header className="flex items-center gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-subtle"
          aria-hidden="true"
        >
          <ArrowTrendingUpIcon className="h-4 w-4 text-brass" />
        </span>
        <h3 className="font-serif text-xl leading-tight text-text-primary">
          Sua evolução
        </h3>
      </header>
      {insuficiente ? (
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {total === 0
            ? "Continue realizando simulados para acompanhar sua evolução."
            : `Continue realizando simulados para acompanhar sua evolução — faltam ${Math.max(0, MIN_SIMULADOS_PARA_EVOLUCAO - total)} para a primeira leitura.`}
        </p>
      ) : (
        <>
          <p
            className={cx(
              "mt-2 font-serif text-3xl leading-none tracking-tight tabular-nums",
              positivo
                ? "text-feedback-success-text"
                : neutro
                  ? "text-text-primary"
                  : "text-feedback-danger",
            )}
          >
            {sinal}
            {absoluto} <span className="text-xl">p.p.</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {positivo && (
              <>
                Média dos 5 últimos subiu de{" "}
                <strong className="font-medium text-text-primary">
                  {evolucao.baseline}%
                </strong>{" "}
                para{" "}
                <strong className="font-medium text-text-primary">
                  {evolucao.atual}%
                </strong>
                . Continue nesse ritmo.
              </>
            )}
            {neutro && (
              <>
                A média dos 5 últimos ficou em{" "}
                <strong className="font-medium text-text-primary">
                  {evolucao.atual}%
                </strong>
                , igual aos 5 anteriores.
              </>
            )}
            {!positivo && !neutro && (
              <>
                A média dos 5 últimos caiu de{" "}
                <strong className="font-medium text-text-primary">
                  {evolucao.baseline}%
                </strong>{" "}
                para{" "}
                <strong className="font-medium text-text-primary">
                  {evolucao.atual}%
                </strong>
                . Pode ser hora de revisitar as matérias de foco.
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}

function OndeFocar({ foco }) {
  return (
    <section className="p-3.5 sm:p-4">
      <header className="flex items-center gap-3">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-subtle"
          aria-hidden="true"
        >
          <LightBulbIcon className="h-4 w-4 text-brass" />
        </span>
        <h3 className="font-serif text-xl leading-tight text-text-primary">
          Onde focar agora
        </h3>
      </header>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {foco ? (
          <>
            Priorize{" "}
            <strong className="font-medium text-text-primary">{foco}</strong>{" "}
            nas próximas revisões — são as matérias com o menor acerto até aqui.
          </>
        ) : (
          "Responda mais questões por matéria para destacarmos onde focar."
        )}
      </p>
    </section>
  );
}

/* ============ Acerto por matéria ============ */

function AcertoPorMateria({ porMateria }) {
  const prioridades = useMemo(
    () => priorizarMaterias(porMateria),
    [porMateria],
  );
  const temDados = Array.isArray(porMateria) && porMateria.length > 0;

  return (
    <section className="mt-6 border-t border-border-subtle pt-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Desempenho</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight text-text-primary">
            Acerto por matéria
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Veja seu desempenho por matéria e identifique onde focar.
          </p>
        </div>
      </header>

      {!temDados ? (
        <p className="mt-5 text-sm text-text-secondary">
          Faça simulados para ver seu acerto por matéria.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
          <Prioridades lista={prioridades} />
          <ListaCompleta porMateria={porMateria} />
        </div>
      )}
    </section>
  );
}

const LIMITE_PRIORIDADES_SCROLL = 7;

function Prioridades({ lista }) {
  if (lista.length === 0) {
    return (
      <aside className="rounded-2xl border border-border-default bg-surface-subtle p-3.5 sm:p-4">
        <h3 className="font-serif text-lg leading-tight text-text-primary">
          Prioridades
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Responda pelo menos 5 questões em alguma matéria para destacarmos
          prioridades.
        </p>
      </aside>
    );
  }
  return (
    <aside className="rounded-2xl border border-border-default bg-surface-subtle p-3.5 sm:p-4">
      <header className="flex items-start gap-3">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-raised"
          aria-hidden="true"
        >
          <ArrowTrendingUpIcon className="h-4 w-4 rotate-180 text-brass" />
        </span>
        <div className="min-w-0">
          <h3 className="font-serif text-lg leading-tight text-text-primary">
            {lista.length}{" "}
            {lista.length === 1
              ? "matéria que precisa de atenção"
              : "matérias que precisam de atenção"}
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Priorize essas matérias nos próximos estudos.
          </p>
        </div>
      </header>
      <ol
        className={cx(
          "mt-3 divide-y divide-border-subtle",
          lista.length >= LIMITE_PRIORIDADES_SCROLL &&
            "max-h-72 overflow-y-auto overscroll-contain pr-1",
        )}
      >
        {lista.map((m, i) => (
          <li
            key={m.materia}
            className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
          >
            <span
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface-raised text-xs font-medium text-brass tabular-nums"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
              {m.materia}
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums text-feedback-danger">
              {m.percentual}%
            </span>
            <span className="shrink-0 text-xs tabular-nums text-text-secondary">
              {m.acertos} de {m.total}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

const FAIXA_COR = {
  alto: {
    fill: "bg-feedback-success",
    texto: "text-feedback-success-text",
    legenda: "Acerto alto",
    rotulo: "≥ 70%",
    dot: "bg-feedback-success",
  },
  atencao: {
    fill: "bg-feedback-warning",
    texto: "text-feedback-warning",
    legenda: "Em atenção",
    rotulo: "50% – 69%",
    dot: "bg-feedback-warning",
  },
  foco: {
    fill: "bg-feedback-danger",
    texto: "text-feedback-danger",
    legenda: "Precisa de foco",
    rotulo: "< 50%",
    dot: "bg-feedback-danger",
  },
};

const FAIXAS_ORDEM = ["alto", "atencao", "foco"];

function ListaCompleta({ porMateria }) {
  // Reordena para "melhor em cima": o backend devolve por acerto ascendente.
  const ordenada = useMemo(
    () =>
      [...porMateria]
        .map((m) => ({
          ...m,
          percentual: m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0,
        }))
        .sort((a, b) => b.percentual - a.percentual),
    [porMateria],
  );

  return (
    <div>
      <ul className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-text-secondary">
        {FAIXAS_ORDEM.map((f) => (
          <li key={f} className="inline-flex items-center gap-2">
            <span
              className={cx("h-2 w-2 rounded-full", FAIXA_COR[f].dot)}
              aria-hidden="true"
            />
            <span>
              {FAIXA_COR[f].legenda}{" "}
              <span className="text-text-muted">{FAIXA_COR[f].rotulo}</span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="divide-y divide-border-subtle">
        {ordenada.map((m) => (
          <MateriaLinha key={m.materia} item={m} />
        ))}
      </ul>
    </div>
  );
}

function MateriaLinha({ item }) {
  const p = item.percentual;
  const faixa = faixaMateria(p);
  const cor = FAIXA_COR[faixa];
  return (
    <li className="py-1.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cx("h-1.5 w-1.5 shrink-0 rounded-full", cor.dot)}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate text-sm text-text-primary">
            {item.materia}
          </span>
        </div>
        <div className="flex shrink-0 items-baseline gap-3 text-xs">
          <span className="tabular-nums text-text-secondary">
            {item.acertos}/{item.total}
          </span>
          <span
            className={cx(
              "w-10 text-right text-sm font-medium tabular-nums",
              cor.texto,
            )}
          >
            {p}%
          </span>
        </div>
      </div>
      <div
        className="mt-1 h-1 overflow-hidden rounded-full bg-surface-track"
        role="progressbar"
        aria-label={`Aproveitamento em ${item.materia}: ${cor.legenda}`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={p}
      >
        <div
          className={cx("h-full rounded-full", cor.fill)}
          style={{ width: `${p}%` }}
        />
      </div>
    </li>
  );
}

/* ============ Caderno ============ */

const CADERNO_INDICADORES = [
  {
    chave: "aberto",
    label: "Questões em aberto",
    descricao: "Para revisar.",
    icon: DocumentTextIcon,
    tone: "text-brass",
  },
  {
    chave: "revisando",
    label: "Em revisão",
    descricao: "Em acompanhamento.",
    icon: ArrowPathIcon,
    tone: "text-feedback-warning",
  },
  {
    chave: "dominado",
    label: "Dominadas",
    descricao: "Revisões concluídas.",
    icon: CheckCircleIcon,
    tone: "text-feedback-success-text",
  },
];

function CadernoResumo({ status, onGoto }) {
  return (
    <section className="mt-6 border-t border-border-subtle pt-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Revisão</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight text-text-primary">
            Caderno de Erros
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Acompanhe o andamento das questões que você revisa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGoto?.("caderno")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border-button bg-surface-raised px-3.5 py-2 text-[13px] font-medium text-text-primary transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
        >
          Ver Caderno completo →
        </button>
      </header>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CADERNO_INDICADORES.map((ind) => (
          <CadernoCard
            key={ind.chave}
            icon={ind.icon}
            tone={ind.tone}
            label={ind.label}
            value={status?.[ind.chave] ?? 0}
            descricao={ind.descricao}
          />
        ))}
      </div>
    </section>
  );
}

function CadernoCard({ icon: Icon, tone, label, value, descricao }) {
  return (
    <article className="rounded-2xl border border-border-default bg-surface-raised p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-subtle"
          aria-hidden="true"
        >
          <Icon className={cx("h-4 w-4", tone)} />
        </span>
        <h3 className="min-w-0 text-sm font-medium text-text-primary">
          {label}
        </h3>
      </div>
      <p className="mt-2.5 font-serif text-[2rem] font-normal leading-none tracking-tight text-text-primary tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
        {descricao}
      </p>
    </article>
  );
}

/* ============ Estados sem simulados ============ */

function SemSimulados({ onGoto }) {
  return (
    <section className="mt-6 rounded-2xl border border-border-default bg-surface-raised p-6 sm:p-8">
      <h2 className="font-serif text-2xl leading-tight text-text-primary">
        Ainda sem simulados.
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
        Faça seu primeiro simulado para acompanhar sua nota ao longo do tempo e
        descobrir onde focar.
      </p>
      <button
        type="button"
        onClick={() => onGoto?.("simulado")}
        className="mt-5 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border-button bg-surface-raised px-3.5 py-2 text-[13px] font-medium text-text-primary transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
      >
        Fazer um simulado →
      </button>
    </section>
  );
}

/* ============ Carregamento e erro ============ */

function State({ title, detail, alert, actionLabel, onAction }) {
  return (
    <div className="h-full overflow-y-auto bg-surface-page">
      <div
        className="mx-auto max-w-xl px-5 pb-10 pt-20 text-center sm:px-6 sm:pt-24"
        role={alert ? "alert" : "status"}
        aria-live={alert ? undefined : "polite"}
      >
        <h1 className="font-serif text-3xl leading-tight text-text-primary">
          {title}
        </h1>
        {detail && (
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {detail}
          </p>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border-button bg-surface-raised px-3.5 py-2 text-[13px] font-medium text-text-primary transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
