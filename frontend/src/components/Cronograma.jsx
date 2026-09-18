import {
  AdjustmentsHorizontalIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import {
  itemDescricao,
  loadPlano,
  marcarItemConcluido,
  nomeDiaSemana,
  planoEstaValido,
  proximos7Dias,
  recompactarPlano,
  subscribeCrono,
} from "../lib/cronograma";
import { loadSettings } from "../lib/settings";

// Fim da semana corrente (semana começa segunda, termina domingo).
function finalDaSemana(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  const diaSemana = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const diasAteDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
  d.setDate(d.getDate() + diasAteDomingo);
  return d.toISOString().slice(0, 10);
}

// "2026-09-18" -> "18/09".
function formatarDDMM(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

// Soma de minutos -> "1h20" (ou "45 min" se for menos de 1h).
function formatarDuracao(totalMinutos) {
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}

// Cor do bullet por tipo de item.
const CORES_TIPO = {
  revisar: "#8B1E3F",
  simulado: "#C23B2E",
  caderno: "#A8536A",
};

export default function Cronograma({ onOpenConfig, onGoto }) {
  const [plano, setPlano] = useState(loadPlano());

  useEffect(() => {
    // Recompacta ao entrar (se ela pulou dias)
    recompactarPlano();
    setPlano(loadPlano());
    const unsub = subscribeCrono(() => setPlano(loadPlano()));
    return unsub;
  }, []);

  // Se plano é inválido (data mudou), oferecer regeração
  const settings = loadSettings();
  const planoValido = plano
    ? planoEstaValido(plano, settings.dataProva)
    : false;

  if (!plano || !planoValido) {
    return (
      <div className="h-full overflow-y-auto bg-sand-50">
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-7xl md:mx-auto md:p-8 min-[1520px]:ml-16">
          <div className="bg-ink-950 rounded-2xl shadow-sm p-6 md:p-10">
            <h2
              className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-3"
              style={{ fontVariationSettings: '"opsz" 96' }}
            >
              {plano && !planoValido
                ? "Seu plano ficou desatualizado."
                : "Seu plano está vazio."}
            </h2>
            <p className="text-cream-400 text-sm mb-8 leading-relaxed">
              {plano && !planoValido
                ? "A data da prova mudou desde que ele foi gerado. Você pode regenerar mantendo suas configurações."
                : "Gera um plano automático baseado nas suas horas por dia e matérias mais fracas. A data da prova é opcional — sem ela, vira um rodízio contínuo pelas matérias."}
            </p>

            <button
              onClick={onOpenConfig}
              className="w-full bg-brass hover:bg-brass-hover text-ink-950 font-medium py-3 rounded-xl transition-colors"
            >
              {plano && !planoValido ? "Regenerar plano" : "Gerar meu plano"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const semana = proximos7Dias(plano);

  const hoje = semana[0];
  const fimDaSemana = hoje ? finalDaSemana(hoje.data) : null;

  // Janela dinâmica: hoje + resto desta semana + a semana seguinte inteira
  // (7 dias fechados, seg-dom) — o tamanho varia com o dia da semana atual,
  // em vez de uma janela fixa que sobrava/faltava dependendo do dia.
  const diasRestantesNaSemana = hoje
    ? Math.round(
        (new Date(fimDaSemana + "T00:00:00") - new Date(hoje.data + "T00:00:00")) /
          86400000,
      ) + 1
    : 0;
  const janela = proximos7Dias(plano, diasRestantesNaSemana + 7);
  const restoDaSemana = janela.slice(1).filter((d) => d.data <= fimDaSemana);
  const proximaSemana = janela.slice(1).filter((d) => d.data > fimDaSemana);

  const totalDiasFuturos = plano.dias.filter(
    (d) => d.data >= (hoje?.data || ""),
  ).length;
  const diasMostrados = 1 + restoDaSemana.length + proximaSemana.length;

  const itensSemana = semana.reduce((acc, d) => acc + d.itens.length, 0);
  const concluidosSemana = semana.reduce(
    (acc, d) => acc + d.itens.filter((i) => i.concluido).length,
    0,
  );
  const progressoSemana =
    itensSemana > 0 ? Math.round((concluidosSemana / itensSemana) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto bg-sand-50">
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-7xl md:mx-auto md:p-8 min-[1520px]:ml-16">
        <div className="bg-ink-950 rounded-2xl shadow-sm p-6 md:p-10">
          {/* Header do plano */}
          <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                Plano
              </p>
              <h2
                className="font-serif text-3xl text-cream-50 leading-tight tracking-tight"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                Próximos dias
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-2 ml-auto">
              {diasMostrados < totalDiasFuturos && (
                <button
                  onClick={() => onGoto("cronograma-completo")}
                  className="text-xs text-cream-400 hover:text-cream-50 bg-ink-950 border border-ink-800 hover:border-brass-dim px-3 py-1.5 rounded-full transition-colors"
                >
                  Ver cronograma completo →
                </button>
              )}
              <button
                onClick={onOpenConfig}
                className="text-xs text-cream-400 hover:text-cream-50 bg-ink-950 border border-ink-800 hover:border-brass-dim px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
              >
                <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                Ajustar plano
              </button>
            </div>
          </div>

          {/* Progresso da semana */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 text-xs text-cream-400 mb-2">
              <span className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 text-brass-dim shrink-0" />
                {concluidosSemana} de {itensSemana} blocos concluídos nesta
                semana
              </span>
              <span className="tabular-nums font-medium text-cream-50 shrink-0">
                {progressoSemana}%
              </span>
            </div>
            <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brass transition-all duration-500"
                style={{ width: `${progressoSemana}%` }}
              ></div>
            </div>
          </div>

          {/* Hoje (destacado) */}
          {hoje && <DiaCard dia={hoje} isHoje={true} onGoto={onGoto} />}

          {/* Resto desta semana */}
          {restoDaSemana.length > 0 && (
            <>
              <div className="flex items-baseline justify-between gap-3 mt-8 mb-3">
                <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                  Esta semana
                </p>
                <span className="text-[11px] text-cream-600">
                  {formatarDDMM(restoDaSemana[0].data)} —{" "}
                  {formatarDDMM(restoDaSemana[restoDaSemana.length - 1].data)}
                </span>
              </div>
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {restoDaSemana.map((dia) => (
                  <DiaCard
                    key={dia.data}
                    dia={dia}
                    isHoje={false}
                    onGoto={onGoto}
                  />
                ))}
              </div>
            </>
          )}

          {/* Semana seguinte */}
          {proximaSemana.length > 0 && (
            <>
              <div className="flex items-baseline justify-between gap-3 mt-8 mb-3">
                <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                  Próxima semana
                </p>
                <span className="text-[11px] text-cream-600">
                  {formatarDDMM(proximaSemana[0].data)} —{" "}
                  {formatarDDMM(proximaSemana[proximaSemana.length - 1].data)}
                </span>
              </div>
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {proximaSemana.map((dia) => (
                  <DiaCard
                    key={dia.data}
                    dia={dia}
                    isHoje={false}
                    muted={true}
                    onGoto={onGoto}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiaCard({ dia, isHoje, muted, onGoto }) {
  const nomeDia = nomeDiaSemana(dia.data);
  const dataFormatada = formatarDDMM(dia.data);
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  const borderCls = isHoje ? "border-brass" : "border-ink-800";
  const bgCls = muted ? "bg-ink-950" : "bg-ink-900";
  const opacityCls = dia.concluido ? "opacity-60" : "";

  return (
    <div className={`rounded-2xl border ${borderCls} ${bgCls} ${opacityCls}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span
            className={`font-serif text-lg ${isHoje ? "text-brass" : "text-cream-50"}`}
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {nomeDia}
          </span>
          <span className="text-xs text-cream-400">{dataFormatada}</span>
        </div>
        <span className="text-xs text-cream-400 tabular-nums">
          {concluidos}/{totalItens}
        </span>
      </div>

      <div className="border-t border-ink-800 px-5 py-3 space-y-2">
        {grupos.length === 0 ? (
          <p className="text-sm text-cream-600 italic">A definir</p>
        ) : isHoje ? (
          grupos.map((grupo, idx) => (
            <ItemRowGroup
              key={idx}
              grupo={grupo}
              dataDia={dia.data}
              onGoto={onGoto}
            />
          ))
        ) : (
          grupos.map((grupo, idx) => <ItemRowPreview key={idx} grupo={grupo} />)
        )}
      </div>

      {!isHoje && (
        <div className="border-t border-ink-800 px-5 py-2.5 text-[11px] text-cream-600">
          Total estimado: {formatarDuracao(totalMinutos)}
        </div>
      )}
    </div>
  );
}

// Pra onde o botão de ação de cada item deve levar.
export function destinoPorTipo(tipo) {
  if (tipo === "simulado") return "simulado-landing";
  if (tipo === "caderno") return "caderno";
  return "chat"; // revisar -> Chat pra tirar dúvidas da matéria
}

// Agrupa itens idênticos (mesmo tipo/matéria/duração) pra exibição
// compacta — ex.: "2× Revisar caderno · 15 min cada". Guarda os índices
// originais (idxs) pra permitir marcar/desmarcar o grupo inteiro de uma
// vez em ItemRowGroup, e se todos os itens do grupo já estão concluídos.
export function agruparItens(itens) {
  const grupos = [];
  itens.forEach((item, idx) => {
    const chave = `${item.tipo}|${item.materia || ""}|${item.minutos}`;
    const existente = grupos.find((g) => g.chave === chave);
    if (existente) {
      existente.count++;
      existente.idxs.push(idx);
      if (!item.concluido) existente.todasConcluidas = false;
    } else {
      grupos.push({
        chave,
        item,
        count: 1,
        idxs: [idx],
        todasConcluidas: item.concluido,
      });
    }
  });
  return grupos;
}

// Checkbox visual (não-clicável) pros dias que são só planejamento —
// mesmo estilo do checkbox de Hoje, sem a interação de marcar/desmarcar.
function ItemRowPreview({ grupo }) {
  const { item, count, todasConcluidas } = grupo;
  const desc = itemDescricao(item) + (count > 1 ? " cada" : "");
  const cor = CORES_TIPO[item.tipo] || CORES_TIPO.revisar;
  return (
    <div className="flex items-center gap-3">
      <span
        className="shrink-0 w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: cor }}
      ></span>
      <span
        className={`flex-1 text-sm ${todasConcluidas ? "text-cream-600 line-through" : "text-cream-400"}`}
      >
        {count > 1 && (
          <span className="text-cream-50 font-medium">{count}× </span>
        )}
        {desc}
      </span>
    </div>
  );
}

// Checkbox interativo redondo (marcado = preenchido com check) — usado
// no card "Hoje" do Cronograma.jsx e reaproveitado no painel de detalhe
// do dia em CronogramaCalendario.jsx, pra não duplicar o visual/estado.
export function ItemCheckbox({ marcado, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        marcado
          ? "bg-brass border-brass"
          : "bg-transparent border-ink-700 hover:border-brass-dim"
      }`}
      aria-label={marcado ? "Desmarcar" : "Marcar concluído"}
    >
      {marcado && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.5L4.5 8.5L9.5 3.5"
            stroke="#FFFCF6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// Checkbox interativo de Hoje — atua sobre o grupo inteiro (todos os
// idxs originais) quando o item aparece condensado (ex.: "2x Revisar
// caderno"), marcando/desmarcando todos de uma vez.
function ItemRowGroup({ grupo, dataDia, onGoto }) {
  const { item, count, idxs, todasConcluidas } = grupo;
  const desc = itemDescricao(item) + (count > 1 ? " cada" : "");

  function toggle() {
    const novoValor = !todasConcluidas;
    idxs.forEach((idx) => marcarItemConcluido(dataDia, idx, novoValor));
  }

  function irPra() {
    onGoto(destinoPorTipo(item.tipo));
  }

  return (
    <div className="flex items-center gap-3 group">
      <ItemCheckbox marcado={todasConcluidas} onToggle={toggle} />
      <span
        className={`flex-1 text-sm ${todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}
      >
        {count > 1 && (
          <span className={todasConcluidas ? "" : "text-cream-50 font-medium"}>
            {count}×{" "}
          </span>
        )}
        {desc}
      </span>
      {!todasConcluidas && (
        <button
          onClick={irPra}
          className="text-xs text-brass-dim hover:text-brass opacity-0 group-hover:opacity-100 transition-all"
          title="Ir agora"
        >
          →
        </button>
      )}
    </div>
  );
}
