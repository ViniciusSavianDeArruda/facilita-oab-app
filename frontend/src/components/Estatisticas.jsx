import { useEffect, useState } from "react";
import { authFetchJson } from "../lib/api";

export default function Estatisticas() {
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
      <div className="max-w-2xl mx-auto px-6 py-8">
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

function MateriaBar({ materia, acertos, total }) {
  const p = total > 0 ? Math.round((acertos / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm py-1.5">
      <span className="w-36 text-cream-50 truncate">{materia}</span>
      <div className="flex-1 h-1 bg-ink-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brass transition-all"
          style={{ width: `${p}%` }}
        />
      </div>
      <span className="w-14 text-right text-cream-400 tabular-nums">
        {acertos}/{total}
      </span>
    </div>
  );
}

const CHART_W = 600;
const CHART_H = 160;
const PAD_X = 12;
const PAD_Y = 16;

function TrendChart({ trend }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  if (trend.length === 0) return null;

  const scores = trend.map((t) =>
    t.total > 0 ? Math.round((t.acertos / t.total) * 100) : 0,
  );
  const stepX =
    trend.length > 1 ? (CHART_W - PAD_X * 2) / (trend.length - 1) : 0;
  const coords = scores.map((score, i) => {
    const x = trend.length > 1 ? PAD_X + i * stepX : CHART_W / 2;
    const y = PAD_Y + (1 - score / 100) * (CHART_H - PAD_Y * 2);
    return { x, y, score, createdAt: trend[i].createdAt };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const midY = PAD_Y + (CHART_H - PAD_Y * 2) / 2;
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${CHART_H - PAD_Y} L ${coords[0].x.toFixed(1)} ${CHART_H - PAD_Y} Z`
      : null;

  const active = hoverIdx !== null ? coords[hoverIdx] : null;

  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl p-4">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Nota por simulado ao longo do tempo"
      >
        <line
          x1={PAD_X}
          y1={midY}
          x2={CHART_W - PAD_X}
          y2={midY}
          stroke="#F0DEDE"
          strokeWidth="1"
        />
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
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={hoverIdx === i ? 6 : 4}
            fill="#BA1E4A"
            stroke="#FFF8F8"
            strokeWidth="2"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
          />
        ))}
      </svg>
      <div className="text-xs text-cream-400 mt-2 h-4">
        {active && (
          <>
            {new Date(active.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })}{" "}
            · <span className="text-cream-50 font-medium">{active.score}%</span>
          </>
        )}
      </div>
    </div>
  );
}
