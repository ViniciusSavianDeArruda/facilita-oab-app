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
        <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-none md:mx-0 md:px-8 md:py-10">
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
      <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:max-w-none md:mx-0 md:px-8 md:py-10">
        <div className="bg-ink-950 rounded-2xl shadow-sm p-6 md:p-10">
          {/* Header do plano */}
          <div className="flex items-start justify-between gap-4 mb-6">
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
            <button
              onClick={onOpenConfig}
              className="text-xs text-cream-400 hover:text-cream-50 bg-ink-950 border border-ink-800 hover:border-brass-dim px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0 mt-2"
            >
              Ajustar plano
            </button>
          </div>

          {/* Progresso da semana */}
          <div className="mb-8">
            <div className="flex items-center gap-3 text-xs text-cream-400 mb-2">
              <span>
                {concluidosSemana} de {itensSemana} dessa semana
              </span>
              <div className="flex-1 h-2 bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brass transition-all duration-500"
                  style={{ width: `${progressoSemana}%` }}
                ></div>
              </div>
              <span className="tabular-nums">{progressoSemana}%</span>
            </div>
          </div>

          {/* Hoje (destacado) */}
          {hoje && <DiaCard dia={hoje} isHoje={true} onGoto={onGoto} />}

          {/* Resto desta semana */}
          {restoDaSemana.length > 0 && (
            <>
              <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mt-8 mb-3">
                Esta semana
              </p>
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
              <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mt-8 mb-3">
                Próxima semana
              </p>
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

          {diasMostrados < totalDiasFuturos && (
            <button
              onClick={() => onGoto("cronograma-completo")}
              className="w-full mt-6 text-xs text-cream-400 hover:text-brass border border-ink-800 hover:border-brass-dim rounded-xl py-2.5 transition-colors"
            >
              Ver cronograma completo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DiaCard({ dia, isHoje, muted, onGoto }) {
  const nomeDia = nomeDiaSemana(dia.data);
  const dataObj = new Date(dia.data + "T00:00:00");
  const dataFormatada = `${dataObj.getDate().toString().padStart(2, "0")}/${(dataObj.getMonth() + 1).toString().padStart(2, "0")}`;
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);

  const cls = isHoje ? "border-brass bg-ink-900" : "border-ink-800 bg-ink-900";
  const opacityCls = dia.concluido ? "opacity-60" : muted ? "opacity-70" : "";

  return (
    <div className={`rounded-2xl border ${cls} ${opacityCls}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
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

      <div className="border-t border-ink-800 px-5 py-4 space-y-2">
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
    </div>
  );
}

// Agrupa itens idênticos (mesmo tipo/matéria/duração) pra exibição
// compacta — ex.: "2× Revisar caderno · 15 min cada". Guarda os índices
// originais (idxs) pra permitir marcar/desmarcar o grupo inteiro de uma
// vez em ItemRowGroup, e se todos os itens do grupo já estão concluídos.
function agruparItens(itens) {
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
  return (
    <div className="flex items-center gap-3">
      <span
        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
          todasConcluidas ? "bg-brass border-brass" : "bg-transparent border-ink-700"
        }`}
      >
        {todasConcluidas && (
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
      </span>
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
    if (item.tipo === "simulado") onGoto("simulado-landing");
    else if (item.tipo === "caderno") onGoto("caderno");
    else if (item.tipo === "revisar") onGoto("chat"); // Chat pra tirar dúvidas da matéria
  }

  return (
    <div className="flex items-center gap-3 group">
      <button
        onClick={toggle}
        className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
          todasConcluidas
            ? "bg-brass border-brass"
            : "bg-transparent border-ink-700 hover:border-brass-dim"
        }`}
        aria-label={todasConcluidas ? "Desmarcar" : "Marcar concluído"}
      >
        {todasConcluidas && (
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
