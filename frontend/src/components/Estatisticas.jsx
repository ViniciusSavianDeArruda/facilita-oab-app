import { useEffect, useState } from "react";
import { authFetchJson } from "../lib/api";

export default function Estatisticas({ onGoto }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    authFetchJson("/me/stats")
      .then(setStats)
      .catch((e) =>
        setError(e.message || "Não foi possível carregar as estatísticas."),
      );
  }, []);

  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 pt-24 text-center text-sm text-alert">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 pt-24 text-center text-sm text-cream-400">
          Carregando…
        </div>
      </div>
    );
  }

  if (stats.totalSimulados === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 pt-24 text-center">
          <p
            className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-3"
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            Ainda sem estatísticas.
          </p>
          <p className="text-cream-400 leading-relaxed">
            Faça seu primeiro simulado pra começar a ver seu progresso aqui:
            nota ao longo do tempo, acerto por matéria e sua sequência de
            estudo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="w-full mx-auto px-6 py-8 md:px-8 md:max-w-[1000px]">
        <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
          Estatísticas
        </p>
        <h2
          className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-8"
          style={{ fontVariationSettings: '"opsz" 96' }}
        >
          Seu progresso
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-10">
          <StatTile
            label="Sequência de estudo"
            value={stats.streak}
            suffix={stats.streak === 1 ? "dia" : "dias"}
          />
          <StatTile label="Simulados feitos" value={stats.totalSimulados} />
        </div>

        <SectionLabel>Nota por simulado</SectionLabel>
        <TrendChart trend={stats.trend} />

        <SectionLabel className="mt-10">Acerto por matéria</SectionLabel>
        <div className="space-y-1">
          {stats.porMateria.map((m) => (
            <MateriaBar
              key={m.materia}
              materia={m.materia}
              acertos={m.acertos}
              total={m.total}
            />
          ))}
        </div>

        <SectionLabel className="mt-10">Caderno de erros</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <StatusTile
            dot="bg-brass"
            label="Aberto"
            value={stats.cadernoStatus.aberto}
          />
          <StatusTile
            dot="bg-cream-50"
            label="Revisando"
            value={stats.cadernoStatus.revisando}
          />
          <StatusTile
            dot="bg-cream-600"
            label="Dominado"
            value={stats.cadernoStatus.dominado}
          />
        </div>
        <button
          onClick={() => onGoto?.("caderno")}
          className="text-sm text-brass-dim hover:text-brass transition-colors mt-3"
        >
          Ver caderno completo →
        </button>
      </div>
    </div>
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

function StatTile({ label, value, suffix }) {
  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl p-5">
      <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-serif text-4xl text-brass leading-none"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          {value}
        </span>
        {suffix && <span className="text-sm text-cream-400">{suffix}</span>}
      </div>
    </div>
  );
}

function StatusTile({ dot, label, value }) {
  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <span className={`w-2 h-2 rounded-full ${dot}`}></span>
        <span className="text-xs text-cream-400">{label}</span>
      </div>
      <div
        className="font-serif text-2xl text-cream-50"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {value}
      </div>
    </div>
  );
}

// Vermelho/âmbar/verde (Tailwind red-500/amber-500/emerald-500) — validados
// pra separação CVD e contraste com o script da skill de dataviz antes de
// usar; red-400 original do pedido falhava o piso de visão normal contra
// o amber-500 (ΔE 14.6, abaixo de 15), então subiu um degrau pro red-500.
function corPorPerformance(pct) {
  if (pct < 30) return "#ef4444";
  if (pct <= 70) return "#f59e0b";
  return "#10b981";
}

function MateriaBar({ materia, acertos, total }) {
  const p = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const cor = corPorPerformance(p);
  return (
    <div className="flex items-center gap-3 text-sm py-1.5">
      <span className="w-36 text-cream-50 truncate">{materia}</span>
      <div className="flex-1 h-1 bg-ink-800 rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${p}%`, backgroundColor: cor }}
        />
      </div>
      <span className="w-14 text-right text-cream-400 tabular-nums">
        {acertos}/{total}
      </span>
    </div>
  );
}

const CHART_W = 600;
// Viewbox height por breakpoint — não dá pra usar um só valor fixo com
// h-auto: no mobile, a mesma proporção largura:altura do desktop deixa o
// gráfico baixo demais (container bem mais estreito). E esticar o mesmo
// viewBox sem trocar a altura via preserveAspectRatio="none" distorceria
// o texto (escala X e Y diferentes). Então o viewBox muda por breakpoint,
// mantendo escala uniforme nos dois.
const CHART_H_DESKTOP = 176;
const CHART_H_MOBILE = 540;
// No mobile a fonte da data/nota é maior (compensando a escala menor —
// ver pointLabelSize/dateLabelSize), então o texto centrado no primeiro/
// último ponto precisa de mais respiro nas bordas pra não cortar.
const PAD_LEFT_DESKTOP = 34;
const PAD_LEFT_MOBILE = 40;
const PAD_RIGHT_DESKTOP = 12;
const PAD_RIGHT_MOBILE = 40;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const Y_TICKS = [0, 2, 4, 6, 8, 10];

// Sem listener de resize + matchMedia aqui, o React só saberia a largura
// no primeiro paint (via CSS), não teria como recalcular o viewBox do
// SVG quando o breakpoint muda.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

function TrendChart({ trend }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const isMobile = useIsMobile();
  const chartH = isMobile ? CHART_H_MOBILE : CHART_H_DESKTOP;
  const padLeft = isMobile ? PAD_LEFT_MOBILE : PAD_LEFT_DESKTOP;
  const padRight = isMobile ? PAD_RIGHT_MOBILE : PAD_RIGHT_DESKTOP;
  // fontSize é em unidades do viewBox, não px — como o fator de escala do
  // mobile é bem menor (container mais estreito), o mesmo número renderiza
  // bem menor na tela. Valores maiores aqui compensam pra manter ~14px
  // reais no mobile (~text-sm) e ~12-16px no desktop (já ok, não mudou).
  const pointLabelSize = isMobile ? 26 : 11;
  const dateLabelSize = isMobile ? 26 : 9;

  if (trend.length === 0) return null;

  // "Nota" de 0 a 10 — cada simulado tem sempre 10 questões, mas
  // normaliza por total mesmo assim (defensivo, caso isso mude).
  const notas = trend.map((t) =>
    t.total > 0 ? Math.round((t.acertos / t.total) * 10) : 0,
  );
  const yFor = (nota) =>
    PAD_TOP + (1 - nota / 10) * (chartH - PAD_TOP - PAD_BOTTOM);
  const stepX =
    trend.length > 1
      ? (CHART_W - padLeft - padRight) / (trend.length - 1)
      : 0;
  const coords = notas.map((nota, i) => {
    const x =
      trend.length > 1
        ? padLeft + i * stepX
        : (padLeft + (CHART_W - padRight)) / 2;
    return { x, y: yFor(nota), nota, createdAt: trend[i].createdAt };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const baseY = chartH - PAD_BOTTOM;
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baseY} L ${coords[0].x.toFixed(1)} ${baseY} Z`
      : null;

  const active = hoverIdx !== null ? coords[hoverIdx] : null;
  const shortDate = (iso) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  const fullDate = (iso) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl p-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_W} ${chartH}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Nota por simulado ao longo do tempo"
        >
          {/* Escala Y — 0, 2, 4, 6, 8, 10 */}
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line
                x1={padLeft}
                y1={yFor(v)}
                x2={CHART_W - padRight}
                y2={yFor(v)}
                stroke="#F0DEDE"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={yFor(v) + 3}
                textAnchor="end"
                fontSize="9"
                fill="#9C8D72"
              >
                {v}
              </text>
            </g>
          ))}

          {areaPath && (
            <path d={areaPath} fill="#BA1E4A" opacity="0.1" stroke="none" />
          )}
          <path
            d={linePath}
            fill="none"
            stroke="#BA1E4A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair do ponto em hover */}
          {active && (
            <line
              x1={active.x}
              x2={active.x}
              y1={PAD_TOP - 8}
              y2={baseY}
              stroke="#DCBDBD"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          )}

          {coords.map((c, i) => (
            <g key={i}>
              {/* Nota em cima de cada ponto — halo branco pra continuar
                  legível quando cair perto de uma linha de grade */}
              <text
                x={c.x}
                y={c.y - 12}
                textAnchor="middle"
                fontSize={pointLabelSize}
                fontWeight="600"
                fill="#6B5D46"
                stroke="#FFF8F8"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {c.nota}
              </text>
              {/* Data curta no eixo X */}
              <text
                x={c.x}
                y={baseY + 16}
                textAnchor="middle"
                fontSize={dateLabelSize}
                fill="#9C8D72"
              >
                {shortDate(c.createdAt)}
              </text>
              <circle
                cx={c.x}
                cy={c.y}
                r={hoverIdx === i ? 6 : 4}
                fill="#BA1E4A"
                stroke="#FFF8F8"
                strokeWidth="2"
                pointerEvents="none"
              />
              {/* Área de hover maior que o ponto visível (~24px), pra
                  ficar fácil de acertar com mouse/dedo */}
              <circle
                cx={c.x}
                cy={c.y}
                r={12}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
              />
            </g>
          ))}
        </svg>

        {/* Tooltip: data completa + nota */}
        {active && (
          <div
            className="absolute pointer-events-none bg-ink-950 border border-ink-800 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap"
            style={{
              left: `${(active.x / CHART_W) * 100}%`,
              top: `${(active.y / chartH) * 100}%`,
              transform: "translate(-50%, -130%)",
            }}
          >
            <div className="text-xs text-cream-50 font-medium">
              {fullDate(active.createdAt)}
            </div>
            <div className="text-xs text-brass">Nota: {active.nota}</div>
          </div>
        )}
      </div>
    </div>
  );
}
