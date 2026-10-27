import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { reduzirAviso } from "../lib/avisoCaderno";
import {
  atualizarAnotacao,
  atualizarStatus,
  listar,
  remover,
  subscribe,
} from "../lib/caderno";
import { cx } from "../lib/format";

const STATUS_LABELS = {
  aberto: "Aberto",
  revisando: "Revisando",
  dominado: "Dominado",
};
const STATUS_ORDER = ["aberto", "revisando", "dominado"];
const STATUS_DOT = {
  aberto: "bg-brass",
  revisando: "bg-amber-500",
  dominado: "bg-feedback-success-text",
};
const FILTER_CONTROL =
  "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass sm:px-3";
const filterTone = (selected) =>
  selected
    ? "border-brass bg-surface-nav-hover font-medium text-text-primary"
    : "border-border-default bg-ink-950 text-text-secondary hover:border-brass-dim hover:text-text-primary";
const ALTERNATIVE_LETTERS = ["A", "B", "C", "D"];
const EYEBROW =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-brass";
const MARKDOWN_COMPONENTS = {
  table({ node: _node, ...props }) {
    return (
      <div className="markdown-table-scroll">
        <table {...props} />
      </div>
    );
  },
};
function stripMarkdown(text) {
  return (text || "")
    .replace(/[*_`#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function formatDate(value, options) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf())
    ? date.toLocaleDateString("pt-BR", options)
    : "Sem data";
}
function matchesFilters(item, status, materia, comAnotacao) {
  if (materia !== "todas" && item.materia !== materia) return false;
  if (comAnotacao && !item.anotacao?.trim()) return false;
  return status === "todos" || item.status === status;
}

export default function Caderno({ onDiscussWithMentor }) {
  const [items, setItems] = useState(() => listar());
  const [filtroMateria, setFiltroMateria] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [comAnotacao, setComAnotacao] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [mobileReading, setMobileReading] = useState(false);
  const [aviso, dispatchAviso] = useReducer(reduzirAviso, null);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const listScrollTopRef = useRef(0);
  const restoreListScrollRef = useRef(false);
  const listButtonRefs = useRef(new Map());

  useEffect(
    () =>
      subscribe(() => {
        dispatchAviso("limpar");
        const nextItems = listar();
        setItems(nextItems);
        setSelectedId((currentId) =>
          currentId &&
          nextItems.some(
            (item) =>
              item.id === currentId &&
              matchesFilters(item, filtroStatus, filtroMateria, comAnotacao),
          )
            ? currentId
            : null,
        );
      }),
    [filtroMateria, filtroStatus, comAnotacao],
  );

  const materias = useMemo(
    () => Array.from(new Set(items.map((item) => item.materia))).sort(),
    [items],
  );
  const filtered = items.filter((item) =>
    matchesFilters(item, filtroStatus, filtroMateria, comAnotacao),
  );
  const selected = selectedId
    ? filtered.find((item) => item.id === selectedId) || null
    : null;
  const contagens = {
    aberto: items.filter((item) => item.status === "aberto").length,
    revisando: items.filter((item) => item.status === "revisando").length,
    dominado: items.filter((item) => item.status === "dominado").length,
    anotacoes: items.filter((item) => item.anotacao?.trim()).length,
  };

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [selected?.id]);
  useEffect(() => {
    if (mobileReading && selectedId) rootRef.current?.scrollTo({ top: 0 });
  }, [mobileReading, selectedId]);
  useEffect(() => {
    if (!mobileReading && restoreListScrollRef.current) {
      rootRef.current?.scrollTo({ top: listScrollTopRef.current });
      restoreListScrollRef.current = false;
    }
  }, [mobileReading]);

  function closeReading() {
    const closingId = selectedId;
    restoreListScrollRef.current = mobileReading;
    setSelectedId(null);
    setMobileReading(false);
    if (closingId)
      requestAnimationFrame(() =>
        listButtonRefs.current.get(closingId)?.focus({ preventScroll: true }),
      );
  }
  function escolherStatus(status) {
    dispatchAviso("filtrar");
    setFiltroStatus(status);
    if (
      selected &&
      !matchesFilters(selected, status, filtroMateria, comAnotacao)
    )
      setSelectedId(null);
  }
  function escolherMateria(materia) {
    dispatchAviso("filtrar");
    setFiltroMateria(materia);
    if (
      selected &&
      !matchesFilters(selected, filtroStatus, materia, comAnotacao)
    )
      setSelectedId(null);
  }
  function alternarAnotacao() {
    dispatchAviso("filtrar");
    const next = !comAnotacao;
    setComAnotacao(next);
    if (
      selected &&
      !matchesFilters(selected, filtroStatus, filtroMateria, next)
    )
      setSelectedId(null);
  }
  useEffect(() => {
    if (!selectedId) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      restoreListScrollRef.current = mobileReading;
      setSelectedId(null);
      setMobileReading(false);
      requestAnimationFrame(() =>
        listButtonRefs.current.get(selectedId)?.focus({ preventScroll: true }),
      );
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, mobileReading]);
  const selectedIndex = selected
    ? filtered.findIndex((item) => item.id === selected.id)
    : -1;
  function goToSibling(offset) {
    const target = filtered[selectedIndex + offset];
    if (!target) return;
    setSelectedId(target.id);
    listButtonRefs.current.get(target.id)?.scrollIntoView({ block: "nearest" });
  }
  function selectItem(id) {
    dispatchAviso("selecionar");
    if (selectedId === id) return closeReading();
    listScrollTopRef.current = rootRef.current?.scrollTop || 0;
    setSelectedId(id);
    setMobileReading(true);
  }

  if (items.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-xl px-5 pb-10 pt-20 text-center sm:px-6 sm:pt-24">
          <p
            className="mb-3 font-serif text-3xl leading-tight tracking-tight text-text-primary"
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            Seu caderno está vazio.
          </p>
          <p className="leading-relaxed text-text-secondary">
            Toda vez que você errar uma questão num simulado, ela vem parar aqui
            automaticamente. No chat, use o botão "salvar no caderno" nas
            respostas que você quer guardar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-0 flex-col overflow-y-auto bg-surface-page lg:overflow-hidden"
    >
      <header className="shrink-0 border-b border-border-subtle bg-surface-page px-4 py-4 sm:px-6 xl:px-10">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
            Caderno
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1
                className="font-serif text-2xl leading-tight tracking-tight text-text-primary sm:text-3xl"
                style={{ fontVariationSettings: '"opsz" 144' }}
              >
                Erros para revisar
              </h1>
              <p className="text-sm text-text-secondary">
                {items.length === 1
                  ? "1 registro"
                  : `${items.length} registros`}
              </p>
            </div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              <Summary
                count={contagens.aberto}
                label="abertos"
                tone="text-brass"
              />
              <Summary
                count={contagens.revisando}
                label="revisando"
                tone="text-text-primary"
              />
              <Summary
                count={contagens.dominado}
                label="dominados"
                tone="text-text-muted"
              />
              <Summary
                count={contagens.anotacoes}
                label="com anotações"
                tone="text-brass-dim"
              />
            </dl>
          </div>
          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
            <div
              role="group"
              aria-label="Filtrar por status"
              className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2"
            >
              <FilterButton
                selected={filtroStatus === "todos"}
                onClick={() => escolherStatus("todos")}
              >
                Todos
              </FilterButton>
              {STATUS_ORDER.map((status) => (
                <FilterButton
                  key={status}
                  status={status}
                  selected={filtroStatus === status}
                  onClick={() => escolherStatus(status)}
                >
                  {STATUS_LABELS[status]}
                </FilterButton>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {materias.length > 1 && (
                <MateriaSelect
                  value={filtroMateria}
                  materias={materias}
                  onChange={escolherMateria}
                />
              )}
              <FilterButton
                selected={comAnotacao}
                onClick={alternarAnotacao}
                className="shrink-0"
              >
                <PencilSquareIcon
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                Com anotação
              </FilterButton>
            </div>
          </div>
        </div>
      </header>

      {aviso && (
        <div className="shrink-0 px-4 pt-4 sm:px-6 lg:mx-auto lg:w-full lg:max-w-[1400px] lg:px-6 lg:pb-0 lg:pt-4 xl:px-10">
          <p role="alert" className="text-sm text-alert">
            {aviso}
          </p>
        </div>
      )}

      <div
        className="shrink-0 lg:mx-auto lg:grid lg:min-h-0 lg:w-full lg:max-w-[1400px] lg:flex-1 lg:grid-cols-[minmax(15rem,0.34fr)_minmax(0,0.66fr)] lg:gap-5 lg:px-6 lg:py-4 xl:grid-cols-[minmax(18rem,0.32fr)_minmax(0,0.68fr)] xl:px-10"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeReading();
        }}
      >
        <section
          className={cx(
            "px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border-default lg:bg-surface-raised lg:px-0 lg:py-0",
            mobileReading ? "hidden lg:block" : "block",
          )}
          aria-label="Lista de registros"
        >
          <div className="space-y-2 lg:p-3">
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-text-secondary">
                Nenhum item nos filtros selecionados.
              </p>
            ) : (
              filtered.map((item) => (
                <RecordListItem
                  key={item.id}
                  item={item}
                  selected={selected?.id === item.id}
                  onSelect={() => selectItem(item.id)}
                  buttonRef={(element) =>
                    element
                      ? listButtonRefs.current.set(item.id, element)
                      : listButtonRefs.current.delete(item.id)
                  }
                />
              ))
            )}
          </div>
        </section>
        <section
          ref={panelRef}
          className={cx(
            "bg-surface-raised px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border-default lg:px-0 lg:py-0",
            mobileReading ? "block" : "hidden lg:block",
          )}
          aria-label="Leitura do registro selecionado"
        >
          <div className="mx-auto max-w-4xl lg:p-6 xl:px-10 xl:py-7">
            <button
              type="button"
              onClick={closeReading}
              className="mb-5 inline-flex min-h-10 appearance-none items-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3.5 py-2 text-[13px] font-medium text-cream-50 transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus:outline-none focus-visible:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 active:outline-none lg:hidden"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              Voltar ao Caderno
            </button>
            {selected ? (
              <ReadingPanel
                key={selected.id}
                item={selected}
                onClose={closeReading}
                onRemocaoFalhou={() => dispatchAviso("remocao-falhou")}
                onDiscussWithMentor={onDiscussWithMentor}
                position={selectedIndex + 1}
                total={filtered.length}
                onPrevious={
                  selectedIndex > 0 ? () => goToSibling(-1) : undefined
                }
                onNext={
                  selectedIndex < filtered.length - 1
                    ? () => goToSibling(1)
                    : undefined
                }
              />
            ) : (
              <EmptyReadingPanel />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Summary({ count, label, tone }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className={cx("font-medium tabular-nums", tone)}>{count}</dd>
      <span>{label}</span>
    </div>
  );
}
function StatusDot({ status }) {
  return (
    <span
      className={cx(
        "h-2 w-2 shrink-0 rounded-full",
        STATUS_DOT[status] || STATUS_DOT.aberto,
      )}
      aria-hidden="true"
    />
  );
}
function FilterButton({ selected, onClick, children, status, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        FILTER_CONTROL,
        "justify-center",
        filterTone(selected),
        className,
      )}
    >
      {status && <StatusDot status={status} />}
      {children}
    </button>
  );
}
function MateriaSelect({ value, materias, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const options = ["todas", ...materias];
  const active = value !== "todas";

  useEffect(() => {
    if (!open) return undefined;
    const index = value === "todas" ? 0 : materias.indexOf(value) + 1;
    optionRefs.current[Math.max(0, index)]?.focus();
  }, [open, value, materias]);
  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }
  function choose(next) {
    onChange(next);
    close();
  }
  function focusOption(index) {
    const last = options.length - 1;
    optionRefs.current[Math.min(last, Math.max(0, index))]?.focus();
  }
  function handleTriggerKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
    }
  }
  function handleListKeyDown(event) {
    const current = optionRefs.current.indexOf(document.activeElement);
    if (event.key === "ArrowDown") focusOption(current + 1);
    else if (event.key === "ArrowUp") focusOption(current - 1);
    else if (event.key === "Home") focusOption(0);
    else if (event.key === "End") focusOption(options.length - 1);
    else if (event.key === "Enter" || event.key === " ") {
      if (current >= 0) choose(options[current]);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else return;
    event.preventDefault();
  }

  return (
    <div
      ref={wrapperRef}
      className="relative min-w-0 flex-1 lg:w-56 lg:flex-none"
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          "Filtrar por matéria: " + (active ? value : "todas as matérias")
        }
        className={cx(
          FILTER_CONTROL,
          "w-full justify-between",
          filterTone(active),
        )}
      >
        <span className="truncate">{active ? value : "Todas as matérias"}</span>
        <ChevronDownIcon
          className="h-3.5 w-3.5 shrink-0 text-text-secondary"
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Matéria"
          onKeyDown={handleListKeyDown}
          className="absolute left-0 top-full z-30 mt-1 max-h-64 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border-default bg-ink-950 p-1 shadow-subcard-hover"
        >
          {options.map((option, index) => {
            const isSelected = option === value;
            return (
              <li
                key={option}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => choose(option)}
                className={cx(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-surface-nav-hover focus:bg-surface-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass",
                  isSelected
                    ? "font-medium text-text-primary"
                    : "text-text-secondary",
                )}
              >
                <span className="truncate">
                  {option === "todas" ? "Todas as matérias" : option}
                </span>
                {isSelected && (
                  <CheckIcon
                    className="h-3.5 w-3.5 shrink-0 text-brass"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecordListItem({ item, selected, onSelect, buttonRef }) {
  const sourceText =
    item.origin === "simulado" ? item.questao?.enunciado : item.pergunta;
  const preview =
    stripMarkdown(sourceText) || "Registro sem conteúdo disponível.";
  const dataStr = formatDate(item.createdAt, {
    day: "2-digit",
    month: "short",
  });
  const dotClass = STATUS_DOT[item.status] || STATUS_DOT.aberto;
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(
        "relative w-full rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
        selected
          ? "border-border-default bg-surface-nav-hover"
          : "border-transparent hover:border-border-default hover:bg-surface-subtle",
      )}
    >
      {selected && (
        <span
          className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-brass"
          aria-hidden="true"
        />
      )}
      <span className="flex items-start gap-2.5">
        <span
          className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass)}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span
            className={cx(
              "line-clamp-2 text-sm leading-relaxed",
              item.status === "dominado"
                ? "text-text-secondary"
                : "text-text-primary",
            )}
          >
            {preview}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-secondary">
            <span className="font-medium">{item.materia || "Geral"}</span>
            <span aria-hidden="true">·</span>
            <span>{dataStr}</span>
            <span aria-hidden="true">·</span>
            <span>{STATUS_LABELS[item.status] || "Aberto"}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

const NAV_BUTTON =
  "inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-surface-border-button bg-ink-950 text-cream-50 transition-[background-color,border-color,color] duration-150 ease-out hover:border-surface-border-button-hover hover:bg-surface-button-hover hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-surface-border-button disabled:hover:bg-ink-950 disabled:hover:text-cream-50";

function ReadingPanel({
  item,
  onClose,
  onRemocaoFalhou,
  onDiscussWithMentor,
  position = 0,
  total = 0,
  onPrevious,
  onNext,
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [erro, setErro] = useState("");
  const isSimulation = item.origin === "simulado";
  const hasCompleteQuestion = Boolean(item.questao?.enunciado);
  async function salvarAnotacao(event) {
    const texto = event.currentTarget.value;
    if (texto === (item.anotacao ?? "")) return;
    setErro("");
    if (await atualizarAnotacao(item.id, texto)) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } else {
      setErro(
        "Não foi possível salvar a anotação. Clique fora do campo para tentar de novo.",
      );
    }
  }
  async function mudarStatus(status) {
    setErro("");
    if (!(await atualizarStatus(item.id, status))) {
      setErro("Não foi possível alterar o status. Tente novamente.");
    }
  }
  async function deletarItem() {
    if (!confirm("Remover este item do caderno?")) return;
    setErro("");
    if (!(await remover(item.id))) onRemocaoFalhou();
  }
  function discutir() {
    if (isSimulation) {
      if (hasCompleteQuestion)
        onDiscussWithMentor(item.questao, item.respostaDada, null, {
          anotacao: item.anotacao,
        });
      return;
    }
    const anotacaoTexto = item.anotacao
      ? "\n\nMinha anotação foi: " + item.anotacao
      : "";
    const prompt =
      "Estava revisando esta dúvida do meu caderno:\n\n**Pergunta:** " +
      (item.pergunta || "") +
      "\n\n**Você respondeu:** " +
      (item.resposta || "") +
      anotacaoTexto +
      "\n\nAinda tenho dúvida sobre isso — pode reforçar a explicação?";
    onDiscussWithMentor(null, null, prompt, {
      tituloOverride: "Revisar: " + (item.pergunta || "dúvida").slice(0, 40),
    });
  }
  return (
    <article className="space-y-7">
      <header className="flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-secondary">
            <span className={EYEBROW}>{item.materia || "Geral"}</span>
            <span aria-hidden="true">·</span>
            <span>
              {formatDate(item.createdAt, {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span aria-hidden="true">·</span>
            <span>{isSimulation ? "Questão do simulado" : "Chat"}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {position > 0 && (
            <div className="hidden items-center gap-1 lg:flex">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!onPrevious}
                aria-label="Registro anterior"
                className={NAV_BUTTON}
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-text-secondary">
                {position} de {total}
              </span>
              <button
                type="button"
                onClick={onNext}
                disabled={!onNext}
                aria-label="Próximo registro"
                className={NAV_BUTTON}
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitura"
            className="hidden min-h-9 min-w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass lg:inline-flex"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>
      {isSimulation ? (
        hasCompleteQuestion ? (
          <SimuladoReview
            questao={item.questao}
            respostaDada={item.respostaDada}
          />
        ) : (
          <Notice>
            Esta questão salva não possui os dados necessários para revisão.
          </Notice>
        )
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className={cx(EYEBROW, "mb-3")}>Pergunta</h2>
            <MarkdownBlock className="font-serif text-lg leading-relaxed text-text-primary sm:text-xl">
              {item.pergunta || "Pergunta não disponível."}
            </MarkdownBlock>
          </div>
          <div className="border-t border-border-subtle pt-6">
            <h2 className={cx(EYEBROW, "mb-3")}>Resposta do Mentor</h2>
            <MarkdownBlock className="text-sm leading-relaxed text-text-primary">
              {item.resposta || "Resposta não disponível."}
            </MarkdownBlock>
          </div>
        </div>
      )}
      <section className="border-t border-border-subtle pt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor={"anotacao-" + item.id}
            className="text-[11px] font-medium uppercase tracking-widest text-brass-dim"
          >
            Minha anotação
          </label>
          {savedFlash && <span className="text-[11px] text-brass">salvo</span>}
        </div>
        {erro && (
          <p role="alert" className="mb-2 text-xs text-alert">
            {erro}
          </p>
        )}
        <textarea
          key={item.anotacao ?? ""}
          id={"anotacao-" + item.id}
          defaultValue={item.anotacao ?? ""}
          onBlur={salvarAnotacao}
          placeholder="Ex.: confundi com o art. 5º / lembrar que decadência não interrompe"
          rows={2}
          className="w-full resize-none rounded-xl border border-border-default bg-surface-subtle p-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        />
      </section>
      <section className="space-y-3 border-t border-border-subtle pt-5">
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          aria-label="Status do registro"
        >
          {STATUS_ORDER.map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => mudarStatus(status)}
              aria-pressed={item.status === status}
              className={cx(
                "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
                item.status === status
                  ? "border-brass bg-surface-nav-hover font-medium text-text-primary"
                  : "border-border-default text-text-secondary hover:border-brass-dim hover:text-text-primary",
              )}
            >
              <StatusDot status={status} />
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={discutir}
            disabled={isSimulation && !hasCompleteQuestion}
            className="min-h-11 flex-1 rounded-xl border border-brass-dim px-4 py-2.5 text-sm text-brass transition-colors hover:bg-brass/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-50"
          >
            Conversar com o mentor →
          </button>
          <button
            type="button"
            onClick={deletarItem}
            className="min-h-11 rounded-xl px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            Remover
          </button>
        </div>
      </section>
    </article>
  );
}
function MarkdownBlock({ className, children }) {
  return (
    <div className={cx("markdown break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
function SimuladoReview({ questao, respostaDada }) {
  const letters = ALTERNATIVE_LETTERS.filter(
    (letter) => questao.alternativas?.[letter],
  );
  const hasExplanation = Boolean(
    questao.fundamento_legal || questao.explicacao,
  );
  return (
    <div className="space-y-8">
      <div>
        <h2 className={cx(EYEBROW, "mb-3")}>Enunciado</h2>
        <p
          className="font-serif text-lg leading-relaxed text-text-primary sm:text-xl"
          style={{ fontVariationSettings: '"opsz" 60' }}
        >
          {questao.enunciado}
        </p>
      </div>
      {letters.length > 0 && (
        <div>
          <h2 className={cx(EYEBROW, "mb-1")}>Alternativas</h2>
          <ul className="divide-y divide-border-subtle">
            {letters.map((letter) => {
              const isCorrect = letter === questao.correta;
              const isAnswer = letter === respostaDada;
              const isWrong = isAnswer && !isCorrect;
              const tag = isAnswer
                ? isCorrect
                  ? "Sua resposta · Gabarito"
                  : "Sua resposta"
                : isCorrect
                  ? "Gabarito"
                  : null;
              return (
                <li
                  key={letter}
                  className={cx(
                    "flex items-start gap-4 px-3 py-3",
                    isCorrect && "bg-feedback-success/5",
                    isWrong && "bg-alert/5",
                  )}
                >
                  <span
                    className={cx(
                      "mt-px w-4 shrink-0 font-serif text-base",
                      isCorrect
                        ? "text-feedback-success-text"
                        : isWrong
                          ? "text-alert"
                          : "text-brass-dim",
                    )}
                    aria-hidden="true"
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-relaxed text-text-primary">
                    <span className="sr-only">Alternativa {letter}. </span>
                    {questao.alternativas[letter]}
                    {tag && (
                      <span
                        className={cx(
                          "ml-2 text-[10px] font-semibold uppercase tracking-widest",
                          isWrong ? "text-alert" : "text-feedback-success-text",
                        )}
                      >
                        {tag}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hasExplanation && (
        <div className="border-t border-border-subtle pt-6">
          <h2 className={cx(EYEBROW, "mb-3")}>Explicação</h2>
          {questao.fundamento_legal && (
            <p className="mb-2 text-sm font-medium leading-relaxed text-brass">
              {questao.fundamento_legal}
            </p>
          )}
          {questao.explicacao && (
            <p className="text-sm leading-relaxed text-text-primary">
              {questao.explicacao}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
function Notice({ children }) {
  return (
    <p className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm leading-relaxed text-text-secondary">
      {children}
    </p>
  );
}
function EmptyReadingPanel() {
  return (
    <div className="max-w-md py-10 lg:py-14">
      <h2 className="font-serif text-2xl leading-tight text-text-primary">
        Selecione um registro para revisar
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">
        Escolha uma pergunta do Caderno para visualizar seu conteúdo e suas
        anotações.
      </p>
    </div>
  );
}
