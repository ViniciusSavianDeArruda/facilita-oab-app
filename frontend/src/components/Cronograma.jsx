import {
  AdjustmentsHorizontalIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import {
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

function tituloAtividade(item) {
  if (item.tipo === "simulado") return "Simulado rápido";
  if (item.tipo === "caderno") return "Revisar caderno";
  return item.materia || "Revisar matéria";
}

function metaAtividade(item) {
  const tipo =
    item.tipo === "simulado"
      ? "Simulado"
      : item.tipo === "caderno"
        ? "Caderno"
        : "Revisão";
  return `${tipo} · ${item.minutos} min`;
}

function acaoAtividade(tipo) {
  if (tipo === "simulado") return "Começar";
  if (tipo === "caderno") return "Abrir";
  return "Estudar";
}

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
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-7xl md:px-8 md:py-8">
          <h1
            className="font-serif text-3xl text-cream-50 leading-tight tracking-tight mb-3"
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            {plano && !planoValido
              ? "Seu plano ficou desatualizado."
              : "Seu plano está vazio."}
          </h1>
          <p className="max-w-2xl text-cream-400 text-sm mb-8 leading-relaxed">
            {plano && !planoValido
              ? "A data da prova mudou desde que ele foi gerado. Você pode regenerar mantendo suas configurações."
              : "Gera um plano automático baseado nas suas horas por dia e matérias mais fracas. A data da prova é opcional — sem ela, vira um rodízio contínuo pelas matérias."}
          </p>

          <button
            onClick={onOpenConfig}
            className="w-full max-w-sm min-h-12 bg-brass hover:bg-brass-hover text-ink-950 font-medium py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          >
            {plano && !planoValido ? "Regenerar plano" : "Gerar meu plano"}
          </button>
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
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-7xl md:px-8 md:py-8">
        <div className="bg-surface-raised border border-ink-800 rounded-3xl shadow-[0_10px_35px_rgba(42,36,34,0.04)] p-5 sm:p-6 md:p-8">
          {/* Header do plano */}
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-1">
                Plano
              </p>
              <h1
                className="font-serif text-3xl text-cream-50 leading-tight tracking-tight"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                Próximos dias
              </h1>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {diasMostrados < totalDiasFuturos && (
                <button
                  onClick={() => onGoto("cronograma-completo")}
                  className="min-h-10 text-xs text-cream-400 hover:text-cream-50 bg-ink-950 border border-ink-800 hover:border-brass-dim px-3.5 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Ver cronograma completo →
                </button>
              )}
              <button
                  onClick={onOpenConfig}
                className="min-h-10 text-xs text-cream-400 hover:text-cream-50 bg-ink-950 border border-ink-800 hover:border-brass-dim px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                Ajustar plano
              </button>
            </div>
        </div>

        {/* Progresso da semana */}
        <section className="mb-8 max-w-2xl" aria-labelledby="progresso-sete-dias">
            <div className="flex items-start justify-between gap-3 text-xs text-cream-400 mb-2">
              <span className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 text-brass-dim shrink-0" />
                <span id="progresso-sete-dias">
                  Próximos 7 dias: {concluidosSemana} de {itensSemana} blocos concluídos
                </span>
              </span>
              <span className="tabular-nums font-medium text-cream-50 shrink-0">
                {progressoSemana}%
              </span>
            </div>
            <div
              className="h-2 bg-ink-800 rounded-full overflow-hidden"
              role="progressbar"
              aria-labelledby="progresso-sete-dias"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressoSemana}
            >
              <div
                className="h-full bg-brass transition-all duration-500"
                style={{ width: `${progressoSemana}%` }}
              ></div>
            </div>
        </section>

        {/* Hoje (destacado) */}
        {hoje && <DiaCard dia={hoje} isHoje={true} onGoto={onGoto} />}

          {/* Resto desta semana */}
          {restoDaSemana.length > 0 && (
            <section aria-labelledby="esta-semana">
              <div className="flex items-baseline justify-between gap-3 mt-8 mb-3">
                <h2 id="esta-semana" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                  Esta semana
                </h2>
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
          </section>
        )}

        {/* Semana seguinte */}
        {proximaSemana.length > 0 && (
          <section aria-labelledby="proxima-semana">
              <div className="flex items-baseline justify-between gap-3 mt-8 mb-3">
                <h2 id="proxima-semana" className="text-[11px] tracking-widest uppercase text-brass-dim font-medium">
                  Próxima semana
                </h2>
                <span className="text-[11px] text-cream-600">
                  {formatarDDMM(proximaSemana[0].data)} —{" "}
                  {formatarDDMM(proximaSemana[proximaSemana.length - 1].data)}
                </span>
              </div>
              <div className="bg-ink-900 border border-ink-800 rounded-2xl divide-y divide-ink-800">
                {proximaSemana.map((dia) => (
                  <DiaPlanejamentoResumo key={dia.data} dia={dia} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DiaCard({ dia, isHoje, onGoto }) {
  const nomeDia = nomeDiaSemana(dia.data);
  const dataFormatada = formatarDDMM(dia.data);
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  const borderCls = isHoje ? "border-brass" : "border-ink-800";
  const bgCls = isHoje ? "bg-brass/[0.03]" : "bg-ink-900";
  const opacityCls = dia.concluido ? "opacity-60" : "";

  return (
    <div className={`rounded-2xl border ${borderCls} ${bgCls} ${opacityCls}`}>
      <div className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${isHoje ? "sm:py-4" : ""}`}>
        <div className="min-w-0 flex items-baseline gap-2.5">
          <h2
            className={`font-serif ${isHoje ? "text-2xl text-brass" : "text-lg text-cream-50"}`}
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {nomeDia}
          </h2>
          <span className="text-xs text-cream-400 shrink-0">{dataFormatada}</span>
        </div>
        <span
          className={`shrink-0 text-xs font-medium tabular-nums ${isHoje ? "rounded-full bg-brass/10 px-2.5 py-1 text-brass-dim" : "text-cream-400"}`}
          aria-label={`${concluidos} de ${totalItens} blocos concluídos`}
        >
          {concluidos}/{totalItens}
        </span>
      </div>

      <div className={`border-t border-ink-800 px-4 py-3 sm:px-5 ${isHoje ? "space-y-1.5 sm:py-4" : "space-y-2"}`}>
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
        <div className="border-t border-ink-800 px-4 py-2.5 text-[11px] text-cream-600 sm:px-5">
          Total estimado: {formatarDuracao(totalMinutos)}
        </div>
      )}
    </div>
  );
}

function DiaPlanejamentoResumo({ dia }) {
  const nomeDia = nomeDiaSemana(dia.data);
  const dataFormatada = formatarDDMM(dia.data);
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <div className={`px-4 py-3.5 sm:px-5 ${dia.concluido ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex items-baseline gap-2.5">
          <h3
            className="font-serif text-lg text-cream-50 leading-tight"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {nomeDia}
          </h3>
          <span className="shrink-0 text-xs text-cream-400">{dataFormatada}</span>
        </div>
        <span
          className="shrink-0 text-xs text-cream-400 tabular-nums"
          aria-label={`${concluidos} de ${totalItens} blocos concluídos`}
        >
          {concluidos}/{totalItens}
        </span>
      </div>

      {grupos.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {grupos.map((grupo) => (
            <div key={grupo.chave}>
              <p className={`text-xs font-medium ${grupo.todasConcluidas ? "line-through text-cream-600" : "text-cream-50"}`}>
                {grupo.count > 1 ? `${grupo.count}× ` : ""}{tituloAtividade(grupo.item)}
              </p>
              <p className="mt-0.5 text-[11px] text-cream-600">
                {metaAtividade(grupo.item)}{grupo.count > 1 ? " cada" : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-cream-600 italic">A definir</p>
      )}

      <p className="mt-1.5 text-[11px] text-cream-600">
        Total estimado: {formatarDuracao(totalMinutos)}
      </p>
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
  return (
    <div className="py-0.5">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}>
        {count > 1 && (
          <span className={todasConcluidas ? "" : "text-brass-dim"}>{count}× </span>
        )}
          {tituloAtividade(item)}
        </p>
        <p className="text-xs text-cream-400 mt-0.5">
          {metaAtividade(item)}{count > 1 ? " cada" : ""}
        </p>
      </div>
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
      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 ${
        marcado
          ? "bg-brass border-brass"
          : "bg-transparent border-ink-700"
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

  function toggle() {
    const novoValor = !todasConcluidas;
    idxs.forEach((idx) => marcarItemConcluido(dataDia, idx, novoValor));
  }

  function irPra() {
    onGoto(destinoPorTipo(item.tipo));
  }

  return (
    <div className="flex items-start gap-3 py-1.5 sm:items-center">
      <ItemCheckbox marcado={todasConcluidas} onToggle={toggle} />
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-semibold ${todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}>
          {count > 1 && <span className={todasConcluidas ? "" : "text-brass-dim"}>{count}× </span>}
          {tituloAtividade(item)}
        </p>
        <p className="text-xs text-cream-400 mt-0.5">
          {metaAtividade(item)}{count > 1 ? " cada" : ""}
        </p>
      </div>
      {!todasConcluidas && (
        <button
          onClick={irPra}
          className="shrink-0 min-h-10 px-3 text-xs font-medium text-brass-dim rounded-lg transition-all sm:opacity-70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
          title={acaoAtividade(item.tipo)}
        >
          {acaoAtividade(item.tipo)} <span aria-hidden>→</span>
        </button>
      )}
    </div>
  );
}
