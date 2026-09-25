import { ArrowLeftIcon, CheckCircleIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { atualizarAnotacao, atualizarStatus, listar, remover, subscribe } from "../lib/caderno";
import QuestionCard from "./QuestionCard";

const STATUS_LABELS = { aberto: "Aberto", revisando: "Revisando", dominado: "Dominado" };
const STATUS_ORDER = ["aberto", "revisando", "dominado"];
const MARKDOWN_COMPONENTS = {
  table({ node: _node, ...props }) {
    return <div className="markdown-table-scroll"><table {...props} /></div>;
  },
};
function cx(...classes) { return classes.filter(Boolean).join(" "); }

export default function Caderno({ onDiscussWithMentor }) {
  const [items, setItems] = useState(() => listar());
  const [filtroMateria, setFiltroMateria] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selectedId, setSelectedId] = useState(null);
  const [mobileReading, setMobileReading] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const listScrollTopRef = useRef(0);
  const restoreListScrollRef = useRef(false);
  const listButtonRefs = useRef(new Map());

  useEffect(() => subscribe(() => {
    const nextItems = listar();
    setItems(nextItems);
    setSelectedId((currentId) => currentId && nextItems.some((item) => item.id === currentId) ? currentId : null);
  }), []);

  const materias = useMemo(() => Array.from(new Set(items.map((item) => item.materia))).sort(), [items]);
  const filtered = items.filter((item) => {
    if (filtroMateria !== "todas" && item.materia !== filtroMateria) return false;
    if (filtroStatus === "com_anotacao") return Boolean(item.anotacao?.trim());
    return filtroStatus === "todos" || item.status === filtroStatus;
  });
  const selected = selectedId ? filtered.find((item) => item.id === selectedId) || null : null;
  const contagens = {
    aberto: items.filter((item) => item.status === "aberto").length,
    revisando: items.filter((item) => item.status === "revisando").length,
    dominado: items.filter((item) => item.status === "dominado").length,
    anotacoes: items.filter((item) => item.anotacao?.trim()).length,
  };

  useEffect(() => {
    if (selectedId && !filtered.some((item) => item.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);
  useEffect(() => { panelRef.current?.scrollTo({ top: 0 }); }, [selected?.id]);
  useEffect(() => {
    if (mobileReading && selected) rootRef.current?.scrollTo({ top: 0 });
  }, [mobileReading, selected?.id]);
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
    if (closingId) requestAnimationFrame(() => listButtonRefs.current.get(closingId)?.focus({ preventScroll: true }));
  }
  useEffect(() => {
    if (!selectedId) return undefined;
    const handleKeyDown = (event) => { if (event.key === "Escape") closeReading(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);
  function selectItem(id) {
    if (selectedId === id) return closeReading();
    listScrollTopRef.current = rootRef.current?.scrollTop || 0;
    setSelectedId(id);
    setMobileReading(true);
  }

  if (items.length === 0) {
    return <div className="h-full overflow-y-auto"><div className="mx-auto max-w-xl px-5 pb-10 pt-20 text-center sm:px-6 sm:pt-24">
      <p className="mb-3 font-serif text-3xl leading-tight tracking-tight text-text-primary" style={{ fontVariationSettings: '"opsz" 96' }}>Seu caderno está vazio.</p>
      <p className="leading-relaxed text-text-secondary">Toda vez que você errar uma questão num simulado, ela vem parar aqui automaticamente. No chat, use o botão "salvar no caderno" nas respostas que você quer guardar.</p>
    </div></div>;
  }

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col overflow-y-auto bg-surface-page lg:overflow-hidden">
      <header className="shrink-0 border-b border-border-subtle bg-surface-page px-4 py-4 sm:px-6 md:px-10">
        <div className="mx-auto max-w-[1400px]">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-widest text-brass-dim">Caderno</p>
          <div className="flex items-baseline gap-3">
            <h1 className="font-serif text-3xl leading-none tracking-tight text-text-primary sm:text-4xl" style={{ fontVariationSettings: '"opsz" 144' }}>{items.length}</h1>
            <p className="text-sm text-text-secondary">{items.length === 1 ? "item para revisar" : "itens para revisar"}</p>
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
            <Summary count={contagens.aberto} label="abertos" tone="text-brass" />
            <Summary count={contagens.revisando} label="revisando" tone="text-text-primary" />
            <Summary count={contagens.dominado} label="dominados" tone="text-text-muted" />
            <Summary count={contagens.anotacoes} label="com anotações" tone="text-brass-dim" />
          </dl>
          <div className="mt-3 flex flex-col gap-3">
            <FilterSet label="Status">
              <FilterButton selected={filtroStatus === "todos"} onClick={() => setFiltroStatus("todos")}>Todos</FilterButton>
              {STATUS_ORDER.map((status) => <FilterButton key={status} selected={filtroStatus === status} onClick={() => setFiltroStatus(status)}>{STATUS_LABELS[status]}</FilterButton>)}
              <FilterButton selected={filtroStatus === "com_anotacao"} onClick={() => setFiltroStatus("com_anotacao")}><PencilSquareIcon className="-mt-0.5 mr-1 inline h-3 w-3" />Com anotação</FilterButton>
            </FilterSet>
            {materias.length > 1 && <FilterSet label="Matéria">
              <FilterButton selected={filtroMateria === "todas"} onClick={() => setFiltroMateria("todas")}>Todas</FilterButton>
              {materias.map((materia) => <FilterButton key={materia} selected={filtroMateria === materia} onClick={() => setFiltroMateria(materia)}>{materia}</FilterButton>)}
            </FilterSet>}
          </div>
        </div>
      </header>

      <div className="shrink-0 lg:mx-auto lg:grid lg:min-h-0 lg:w-full lg:max-w-[1400px] lg:flex-1 lg:grid-cols-[minmax(16rem,0.3fr)_minmax(0,0.7fr)] lg:gap-5 lg:px-10 lg:py-4" onClick={(event) => { if (event.target === event.currentTarget) closeReading(); }}>
        <section className={cx("px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border-default lg:bg-surface-raised lg:px-0 lg:py-0", mobileReading ? "hidden lg:block" : "block")} aria-label="Lista de registros">
          <div className="space-y-2 lg:p-3">
            {filtered.length === 0 ? <p className="px-3 py-10 text-center text-sm text-text-secondary">Nenhum item nos filtros selecionados.</p> : filtered.map((item) =>
              <RecordListItem key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => selectItem(item.id)} buttonRef={(element) => element ? listButtonRefs.current.set(item.id, element) : listButtonRefs.current.delete(item.id)} />
            )}
          </div>
        </section>
        <section ref={panelRef} className={cx("bg-surface-raised px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border-default lg:px-0 lg:py-0", mobileReading ? "block" : "hidden lg:block")} aria-label="Leitura do registro selecionado">
          <div className="mx-auto max-w-3xl lg:p-6 xl:p-7">
            <button type="button" onClick={closeReading} className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:border-brass-dim hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass lg:hidden"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Voltar ao Caderno</button>
            {selected ? <ReadingPanel key={selected.id} item={selected} onClose={closeReading} onDiscussWithMentor={onDiscussWithMentor} /> : <EmptyReadingPanel />}
          </div>
        </section>
      </div>
    </div>
  );
}

function Summary({ count, label, tone }) {
  return <div className="flex items-baseline gap-1.5"><dt className="sr-only">{label}</dt><dd className={cx("font-medium tabular-nums", tone)}>{count}</dd><span>{label}</span></div>;
}
function FilterSet({ label, children }) {
  return <div className="flex flex-wrap items-center gap-2"><span className="mr-1 w-full text-[10px] font-medium uppercase tracking-widest text-brass-dim sm:w-auto">{label}</span>{children}</div>;
}
function FilterButton({ selected, onClick, children }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={cx("min-h-9 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass", selected ? "border-brass bg-brass/10 text-brass" : "border-border-default text-text-secondary hover:border-brass-dim hover:text-text-primary")}>{children}</button>;
}

function RecordListItem({ item, selected, onSelect, buttonRef }) {
  const sourceText = item.origin === "simulado" ? item.questao?.enunciado : item.pergunta;
  const preview = sourceText || "Registro sem conteúdo disponível.";
  const date = item.createdAt ? new Date(item.createdAt) : null;
  const dataStr = date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "Sem data";
  const dotClass = item.status === "revisando" ? "bg-text-primary" : "bg-brass";
  return (
    <button ref={buttonRef} type="button" onClick={onSelect} aria-pressed={selected} className={cx("w-full rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass", selected ? "border-brass bg-brass/10" : "border-transparent hover:border-border-default hover:bg-surface-subtle")}>
      <span className="flex items-start gap-2.5">
        {item.status === "dominado" ? <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass)} aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className={cx("line-clamp-2 block text-sm leading-relaxed", item.status === "dominado" ? "text-text-muted line-through" : "text-text-primary")}>{preview}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-wider text-text-secondary"><span>{item.materia || "Geral"}</span><span aria-hidden="true">·</span><span>{dataStr}</span><span className="normal-case tracking-normal">{STATUS_LABELS[item.status] || "Aberto"}</span>{selected && <span className="font-medium normal-case tracking-normal text-brass">Selecionado</span>}</span>
        </span>
      </span>
    </button>
  );
}

function ReadingPanel({ item, onClose, onDiscussWithMentor }) {
  const [anotacao, setAnotacao] = useState(item.anotacao);
  const [savedFlash, setSavedFlash] = useState(false);
  const isSimulation = item.origin === "simulado";
  const hasCompleteQuestion = Boolean(item.questao?.enunciado);
  useEffect(() => setAnotacao(item.anotacao), [item.anotacao]);
  function salvarAnotacao() {
    atualizarAnotacao(item.id, anotacao);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }
  function deletarItem() { if (confirm("Remover este item do caderno?")) remover(item.id); }
  function discutir() {
    if (isSimulation) {
      if (hasCompleteQuestion) onDiscussWithMentor(item.questao, item.respostaDada, null, { anotacao: item.anotacao });
      return;
    }
    const anotacaoTexto = item.anotacao ? "\n\nMinha anotação foi: " + item.anotacao : "";
    const prompt = "Estava revisando esta dúvida do meu caderno:\n\n**Pergunta:** " + (item.pergunta || "") + "\n\n**Você respondeu:** " + (item.resposta || "") + anotacaoTexto + "\n\nAinda tenho dúvida sobre isso — pode reforçar a explicação?";
    onDiscussWithMentor(null, null, prompt, { tituloOverride: "Revisar: " + (item.pergunta || "dúvida").slice(0, 40) });
  }
  return (
    <article className="space-y-7">
      <header className="flex items-start justify-between gap-4 border-b border-border-subtle pb-5">
        <div><p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-brass-dim">{isSimulation ? "Questão do simulado" : "Resposta do mentor"}</p><p className="text-sm text-text-secondary">{item.materia || "Geral"}</p></div>
        <button type="button" onClick={onClose} aria-label="Fechar leitura" className="hidden min-h-10 min-w-10 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass lg:inline-flex"><XMarkIcon className="h-5 w-5" aria-hidden="true" /></button>
      </header>
      {isSimulation ? (hasCompleteQuestion ? <QuestionCard questao={item.questao} mode="review" selected={item.respostaDada} /> : <Notice>Esta questão salva não possui os dados necessários para revisão.</Notice>) : (
        <div className="space-y-6"><div><h2 className="mb-2 text-[11px] font-medium uppercase tracking-widest text-brass-dim">Pergunta</h2><p className="font-serif text-xl leading-relaxed text-text-primary sm:text-2xl">{item.pergunta || "Pergunta não disponível."}</p></div>
          <div className="border-l-2 border-brass-dim pl-4"><h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-brass-dim">Resposta do mentor</h2><div className="markdown text-sm leading-relaxed text-text-primary"><ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{item.resposta || "Resposta não disponível."}</ReactMarkdown></div></div>
        </div>
      )}
      <section className="border-t border-border-subtle pt-5">
        <div className="mb-2 flex items-center justify-between gap-3"><label htmlFor={"anotacao-" + item.id} className="text-[11px] font-medium uppercase tracking-widest text-brass-dim">Minha anotação</label>{savedFlash && <span className="text-[11px] text-brass">salvo</span>}</div>
        <textarea id={"anotacao-" + item.id} value={anotacao} onChange={(event) => setAnotacao(event.target.value)} onBlur={salvarAnotacao} placeholder="Ex.: confundi com o art. 5º / lembrar que decadência não interrompe" rows={2} className="w-full resize-none rounded-xl border border-border-default bg-surface-subtle p-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" />
      </section>
      <section className="space-y-3 border-t border-border-subtle pt-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Status do registro">{STATUS_ORDER.map((status) => <button type="button" key={status} onClick={() => atualizarStatus(item.id, status)} aria-pressed={item.status === status} className={cx("min-h-10 rounded-xl border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass", item.status === status ? "border-brass bg-brass/10 text-brass" : "border-border-default text-text-secondary hover:border-brass-dim hover:text-text-primary")}>{STATUS_LABELS[status]}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={discutir} disabled={isSimulation && !hasCompleteQuestion} className="min-h-11 flex-1 rounded-xl border border-brass-dim px-4 py-2.5 text-sm text-brass transition-colors hover:bg-brass/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:cursor-not-allowed disabled:opacity-50">Conversar com o mentor →</button><button type="button" onClick={deletarItem} className="min-h-11 rounded-xl px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-alert focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">Remover</button></div>
      </section>
    </article>
  );
}
function Notice({ children }) { return <p className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm leading-relaxed text-text-secondary">{children}</p>; }
function EmptyReadingPanel() {
  return <div className="max-w-md py-10 lg:py-14"><h2 className="font-serif text-2xl leading-tight text-text-primary">Selecione um registro para revisar</h2><p className="mt-3 text-sm leading-relaxed text-text-secondary">Escolha uma pergunta do Caderno para visualizar seu conteúdo e suas anotações.</p></div>;
}
