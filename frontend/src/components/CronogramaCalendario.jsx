import { useEffect, useState } from "react";
import { itemDescricao, loadPlano, subscribeCrono } from "../lib/cronograma";

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

function mesDaData(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return { ano: d.getFullYear(), mes: d.getMonth() };
}

export default function CronogramaCalendario({ onBack }) {
  const [plano, setPlano] = useState(loadPlano());

  useEffect(() => {
    const unsub = subscribeCrono(() => setPlano(loadPlano()));
    return unsub;
  }, []);

  const hojeStr = new Date().toISOString().slice(0, 10);
  const [mesAtual, setMesAtual] = useState(() => mesDaData(hojeStr));
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  if (!plano || plano.dias.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-md mx-auto px-6 pt-16 pb-8">
          <button
            onClick={onBack}
            className="text-xs text-cream-400 hover:text-cream-50 transition-colors mb-6 flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> voltar
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

  const diaInfo = diaSelecionado ? diasPorData.get(diaSelecionado) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-md mx-auto px-6 py-8 md:max-w-[760px] md:mx-auto md:px-10">
        <button
          onClick={onBack}
          className="text-xs text-cream-400 hover:text-cream-50 transition-colors mb-6 flex items-center gap-1.5"
        >
          <span aria-hidden>←</span> voltar
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
              Cronograma completo
            </p>
            <h2
              className="font-serif text-2xl text-cream-50"
              style={{ fontVariationSettings: '"opsz" 96' }}
            >
              {NOMES_MES[mesAtual.mes]} {mesAtual.ano}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => mudarMes(-1)}
              disabled={!podeVoltar}
              className="w-9 h-9 rounded-full border border-ink-800 text-cream-400 hover:text-cream-50 hover:border-brass-dim disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Mês anterior"
            >
              ‹
            </button>
            <button
              onClick={() => mudarMes(1)}
              disabled={!podeAvancar}
              className="w-9 h-9 rounded-full border border-ink-800 text-cream-400 hover:text-cream-50 hover:border-brass-dim disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Próximo mês"
            >
              ›
            </button>
          </div>
        </div>

        <div className="md:grid md:grid-cols-[1fr_320px] md:gap-8 md:items-start">
          <div>
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {DIAS_SEMANA.map((n) => (
                <div
                  key={n}
                  className="text-center text-[10px] tracking-wider uppercase text-cream-600 font-medium py-1"
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {celulas.map((data, i) => {
                if (!data) return <div key={`vazio-${i}`} />;
                const info = diasPorData.get(data);
                const isHoje = data === hojeStr;
                const isSelecionado = data === diaSelecionado;
                const temSimulado = info?.itens.some(
                  (it) => it.tipo === "simulado",
                );
                const numDia = parseInt(data.slice(8, 10), 10);

                let cls = "border-transparent text-cream-600";
                if (info)
                  cls = "border-ink-800 bg-ink-900 hover:border-brass-dim";
                if (isHoje) cls = "border-brass-dim bg-brass/[0.03]";
                if (isSelecionado) cls = "border-brass bg-brass/10";

                return (
                  <button
                    key={data}
                    onClick={() =>
                      info && setDiaSelecionado(isSelecionado ? null : data)
                    }
                    disabled={!info}
                    className={`aspect-square rounded-xl border text-xs flex flex-col items-center justify-center gap-1 transition-colors ${cls}`}
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
                    {info && (
                      <span className="flex gap-0.5">
                        {temSimulado && (
                          <span className="w-1 h-1 rounded-full bg-brass"></span>
                        )}
                        {info.concluido ? (
                          <span className="w-1 h-1 rounded-full bg-brass-dim"></span>
                        ) : (
                          !temSimulado && (
                            <span className="w-1 h-1 rounded-full bg-ink-700"></span>
                          )
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-cream-400 mb-8 md:mb-0">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brass"></span>{" "}
                Simulado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brass-dim"></span>{" "}
                Concluído
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-700"></span>{" "}
                Pendente
              </span>
            </div>
          </div>

          {/* Detalhe do dia selecionado */}
          <div>
            {diaInfo ? (
              <div className="bg-ink-900 border border-brass-dim rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span
                    className="font-serif text-lg text-cream-50"
                    style={{ fontVariationSettings: '"opsz" 60' }}
                  >
                    {formatarDataLonga(diaInfo.data)}
                  </span>
                  <span className="text-xs text-cream-400 tabular-nums shrink-0">
                    {diaInfo.itens.filter((i) => i.concluido).length}/
                    {diaInfo.itens.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {diaInfo.itens.map((item, idx) => (
                    <div key={item.id ?? idx} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-brass-dim mt-2 shrink-0"></span>
                      <span
                        className={`flex-1 text-sm ${item.concluido ? "text-cream-600 line-through" : "text-cream-50"}`}
                      >
                        {itemDescricao(item)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="hidden md:block text-sm text-cream-400 border border-dashed border-ink-800 rounded-2xl p-5">
                Toque num dia com marcação pra ver as tarefas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatarDataLonga(iso) {
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
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
}
