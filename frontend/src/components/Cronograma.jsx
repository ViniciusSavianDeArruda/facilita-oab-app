import {
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
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

const DIAS_ABREVIADOS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
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

function diaDoMes(dataStr) {
  return String(new Date(dataStr + "T00:00:00").getDate()).padStart(2, "0");
}

function mesDoAno(dataStr) {
  return String(new Date(dataStr + "T00:00:00").getMonth() + 1).padStart(
    2,
    "0",
  );
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

// Faixa dos 7 dias como card mestre: cabeçalho com o progresso agregado e a
// trilha, e no corpo um tile por dia. O tile é discreto de propósito — a
// faixa orienta, quem age é o card de Hoje logo abaixo.
function FaixaSeteDias({ dias, concluidos, total, progresso }) {
  return (
    <section
      aria-labelledby="proximos-7-dias"
      className="rounded-2xl border border-ink-800 bg-ink-950"
    >
      <div className="border-b border-border-subtle px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <h2
            id="proximos-7-dias"
            className="font-serif text-xl leading-tight text-cream-50"
          >
            Próximos 7 dias
          </h2>
          <p className="text-[13px] text-cream-400">
            <span id="progresso-sete-dias">
              {concluidos} de {plural(total, "bloco", "blocos")} concluídos
            </span>
            <span className="ml-1.5 font-medium tabular-nums text-cream-50">
              {progresso}%
            </span>
          </p>
        </div>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-track"
          role="progressbar"
          aria-labelledby="progresso-sete-dias"
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

      <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-4 sm:px-6 sm:py-5 lg:grid-cols-7">
        {dias.map((dia, idx) => (
          <TileDia key={dia.data} dia={dia} isHoje={idx === 0} />
        ))}
      </div>
    </section>
  );
}

function TileDia({ dia, isHoje }) {
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <div
      className={`rounded-xl border bg-ink-900 px-3 py-2.5 ${
        isHoje ? "border-ink-700" : "border-surface-border-subtle"
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${isHoje ? "text-brass" : "text-cream-400"}`}
      >
        {isHoje ? "Hoje" : abreviaDiaSemana(dia.data)}
      </p>
      <p
        className="mt-1 font-serif text-2xl leading-none tabular-nums text-cream-50"
        style={{ fontVariationSettings: '"opsz" 60' }}
      >
        {diaDoMes(dia.data)}
        <span className="text-base text-cream-400">/{mesDoAno(dia.data)}</span>
      </p>
      <div className="mt-2.5 flex items-baseline justify-between gap-2 text-[11px]">
        {totalItens === 0 ? (
          <span className="text-cream-400">Livre</span>
        ) : (
          <>
            <span
              className={`tabular-nums ${dia.concluido ? "text-feedback-success-text" : "text-cream-400"}`}
              aria-label={`${concluidos} de ${totalItens} blocos concluídos`}
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
  );
}

// Card mestre de Hoje — a prioridade principal da tela. Cabeçalho interno
// com dia, data e progresso; tarefas como linhas espaçadas, sem card dentro
// de card.
function CardHoje({ dia, onGoto }) {
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <section
      aria-labelledby="dia-hoje"
      className="rounded-2xl border border-ink-800 bg-ink-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-border-subtle px-5 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2
            id="dia-hoje"
            className="font-serif text-2xl leading-tight text-brass"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {nomeDiaSemana(dia.data)}
          </h2>
          <p className="mt-1 text-[13px] text-cream-400">
            {nomeDiaSemanaPorExtenso(dia.data)}, {formatarDDMM(dia.data)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className={`text-[13px] font-medium tabular-nums ${dia.concluido ? "text-feedback-success-text" : "text-cream-50"}`}
          >
            {concluidos} de {plural(totalItens, "bloco", "blocos")} concluídos
          </span>
          {totalItens > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-pill-border bg-surface-pill px-3 py-1.5 text-[11px] font-semibold leading-none tabular-nums text-brass">
              <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {formatarDuracao(totalMinutos)}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {grupos.length === 0 ? (
          <p className="text-sm italic text-cream-400">A definir</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {grupos.map((grupo) => (
              <ItemRowGroup
                key={grupo.chave}
                grupo={grupo}
                dataDia={dia.data}
                onGoto={onGoto}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Resto da semana corrente. Diferente de "Próxima semana", aqui não há card
// mestre: o título fica solto sobre a página e cada dia é um card de nível
// mestre. A semana corrente ainda é acionável, então os dias ganham presença
// própria em vez de virarem subcards de um contêiner.
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
          {formatarDDMM(dias[0].data)} —{" "}
          {formatarDDMM(dias[dias.length - 1].data)} ·{" "}
          {plural(dias.length, "dia", "dias")} ·{" "}
          {plural(blocos, "bloco", "blocos")} · {formatarDuracao(minutos)}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {dias.map((dia) => (
          <CardDiaSemana key={dia.data} dia={dia} />
        ))}
      </div>
    </section>
  );
}

// Um dia de "Esta semana" como card próprio: cabeçalho com dia e data,
// atividades, duração total e uma trilha de progresso com dado real.
function CardDiaSemana({ dia }) {
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);
  const progresso =
    totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;
  const progressoId = `progresso-${dia.data}`;

  return (
    <div className="flex flex-col rounded-2xl border border-ink-800 bg-ink-950 px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h3
            className="font-serif text-lg leading-tight text-cream-50"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {nomeDiaSemana(dia.data)}
          </h3>
          <span className="shrink-0 text-[13px] tabular-nums text-cream-400">
            {formatarDDMM(dia.data)}
          </span>
        </div>
        {totalItens > 0 && (
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-cream-400">
            {formatarDuracao(totalMinutos)}
          </span>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="mt-3 text-sm italic text-cream-400">A definir</p>
      ) : (
        <ul className="mt-3 space-y-2">
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

      {totalItens > 0 && (
        <div className="mt-auto pt-4">
          <div
            className="h-1 overflow-hidden rounded-full bg-surface-track"
            role="progressbar"
            aria-labelledby={progressoId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso}
          >
            <div
              className="h-full rounded-full bg-brass transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p
            id={progressoId}
            className={`mt-2 text-[11px] font-medium tabular-nums ${dia.concluido ? "text-feedback-success-text" : "text-cream-400"}`}
          >
            {concluidos} de {totalItens} concluídos
          </p>
        </div>
      )}
    </div>
  );
}

// Card mestre da próxima semana: cabeçalho com ícone, título e resumo, ação
// de recolher, e dentro dele um grid de subcards de dia (discretos — radius
// menor que o do card mestre, sem sombra e sem hover, por não serem
// clicáveis).
function ProximaSemana({ dias }) {
  const [aberta, setAberta] = useState(true);
  const { blocos, minutos } = resumoDeDias(dias);

  return (
    <section
      aria-labelledby="proxima-semana"
      className="rounded-2xl border border-ink-800 bg-ink-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-border-subtle px-5 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <CalendarDaysIcon
              className="h-5 w-5 shrink-0 text-brass"
              aria-hidden="true"
            />
            <h2
              id="proxima-semana"
              className="font-serif text-xl leading-tight text-cream-50"
            >
              Próxima semana
            </h2>
          </div>
          <p className="mt-1 text-[13px] tabular-nums text-cream-400">
            {formatarDDMM(dias[0].data)} —{" "}
            {formatarDDMM(dias[dias.length - 1].data)} ·{" "}
            {plural(dias.length, "dia", "dias")} ·{" "}
            {plural(blocos, "bloco", "blocos")} · {formatarDuracao(minutos)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          aria-controls="proxima-semana-dias"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-1 py-2 text-xs font-medium text-brass transition-[color] duration-150 hover:text-brass-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
        >
          {aberta ? "Ocultar detalhes" : "Ver detalhes"}
          <ChevronDownIcon
            className={`h-3.5 w-3.5 transition-transform duration-200 ease-editorial motion-reduce:transition-none ${aberta ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div
        id="proxima-semana-dias"
        hidden={!aberta}
        className={
          aberta
            ? "grid gap-3 px-5 py-4 sm:px-6 sm:py-5 md:grid-cols-2"
            : undefined
        }
      >
        {dias.map((dia) => (
          <DiaPlanejamentoResumo key={dia.data} dia={dia} />
        ))}
      </div>
    </section>
  );
}

function DiaPlanejamentoResumo({ dia }) {
  const totalItens = dia.itens.length;
  const concluidos = dia.itens.filter((i) => i.concluido).length;
  const grupos = agruparItens(dia.itens);
  const totalMinutos = dia.itens.reduce((acc, i) => acc + i.minutos, 0);

  return (
    <div className="rounded-xl border border-surface-border-subtle bg-ink-900 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex items-baseline gap-2.5">
          <h3
            className="font-serif text-base leading-tight text-cream-50"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {nomeDiaSemana(dia.data)}
          </h3>
          <span className="shrink-0 text-[13px] text-cream-400">
            {formatarDDMM(dia.data)}
          </span>
        </div>
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-cream-400">
          {formatarDuracao(totalMinutos)}
        </span>
      </div>

      {grupos.length > 0 ? (
        <ul className="mt-2.5 space-y-1.5">
          {grupos.map((grupo) => (
            <li
              key={grupo.chave}
              className={`text-[13px] leading-snug ${grupo.todasConcluidas ? "text-cream-600 line-through" : "text-cream-50"}`}
            >
              <span className="font-medium">
                {grupo.count > 1 ? `${grupo.count}× ` : ""}
                {tituloAtividade(grupo.item)}
              </span>
              <span className="text-cream-400">
                {" · "}
                {tipoAtividade(grupo.item)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] italic text-cream-400">A definir</p>
      )}

      <p
        className={`mt-3 text-[11px] font-medium tabular-nums ${dia.concluido ? "text-feedback-success-text" : "text-cream-400"}`}
      >
        {concluidos} de {totalItens} concluídos
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
          rotulo={`${count > 1 ? `${count} blocos de ` : ""}${tituloAtividade(item)}, ${item.minutos} min, ${formatarDDMM(dataDia)}`}
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
