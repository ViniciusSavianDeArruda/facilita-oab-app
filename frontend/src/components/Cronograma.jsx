import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import {
  loadPlano,
  hydrateCronogramaPlano,
  marcarItensConcluidos,
  nomeDiaSemana,
  planoEstaValido,
  planoLoadStatus,
  proximos7Dias,
  recompactarPlano,
  subscribeCrono,
} from "../lib/cronograma";
import { loadSettings } from "../lib/settings";
import { agruparItens, destinoPorTipo } from "../utils/cronogramaHelpers";

// Fim da semana corrente (semana começa segunda, termina domingo).
function finalDaSemana(dataStr) {
  const d = new Date(dataStr + "T00:00:00");
  const diaSemana = d.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const diasAteDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
  d.setDate(d.getDate() + diasAteDomingo);
  return d.toISOString().slice(0, 10);
}

// Soma de minutos -> "1h20" (ou "45 min" se for menos de 1h).
function formatarDuracao(totalMinutos) {
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return `${min} min`;
  if (min === 0) return `${h}h`;
  return `${h}h${String(min).padStart(2, "0")}`;
}

const DIAS_ABREVIADOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_ABREV = [
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
const DIAS_POR_EXTENSO = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function abreviaDiaSemana(dataStr) {
  return DIAS_ABREVIADOS[new Date(dataStr + "T00:00:00").getDay()];
}

function nomeDiaSemanaPorExtenso(dataStr) {
  return DIAS_POR_EXTENSO[new Date(dataStr + "T00:00:00").getDay()];
}

function diaDoMesNumero(dataStr) {
  return new Date(dataStr + "T00:00:00").getDate();
}

function mesAbreviado(dataStr) {
  return MESES_ABREV[new Date(dataStr + "T00:00:00").getMonth()];
}

// "2026-10-08" -> "8 out". Formato editorial único da tela Plano.
function formatarDiaMes(dataStr) {
  return `${diaDoMesNumero(dataStr)} ${mesAbreviado(dataStr)}`;
}

// Minutos ainda não concluídos do dia — derivado dos itens já persistidos,
// sem métrica nova.
function minutosRestantes(dia) {
  return dia.itens.reduce((acc, i) => (i.concluido ? acc : acc + i.minutos), 0);
}

function plural(n, singular, pluralForma) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

// Totais de uma lista de dias — tudo derivado dos itens já persistidos.
function resumoDeDias(dias) {
  const blocos = dias.reduce((acc, d) => acc + d.itens.length, 0);
  const minutos = dias.reduce(
    (acc, d) => acc + d.itens.reduce((s, i) => s + i.minutos, 0),
    0,
  );
  return { blocos, minutos };
}

function tituloAtividade(item) {
  if (item.tipo === "simulado") return "Simulado rápido";
  if (item.tipo === "caderno") return "Revisar caderno";
  return item.materia || "Revisar matéria";
}

function tipoAtividade(item) {
  if (item.tipo === "simulado") return "Simulado";
  if (item.tipo === "caderno") return "Caderno";
  return "Revisão";
}

function metaAtividade(item) {
  return `${tipoAtividade(item)} · ${item.minutos} min`;
}

function acaoAtividade(tipo) {
  if (tipo === "simulado") return "Começar";
  if (tipo === "caderno") return "Abrir";
  return "Estudar";
}

export default function Cronograma({ onOpenConfig, onGoto }) {
  const [plano, setPlano] = useState(loadPlano());
  const [loadStatus, setLoadStatus] = useState(planoLoadStatus());
  const [recompactError, setRecompactError] = useState(false);

  useEffect(() => {
    const unsub = subscribeCrono(() => {
      setPlano(loadPlano());
      setLoadStatus(planoLoadStatus());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (loadStatus !== "ready") return;
    let active = true;
    setRecompactError(false);
    recompactarPlano().catch(() => {
      if (active) setRecompactError(true);
    });
    return () => { active = false; };
  }, [loadStatus]);

  // Se plano é inválido (data mudou), oferecer regeração
  const settings = loadSettings();
  const planoValido = plano
    ? planoEstaValido(plano, settings.dataProva)
    : false;

  if (loadStatus === "loading") {
    return (
      <div className="h-full overflow-y-auto bg-sand-50">
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 md:px-8 md:py-8">
          <p className="text-sm text-cream-400" role="status">Carregando seu plano…</p>
        </div>
      </div>
    );
  }

  if (loadStatus === "error") {
    return (
      <div className="h-full overflow-y-auto bg-sand-50">
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 md:px-8 md:py-8">
          <div role="alert" className="max-w-xl text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3">
            Não foi possível carregar seu plano. Tente novamente.
          </div>
          <button
            onClick={() => hydrateCronogramaPlano()}
            className="mt-4 min-h-10 px-4 rounded-lg border border-surface-border-button bg-ink-950 text-sm font-medium text-cream-50 hover:bg-surface-button-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!plano || !planoValido) {
    return (
      <div className="h-full overflow-y-auto bg-sand-50">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 md:px-8 md:py-8">
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
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
          {recompactError && (
            <div role="alert" className="mb-5 text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3">
              Não foi possível reorganizar as tarefas pendentes. Seu plano anterior foi preservado.
            </div>
          )}
          {/* Header do plano */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-brass">
                Plano
              </p>
              <h1
                className="font-serif text-3xl text-cream-50 leading-tight tracking-tight"
                style={{ fontVariationSettings: '"opsz" 96' }}
              >
                Próximos dias
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {diasMostrados < totalDiasFuturos && (
                <button
                  onClick={() => onGoto("cronograma-completo")}
                  className="flex min-h-10 items-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3.5 py-2 text-xs font-medium text-cream-50 transition-[background-color,border-color,color] duration-150 hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus-visible:outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/20"
                >
                  <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  Ver cronograma completo
                </button>
              )}
              <button
                onClick={onOpenConfig}
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3.5 py-2 text-xs font-medium text-cream-50 transition-[background-color,border-color,color] duration-150 hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus-visible:outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/20"
              >
                <AdjustmentsHorizontalIcon
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Ajustar plano
              </button>
            </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          <FaixaSeteDias
            dias={semana}
            concluidos={concluidosSemana}
            total={itensSemana}
            progresso={progressoSemana}
          />

          {hoje && <CardHoje dia={hoje} onGoto={onGoto} />}

          {restoDaSemana.length > 0 && <EstaSemana dias={restoDaSemana} />}

          {proximaSemana.length > 0 && <ProximaSemana dias={proximaSemana} />}
        </div>
      </div>
    </div>
  );
}

// Faixa dos 7 dias: tiles direto sobre a página, sem card mestre. Só o dia
// de hoje ganha superfície — os demais orientam, não acionam. A trilha
// agregada saiu; o progresso de cada dia é dito pelos segmentos do tile.
function FaixaSeteDias({ dias, concluidos, total, progresso }) {
  return (
    <section aria-labelledby="proximos-7-dias">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-1">
        <h2
          id="proximos-7-dias"
          className="font-serif text-xl leading-tight text-cream-50"
        >
          Próximos 7 dias
        </h2>
        <p className="text-[13px] text-cream-400">
          <span id="progresso-sete-dias">
            {concluidos} de {plural(total, "atividade", "atividades")}{" "}
            concluídas
          </span>
          <span className="ml-1.5 font-medium tabular-nums text-cream-50">
            {progresso}%
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {dias.map((dia, idx) => (
          <TileDia key={dia.data} dia={dia} isHoje={idx === 0} />
        ))}
      </div>
    </section>
  );
}

// Acima deste número de atividades os segmentos ficariam finos demais pra
// serem lidos, e a trilha contínua comunica melhor.
const LIMITE_SEGMENTOS = 6;

// Progresso do dia na faixa: um segmento por atividade enquanto couber.
// Decorativo pro leitor de tela — o contador "2/4" logo abaixo já carrega
// a mesma informação com rótulo acessível.
function SegmentosDia({ itens }) {
  const total = itens.length;

  if (total === 0) {
    return (
      <div className="h-1 rounded-full bg-surface-track" aria-hidden="true" />
    );
  }

  if (total > LIMITE_SEGMENTOS) {
    const concluidos = itens.filter((i) => i.concluido).length;
    const pct = Math.round((concluidos / total) * 100);
    return (
      <div
        className="h-1 overflow-hidden rounded-full bg-surface-track"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-brass transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-1" aria-hidden="true">
      {itens.map((item, idx) => (
        <span
          key={idx}
          className={`h-1 flex-1 rounded-full ${item.concluido ? "bg-brass" : "bg-surface-track"}`}
        />
      ))}
    </div>
  );
}

function TileDia({ dia, isHoje }) {
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        isHoje ? "border border-ink-800 bg-ink-950" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`text-[13px] font-medium ${isHoje ? "text-cream-50" : "text-cream-400"}`}
        >
          {abreviaDiaSemana(dia.data)}
        </span>
        {isHoje && (
          <span className="shrink-0 rounded-full border border-brass/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.14em] text-brass">
            Hoje
          </span>
        )}
      </div>

      <p
        className="mt-1 font-serif text-2xl leading-none tabular-nums text-cream-50"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {diaDoMesNumero(dia.data)}
        <span className="ml-1 font-sans text-sm text-cream-400">
          {mesAbreviado(dia.data)}
        </span>
      </p>

      <div className="mt-2.5">
        <SegmentosDia itens={dia.itens} />
        <div className="mt-2 flex items-baseline justify-between gap-2 text-[11px]">
          {totalItens === 0 ? (
            <span className="text-cream-400">Livre</span>
          ) : (
            <>
              <span
                className={`tabular-nums ${dia.concluido ? "text-feedback-success-text" : "text-cream-400"}`}
                aria-label={`${concluidos} de ${totalItens} atividades concluídas`}
              >
                {concluidos}/{totalItens}
              </span>
              <span className="shrink-0 tabular-nums text-cream-400">
                {formatarDuracao(totalMinutos)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Card mestre de Hoje — a prioridade principal da tela. Cabeçalho com data,
// volume e progresso; no corpo, a próxima atividade promovida e o restante
// como linhas.
function CardHoje({ dia, onGoto }) {
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);
  const restantes = minutosRestantes(dia);
  const progresso =
    totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

  // Próxima atividade = primeiro grupo ainda pendente, derivado do estado
  // real. Sem pendência não há o que destacar: o card mostra o dia fechado
  // e a lista continua inteira, pra permitir desmarcar.
  const idxProximo = grupos.findIndex((g) => !g.todasConcluidas);
  const proximo = idxProximo >= 0 ? grupos[idxProximo] : null;
  const demais = grupos.filter((_, i) => i !== idxProximo);

  return (
    <section
      aria-labelledby="dia-hoje"
      className="rounded-2xl border border-ink-800 bg-ink-950"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 border-b border-border-subtle px-5 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2
            id="dia-hoje"
            className="font-serif text-2xl leading-tight text-cream-50"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            Hoje
          </h2>
          <p className="mt-1 text-[13px] text-cream-400">
            {nomeDiaSemanaPorExtenso(dia.data)}, {formatarDiaMes(dia.data)}
            {totalItens > 0 && (
              <>
                {" · "}
                {plural(totalItens, "atividade", "atividades")}
                {" · "}
                {formatarDuracao(totalMinutos)}
              </>
            )}
          </p>
        </div>

        {totalItens > 0 && (
          <div className="w-full sm:w-auto sm:min-w-[260px]">
            <div className="flex items-baseline justify-between gap-4 text-[13px]">
              <span
                id="progresso-hoje"
                className={`font-medium tabular-nums ${dia.concluido ? "text-feedback-success-text" : "text-cream-50"}`}
              >
                {concluidos} de {totalItens} concluídas
              </span>
              {restantes > 0 && (
                <span className="shrink-0 tabular-nums text-cream-400">
                  {formatarDuracao(restantes)} restantes
                </span>
              )}
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-surface-track"
              role="progressbar"
              aria-labelledby="progresso-hoje"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progresso}
            >
              <div
                className="h-full rounded-full bg-brass transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {grupos.length === 0 ? (
          <p className="text-sm italic text-cream-400">A definir</p>
        ) : (
          <>
            {proximo ? (
              <ProximaAtividade
                grupo={proximo}
                dataDia={dia.data}
                onGoto={onGoto}
              />
            ) : (
              <div className="rounded-xl border border-surface-border-subtle bg-ink-900 px-4 py-3.5 sm:px-5 sm:py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-feedback-success-text">
                  Dia concluído
                </p>
                <p className="mt-1.5 text-[13px] text-cream-400">
                  Todas as atividades de hoje estão marcadas. Desmarque alguma
                  se precisar retomar.
                </p>
              </div>
            )}

            {demais.length > 0 && (
              <div className="mt-4 divide-y divide-border-subtle">
                {demais.map((grupo) => (
                  <ItemRowGroup
                    key={grupo.chave}
                    grupo={grupo}
                    dataDia={dia.data}
                    onGoto={onGoto}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// Primeira atividade pendente de hoje, promovida pra fechar a dúvida de "o
// que eu faço agora". Superfície neutra com borda vinho à esquerda e ação
// primária vinho — sem preenchimento rosa.
function ProximaAtividade({ grupo, dataDia, onGoto }) {
  const { item, count, idxs, todasConcluidas } = grupo;

  function toggle() {
    marcarItensConcluidos(dataDia, idxs, !todasConcluidas);
  }

  return (
    <div className="rounded-xl border border-l-[3px] border-surface-border-subtle border-l-brass bg-ink-900 px-4 py-3.5 sm:px-5 sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
        A seguir
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-3">
        {/* Mesma compensação do alvo de 44px usada nas linhas abaixo. */}
        <div className="-ml-3 shrink-0">
          <ItemCheckbox
            marcado={todasConcluidas}
            onToggle={toggle}
            rotulo={`${count > 1 ? `${count} atividades de ` : ""}${tituloAtividade(item)}, ${item.minutos} min, ${formatarDiaMes(dataDia)}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-cream-50">
            {count > 1 && <span className="text-brass">{count}× </span>}
            {tituloAtividade(item)}
          </p>
          <p className="mt-1 text-[13px] text-cream-400">
            {metaAtividade(item)}
            {count > 1 ? " cada" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGoto(destinoPorTipo(item.tipo))}
          className="group/btn inline-flex w-full min-h-11 shrink-0 appearance-none items-center justify-center gap-1.5 rounded-lg bg-brass px-5 py-2.5 text-[13px] font-medium text-ink-950 shadow-btn-primary transition-[background-color,box-shadow] duration-150 ease-out hover:bg-brass-hover hover:shadow-btn-primary-hover focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 sm:w-auto"
        >
          {acaoAtividade(item.tipo)}
          <span
            aria-hidden="true"
            className="transition-transform duration-150 ease-out group-hover/btn:translate-x-[3px] motion-reduce:transition-none"
          >
            →
          </span>
        </button>
      </div>
    </div>
  );
}

// "Amanhã" é informação real que a referência não mostra — preservada. Os
// demais dias usam o nome por extenso, como na composição do Figma.
function rotuloDiaSemana(dataStr) {
  const curto = nomeDiaSemana(dataStr);
  if (curto === "Hoje" || curto === "Amanhã") return curto;
  return nomeDiaSemanaPorExtenso(dataStr);
}

// Resto da semana corrente como agenda editorial: uma superfície mestre e um
// dia por linha, separados por divisor. Substituiu o grid de cards por dia —
// sete retângulos aninhados viravam ruído onde um divisor resolve.
function EstaSemana({ dias }) {
  const { blocos, minutos } = resumoDeDias(dias);

  return (
    <section aria-labelledby="esta-semana">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 px-1">
        <h2
          id="esta-semana"
          className="font-serif text-xl leading-tight text-cream-50"
        >
          Esta semana
        </h2>
        <p className="text-[13px] tabular-nums text-cream-400">
          {formatarDiaMes(dias[0].data)} —{" "}
          {formatarDiaMes(dias[dias.length - 1].data)} ·{" "}
          {plural(dias.length, "dia", "dias")} ·{" "}
          {plural(blocos, "atividade", "atividades")} ·{" "}
          {formatarDuracao(minutos)}
        </p>
      </div>

      <div className="rounded-2xl border border-ink-800 bg-ink-950">
        <div className="divide-y divide-border-subtle">
          {dias.map((dia) => (
            <LinhaDiaSemana key={dia.data} dia={dia} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Um dia como linha editorial: rótulo e volume à esquerda, atividades à
// direita, duração alinhada ao fim de cada linha. Sem barra e sem contador
// de conclusão — o progresso vive na faixa de 7 dias e no card de Hoje. O
// estado de cada atividade continua visível pelo risco, que é o que permite
// reconhecer uma tarefa já feita.
function LinhaDiaSemana({ dia }) {
  const totalItens = dia.itens.length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <div className="px-5 py-4 sm:px-6 sm:py-5 md:grid md:grid-cols-[13rem_minmax(0,1fr)] md:gap-x-8">
      <div className="min-w-0">
        <h3
          className="font-serif text-lg leading-tight text-cream-50"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          {rotuloDiaSemana(dia.data)}
        </h3>
        <p className="mt-0.5 text-[13px] tabular-nums text-cream-400">
          {formatarDiaMes(dia.data)}
          {totalItens > 0 && (
            <>
              {" · "}
              {plural(totalItens, "atividade", "atividades")}
              {" · "}
              {formatarDuracao(totalMinutos)}
            </>
          )}
        </p>
      </div>

      <div className="mt-3 min-w-0 md:mt-0">
        {grupos.length === 0 ? (
          <p className="text-sm italic text-cream-400">A definir</p>
        ) : (
          <ul className="space-y-2.5">
            {grupos.map((grupo) => (
              <li
                key={grupo.chave}
                className="flex items-baseline justify-between gap-4 text-sm leading-snug"
              >
                <span
                  className={`min-w-0 ${grupo.todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}
                >
                  <span className="font-medium">
                    {grupo.count > 1 && (
                      <span className={grupo.todasConcluidas ? "" : "text-brass"}>
                        {grupo.count}×{" "}
                      </span>
                    )}
                    {tituloAtividade(grupo.item)}
                  </span>
                  <span className="text-cream-400">
                    {" · "}
                    {tipoAtividade(grupo.item)}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-cream-400">
                  {grupo.item.minutos} min{grupo.count > 1 ? " cada" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Próxima semana: agenda em duas colunas editoriais dentro de um card
// mestre. Mais leve que "Esta semana" de propósito — tipografia menor, sem
// coluna de rótulo e sem progresso: é planejamento, não ação. A separação
// entre dias vem do divisor de topo de cada bloco, que no desktop alinha
// linha a linha entre as duas colunas.
function ProximaSemana({ dias }) {
  const [aberta, setAberta] = useState(true);
  const { blocos, minutos } = resumoDeDias(dias);

  return (
    <section
      aria-labelledby="proxima-semana"
      className="rounded-2xl border border-ink-800 bg-ink-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-5 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
        <div className="min-w-0">
          <h2
            id="proxima-semana"
            className="font-serif text-xl leading-tight text-cream-50"
          >
            Próxima semana
          </h2>
          <p className="mt-1 text-[13px] tabular-nums text-cream-400">
            {formatarDiaMes(dias[0].data)} —{" "}
            {formatarDiaMes(dias[dias.length - 1].data)} ·{" "}
            {plural(dias.length, "dia", "dias")} ·{" "}
            {plural(blocos, "atividade", "atividades")} ·{" "}
            {formatarDuracao(minutos)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          aria-controls="proxima-semana-dias"
          className="group/toggle inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg text-[13px] font-medium text-cream-400 transition-[color] duration-150 ease-out hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
        >
          {aberta ? "Ocultar detalhes" : "Ver detalhes"}
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border-button bg-ink-950 transition-[background-color,border-color] duration-150 ease-out group-hover/toggle:border-surface-border-button-hover group-hover/toggle:bg-surface-button-hover">
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ease-editorial motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </span>
        </button>
      </div>

      <div
        id="proxima-semana-dias"
        hidden={!aberta}
        className={
          aberta
            ? "grid gap-x-8 px-5 pb-4 sm:px-6 sm:pb-5 md:grid-cols-2"
            : undefined
        }
      >
        {dias.map((dia) => (
          <BlocoDiaProximaSemana key={dia.data} dia={dia} />
        ))}
      </div>
    </section>
  );
}

// Um dia de planejamento: cabeçalho com dia, data, volume e duração, e as
// atividades logo abaixo. Sem superfície e sem borda própria — o divisor de
// topo basta pra separar. Atividade concluída mantém o risco, único
// indicador de conclusão preservado nesta seção.
function BlocoDiaProximaSemana({ dia }) {
  const totalItens = dia.itens.length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <div className="border-t border-border-subtle py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3
            className="font-serif text-base leading-tight text-cream-50"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {rotuloDiaSemana(dia.data)}
          </h3>
          <span className="text-[13px] tabular-nums text-cream-400">
            {formatarDiaMes(dia.data)}
            {totalItens > 0 && (
              <>
                {" · "}
                {plural(totalItens, "atividade", "atividades")}
              </>
            )}
          </span>
        </div>
        {totalItens > 0 && (
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-cream-400">
            {formatarDuracao(totalMinutos)}
          </span>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="mt-2 text-[13px] italic text-cream-400">A definir</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {grupos.map((grupo) => (
            <li
              key={grupo.chave}
              className="flex items-baseline justify-between gap-4 text-[13px] leading-snug"
            >
              <span
                className={`min-w-0 ${grupo.todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}
              >
                <span className="font-medium">
                  {grupo.count > 1 && (
                    <span className={grupo.todasConcluidas ? "" : "text-brass"}>
                      {grupo.count}×{" "}
                    </span>
                  )}
                  {tituloAtividade(grupo.item)}
                </span>
                <span className="text-cream-400">
                  {" · "}
                  {tipoAtividade(grupo.item)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-cream-400">
                {grupo.item.minutos} min{grupo.count > 1 ? " cada" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Checkbox interativo redondo (marcado = preenchido com check) — usado
// no card "Hoje" do Cronograma.jsx e reaproveitado no painel de detalhe
// do dia em CronogramaCalendario.jsx, pra não duplicar o visual/estado.
export function ItemCheckbox({ marcado, onToggle, rotulo }) {
  const acao = marcado ? "Desmarcar" : "Marcar concluído";
  return (
    <button
      onClick={onToggle}
      type="button"
      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
      aria-label={rotulo ? `${acao}: ${rotulo}` : acao}
      aria-pressed={marcado}
    >
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
        marcado
          ? "bg-brass border-brass"
          : "bg-transparent border-ink-700"
      }`}>
        {marcado && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
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
    marcarItensConcluidos(dataDia, idxs, novoValor);
  }

  function irPra() {
    onGoto(destinoPorTipo(item.tipo));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 py-2.5 first:pt-0 last:pb-0 sm:py-3">
      {/* Compensa o alvo de 44px do checkbox pra que o círculo fique
          alinhado à borda de conteúdo do card, e não 12px adentro. */}
      <div className="-ml-3 shrink-0">
        <ItemCheckbox
          marcado={todasConcluidas}
          onToggle={toggle}
          rotulo={`${count > 1 ? `${count} blocos de ` : ""}${tituloAtividade(item)}, ${item.minutos} min, ${formatarDiaMes(dataDia)}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-semibold leading-snug ${todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}>
          {count > 1 && <span className={todasConcluidas ? "" : "text-brass"}>{count}× </span>}
          {tituloAtividade(item)}
        </p>
        <p className="mt-1 text-[13px] text-cream-400">
          {metaAtividade(item)}{count > 1 ? " cada" : ""}
        </p>
      </div>
      {!todasConcluidas && (
        <button
          onClick={irPra}
          className="group/btn inline-flex w-full min-h-10 shrink-0 appearance-none items-center justify-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3.5 py-2 text-[13px] font-medium text-cream-50 transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/20 sm:ml-auto sm:w-auto"
        >
          {acaoAtividade(item.tipo)}
          <span
            aria-hidden="true"
            className="transition-transform duration-150 ease-out group-hover/btn:translate-x-[3px] motion-reduce:transition-none"
          >
            →
          </span>
        </button>
      )}
    </div>
  );
}
