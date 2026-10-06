import {
  AcademicCapIcon,
  ArrowRightIcon,
  Bars3Icon,
  BookmarkIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClipboardDocumentCheckIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamChat } from "../lib/api";
import { salvarDoChat } from "../lib/caderno";
import {
  carregarConversa,
  deletarConversa,
  formatarDataRelativa,
  hydrateConversas,
  lerConversaAtivaStorage,
  listarConversas,
  renomearConversa,
  salvarConversaAtivaStorage,
  subscribeConversas,
} from "../lib/conversas";
import { mensagemErroAmigavel } from "../lib/erros";
import { saveLastChat } from "../lib/lastActivity";
import { parseRevisaoQuestao } from "../lib/revisaoQuestao";
import { diasAteProva, loadSettings, subscribeSettings } from "../lib/settings";
import ChatComposer from "./ChatComposer";

const MARKDOWN_COMPONENTS = {
  table({ node: _node, ...props }) {
    return (
      <div className="markdown-table-scroll">
        <table {...props} />
      </div>
    );
  },
};

// Agrupa por período — mesmos limites de diffDias que formatarDataRelativa
// (0 = hoje, 1 = ontem, 2-6 = esta semana, 7+ = anteriores).
function agruparPorPeriodo(conversas) {
  const grupos = [
    { label: "Hoje", itens: [] },
    { label: "Ontem", itens: [] },
    { label: "Esta semana", itens: [] },
    { label: "Anteriores", itens: [] },
  ];

  const hoje = new Date();
  const hojeZero = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  ).getTime();

  for (const c of conversas) {
    const d = new Date(c.atualizadaEm);
    const dZero = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    ).getTime();
    const diffDias = Math.round((hojeZero - dZero) / 86400000);

    if (diffDias === 0) grupos[0].itens.push(c);
    else if (diffDias === 1) grupos[1].itens.push(c);
    else if (diffDias > 1 && diffDias < 7) grupos[2].itens.push(c);
    else grupos[3].itens.push(c);
  }

  return grupos.filter((g) => g.itens.length > 0);
}

function ListaConversas({
  conversas,
  conversaAtivaId,
  maxChars,
  onSelecionar,
  onRenomear,
  onDeletar,
}) {
  if (conversas.length === 0) {
    return (
      <p className="text-[11px] text-cream-600 px-3 py-2 leading-relaxed">
        Suas conversas aparecem aqui.
      </p>
    );
  }

  const grupos = agruparPorPeriodo(conversas);

  return (
    <div className="space-y-5">
      {grupos.map((grupo) => (
        <div key={grupo.label}>
          <p className="text-[10px] tracking-[0.16em] uppercase text-cream-400 font-semibold px-2 mb-2">
            {grupo.label}
          </p>
          <div className="space-y-0.5">
            {grupo.itens.map((c) => (
              <ItemConversa
                key={c.id}
                conversa={c}
                ativa={c.id === conversaAtivaId}
                maxChars={maxChars}
                onClick={() => onSelecionar(c.id)}
                onRenomear={(titulo) => onRenomear(c.id, titulo)}
                onDeletar={() => onDeletar(c.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Chat({
  materia,
  initialMessage,
  initialTitle,
  onInitialConsumed,
}) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [conversas, setConversas] = useState(listarConversas());
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [mostrarDrawer, setMostrarDrawer] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [settings, setSettings] = useState(loadSettings());
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const enviouInicialRef = useRef(false);
  const composerRef = useRef(null);
  const ultimoEnvioRef = useRef(null);

  const dias = diasAteProva(settings.dataProva);

  useEffect(() => {
    const unsub = subscribeConversas(() => setConversas(listarConversas()));
    let ativo = true;
    hydrateConversas().then(() => {
      if (ativo) setHistoricoCarregado(true);
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    return subscribeSettings(() => setSettings(loadSettings()));
  }, []);

  // Restaura a conversa ativa salva, a menos que tenha vindo via deep-link.
  useEffect(() => {
    if (initialMessage) return;
    const idSalvo = lerConversaAtivaStorage();
    if (idSalvo === null) return;

    carregarConversa(idSalvo)
      .then((detalhe) => {
        setConversaAtivaId(detalhe.id);
        setMessages(
          detalhe.mensagens.map((m) => ({
            role: m.papel,
            content: m.conteudo,
          })),
        );
      })
      .catch(() => {
        // Conversa não existe mais (ex.: deletada em outra sessão).
        salvarConversaAtivaStorage(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Deep-link: quando a tela de resultado passa uma mensagem inicial,
  // envia automaticamente ao entrar no chat.
  useEffect(() => {
    if (
      initialMessage &&
      messages.length === 0 &&
      !isStreaming &&
      !enviouInicialRef.current
    ) {
      enviouInicialRef.current = true;
      send(initialMessage, initialTitle);
      onInitialConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  function iniciarNovaConversa() {
    if (isStreaming) return;
    setConversaAtivaId(null);
    salvarConversaAtivaStorage(null);
    setMessages([]);
    setError(null);
    setMostrarDrawer(false);
  }

  async function selecionarConversa(id) {
    if (id === conversaAtivaId || isStreaming) {
      setMostrarDrawer(false);
      return;
    }
    setError(null);
    try {
      const detalhe = await carregarConversa(id);
      setConversaAtivaId(detalhe.id);
      salvarConversaAtivaStorage(detalhe.id);
      setMessages(
        detalhe.mensagens.map((m) => ({ role: m.papel, content: m.conteudo })),
      );
    } catch (e) {
      setError(e.message || "Não foi possível abrir essa conversa.");
    } finally {
      setMostrarDrawer(false);
    }
  }

  async function renomearConversaItem(id, titulo) {
    try {
      await renomearConversa(id, titulo);
      hydrateConversas();
    } catch (e) {
      setError(e.message || "Não foi possível renomear a conversa.");
    }
  }

  async function deletarConversaItem(id) {
    if (!confirm("Excluir esta conversa? Essa ação não pode ser desfeita.")) {
      return;
    }
    try {
      await deletarConversa(id);
      if (id === conversaAtivaId) {
        iniciarNovaConversa();
      }
      hydrateConversas();
    } catch (e) {
      setError(e.message || "Não foi possível excluir a conversa.");
    }
  }

  async function send(text, tituloConversa, baseMessages = messages) {
    const content = text.trim();
    if (!content || isStreaming) return;

    ultimoEnvioRef.current = { text: content, tituloConversa };
    setError(null);

    const newMessages = [...baseMessages, { role: "user", content }];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let accumulated = "";

      for await (const evento of streamChat({
        messages: newMessages,
        materia,
        conversaId: conversaAtivaId,
        tituloConversa,
        signal: controller.signal,
      })) {
        if (evento.type === "conversaId") {
          if (conversaAtivaId === null) {
            setConversaAtivaId(evento.conversaId);
            salvarConversaAtivaStorage(evento.conversaId);
          }
          continue;
        }
        accumulated += evento.text;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: accumulated };
          return copy;
        });
      }

      if (accumulated) {
        // Salvar como "última conversa" pra aparecer no Início.
        saveLastChat({ pergunta: content, resposta: accumulated, materia });
        // Atualiza a lista da sidebar (título de conversa nova, ordenação).
        hydrateConversas();
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(mensagemErroAmigavel(e));
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function retry() {
    const ultimo = ultimoEnvioRef.current;
    if (!ultimo || isStreaming) return;
    // A mensagem do usuário que falhou já ficou em `messages` (só o
    // placeholder vazio do assistant foi removido no catch) — passa a
    // lista sem ela como base, já que send() vai reempilhar o mesmo texto.
    // (Não dá pra confiar num setMessages antes: send() leria o `messages`
    // desta mesma render, ainda com o item velho, e duplicaria a bolha.)
    send(ultimo.text, ultimo.tituloConversa, messages.slice(0, -1));
  }

  const isEmpty = messages.length === 0;
  const semHistorico = historicoCarregado && conversas.length === 0;
  const primeiroUso = semHistorico && conversaAtivaId === null && isEmpty;

  const composer = (
    <ChatComposer
      ref={composerRef}
      onSend={send}
      onCancel={cancel}
      disabled={isStreaming}
      streaming={isStreaming}
      placeholder={
        materia ? `Pergunte sobre ${materia}...` : "Sua dúvida jurídica..."
      }
    />
  );

  useEffect(() => {
    if (semHistorico) setMostrarDrawer(false);
  }, [semHistorico]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-sand-50">
      {/* Histórico — coluna própria com altura total, à esquerda da área
          principal; recolhível no desktop via historyOpen. */}
      {!semHistorico && (
        <aside
          className={`hidden md:flex md:flex-col shrink-0 bg-ink-900 conversas-scrollbar transition-[width] duration-200 ${
            historyOpen
              ? "md:w-[270px] md:border-r md:border-ink-800 overflow-y-auto"
              : "md:w-0 md:border-r-0 overflow-hidden"
          }`}
        >
          <div className="px-3 py-4">
            <button
              onClick={iniciarNovaConversa}
              className="w-full min-h-10 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-ink-950 border border-surface-border-button text-sm font-medium text-cream-200 hover:bg-surface-button-hover hover:border-surface-border-button-hover hover:text-brass transition-colors duration-200 ease-in-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
            >
              <PlusIcon className="w-4 h-4" />
              Nova conversa
            </button>
          </div>
          <div className="flex-1 px-3 pb-4 overflow-y-auto conversas-scrollbar">
            <ListaConversas
              conversas={conversas}
              conversaAtivaId={conversaAtivaId}
              onSelecionar={selecionarConversa}
              onRenomear={renomearConversaItem}
              onDeletar={deletarConversaItem}
            />
          </div>
        </aside>
      )}

      <div className="flex-1 min-h-0 min-w-0 w-full flex flex-col">
        {/* Drawer mobile — lista completa de conversas em overlay */}
        {mostrarDrawer && !semHistorico && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMostrarDrawer(false)}
            />
            <div className="relative bg-ink-950 border-t border-ink-800 rounded-t-2xl h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-ink-800 shrink-0">
                <span
                  className="font-serif text-lg text-cream-50"
                  style={{ fontVariationSettings: '"opsz" 60' }}
                >
                  Conversas
                </span>
                <button
                  onClick={() => setMostrarDrawer(false)}
                  className="min-h-10 min-w-10 text-cream-400 hover:text-cream-50 transition-colors flex items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 conversas-scrollbar">
                <button
                  onClick={iniciarNovaConversa}
                  className="w-full min-h-10 flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg border border-surface-border-button bg-ink-950 text-sm text-cream-50 hover:bg-surface-button-hover hover:border-surface-border-button-hover hover:text-brass transition-[background-color,border-color,color] duration-150 ease-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
                >
                  <PlusIcon className="w-4 h-4" />
                  Nova conversa
                </button>
                <ListaConversas
                  conversas={conversas}
                  conversaAtivaId={conversaAtivaId}
                  maxChars={40}
                  onSelecionar={selecionarConversa}
                  onRenomear={renomearConversaItem}
                  onDeletar={deletarConversaItem}
                />
              </div>
            </div>
          </div>
        )}

        {/* Área principal: header + conversa + composer. A
            conversa usa largura própria contida (max-w-[860px]) mesmo com a
            coluna ocupando o resto da tela, senão bubbles ficam esticadas. */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-ink-950">
          {/* Header do mentor — título+subtítulo (ou matéria da sessão atual)
              + contagem regressiva pra prova, mesmo dado usado no Início
              (settings.dataProva via diasAteProva). */}
          <div className="flex items-center justify-between gap-3 px-6 md:px-8 py-3 border-b border-ink-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {!semHistorico && (
                <button
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="hidden md:flex min-h-10 min-w-10 text-cream-400 hover:text-cream-50 transition-colors items-center justify-center rounded-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                  aria-label={
                    historyOpen ? "Recolher histórico" : "Expandir histórico"
                  }
                  title={
                    historyOpen ? "Recolher histórico" : "Expandir histórico"
                  }
                >
                  <Bars3Icon className="w-4 h-4" />
                </button>
              )}
              <div className="min-w-0">
                {materia ? (
                  <span className="font-serif text-xl text-cream-50 truncate">
                    {materia}
                  </span>
                ) : (
                  <>
                    <h1
                      className="font-serif text-xl text-cream-50 leading-tight tracking-tight truncate"
                      style={{ fontVariationSettings: '"opsz" 60' }}
                    >
                      Mentor Jurídico Inteligente
                    </h1>
                    <p className="text-xs text-cream-400 mt-1 truncate">
                      Tire dúvidas, aprofunde temas e revise conteúdos para a 1ª
                      fase da OAB.
                    </p>
                  </>
                )}
              </div>
            </div>
            {dias !== null && dias >= 0 && (
              <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-brass/25 bg-brass-soft px-3 py-1.5">
                <span className="font-serif text-brass text-sm leading-none tabular-nums">
                  {dias}
                </span>
                <span className="text-[11px] text-brass leading-none">
                  dias até a 1ª fase OAB
                </span>
              </div>
            )}
          </div>

          {/* Mobile: acesso ao histórico em drawer (a coluna fica oculta) */}
          {!semHistorico && (
            <div className="md:hidden flex items-center px-6 py-3 border-b border-ink-800 shrink-0">
              <button
                onClick={() => setMostrarDrawer(true)}
                className="min-h-10 flex items-center gap-2 text-sm text-cream-400 hover:text-cream-50 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                <Bars3Icon className="w-4 h-4" />
                Conversas
              </button>
            </div>
          )}

          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto px-6 md:px-8 chat-scrollbar ${isEmpty ? "py-4" : "py-6"}`}
          >
            {primeiroUso ? (
              <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col">
                <div className="flex-[4_1_0%]" aria-hidden="true" />
                <div className="w-full">
                  <EmptyState
                    onPick={(t) => composerRef.current?.fillInput(t)}
                    primeiroUso
                  />
                  <div className="mx-auto mt-1 w-full max-w-[760px]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cream-600">
                      Exemplos para começar
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 lg:grid-cols-3">
                      {EXEMPLOS_INICIAIS.map((exemplo) => (
                        <button
                          key={exemplo}
                          type="button"
                          onClick={() =>
                            composerRef.current?.fillInput(exemplo)
                          }
                          className="group/exemplo flex min-h-10 min-w-0 items-start gap-2 rounded-lg py-2 text-left text-[13px] leading-snug text-cream-400 transition-colors duration-150 hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 motion-reduce:transition-none"
                        >
                          <ArrowRightIcon
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass transition-transform duration-150 group-hover/exemplo:translate-x-[3px] motion-reduce:transform-none motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">{exemplo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-[5_1_0%]" aria-hidden="true" />
              </div>
            ) : (
              <div
                className={`max-w-[860px] mx-auto ${
                  isEmpty ? "flex min-h-full flex-col justify-end" : ""
                }`}
              >
                {isEmpty ? (
                  <EmptyState
                    onPick={(t) => composerRef.current?.fillInput(t)}
                  />
                ) : (
                  <div className="space-y-5">
                    {messages.map((msg, i) => (
                      <Message
                        key={i}
                        role={msg.role}
                        content={msg.content}
                        streaming={
                          isStreaming &&
                          i === messages.length - 1 &&
                          msg.role === "assistant"
                        }
                        pergunta={
                          msg.role === "assistant"
                            ? messages[i - 1]?.content
                            : null
                        }
                        materia={materia}
                      />
                    ))}
                    {error && (
                      <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl px-4 py-3.5 bg-[#FDF1ED] border border-[#E3D8D4]"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4 text-alert shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-cream-50">{error}</p>
                          <button
                            onClick={retry}
                            className="min-h-10 px-1 text-xs text-brass hover:text-brass-hover font-medium mt-1.5 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                          >
                            Tentar novamente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={
              primeiroUso
                ? "mx-auto mt-auto w-full max-w-[924px] pb-3 lg:pb-12"
                : isEmpty
                  ? "mx-auto w-full max-w-[808px] md:max-w-[824px] xl:pb-6"
                  : "contents"
            }
          >
            {composer}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemConversa({
  conversa,
  ativa,
  onClick,
  onRenomear,
  onDeletar,
  maxChars = 40,
}) {
  const [editando, setEditando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [rascunho, setRascunho] = useState(conversa.titulo);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (editando) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editando]);

  useEffect(() => {
    if (!menuAberto) return;
    function handleClickFora(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [menuAberto]);

  function confirmarRenomear() {
    const tituloLimpo = rascunho.trim();
    setEditando(false);
    if (tituloLimpo && tituloLimpo !== conversa.titulo) {
      onRenomear(tituloLimpo);
    } else {
      setRascunho(conversa.titulo);
    }
  }

  function handleKeyDownInput(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmarRenomear();
    } else if (e.key === "Escape") {
      setRascunho(conversa.titulo);
      setEditando(false);
    }
  }

  if (editando) {
    return (
      <div className="px-3 py-1.5">
        <input
          ref={inputRef}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={handleKeyDownInput}
          onBlur={confirmarRenomear}
          className="w-full bg-ink-900 border border-brass-dim rounded-lg px-2 py-1.5 text-sm text-cream-50 outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
        />
      </div>
    );
  }

  const titulo =
    conversa.titulo.length > maxChars
      ? conversa.titulo.slice(0, maxChars) + "…"
      : conversa.titulo;

  return (
    <div
      className={`group relative w-full rounded-lg border transition-colors duration-200 ease-in-out ${
        ativa
          ? "bg-brass-soft border-brass/25"
          : "border-transparent hover:bg-surface-nav-hover"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full min-h-11 text-left px-2.5 py-2 pr-9 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:ring-inset"
      >
        <div
          className={`text-[13px] truncate ${
            ativa ? "text-brass font-medium" : "text-cream-50"
          }`}
        >
          {titulo}
        </div>
        <div className="text-[10px] text-cream-600 mt-1">
          {formatarDataRelativa(conversa.atualizadaEm)}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuAberto((v) => !v);
        }}
        className={`absolute right-1.5 top-1.5 min-h-9 min-w-9 p-1 rounded-md text-cream-600 hover:text-cream-50 hover:bg-ink-800 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-inset ${
          menuAberto ? "md:opacity-100" : ""
        }`}
        aria-label="Mais opções"
      >
        <EllipsisHorizontalIcon className="w-4 h-4" />
      </button>

      {menuAberto && (
        <div
          ref={menuRef}
          className="absolute right-1.5 top-8 z-10 w-36 bg-ink-950 border border-ink-800 rounded-lg shadow-lg overflow-hidden"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuAberto(false);
              setRascunho(conversa.titulo);
              setEditando(true);
            }}
            className="w-full min-h-10 flex items-center gap-2 px-3 py-2 text-sm text-cream-50 hover:bg-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-inset"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            Renomear
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuAberto(false);
              onDeletar();
            }}
            className="w-full min-h-10 flex items-center gap-2 px-3 py-2 text-sm text-alert hover:bg-alert/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert focus-visible:ring-inset"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

// Bloco editorial da questão enviada para revisão. Só apresentação: o texto
// que vai para a IA continua sendo a string original da mensagem.
function QuestaoRevisao({ dados }) {
  return (
    <div className="fade-in ml-auto w-full max-w-[94%]">
      <div className="rounded-2xl border border-ink-800 border-l-[3px] border-l-brass bg-ink-950 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border-subtle">
          <AcademicCapIcon
            className="h-4 w-4 shrink-0 text-brass"
            aria-hidden="true"
          />
          <span className="font-sans text-[11px] tracking-[0.16em] uppercase font-semibold text-brass">
            Questão para revisão
          </span>
        </div>

        <Campo rotulo="Enunciado">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-cream-50">
            {dados.enunciado}
          </p>
        </Campo>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Sua resposta">
            <CardAlternativa
              status="Incorreta"
              Icone={XCircleIcon}
              cor="text-alert"
              acento="border-l-alert"
              letra={dados.letraDada}
              texto={dados.respostaDada}
            />
          </Campo>
          <Campo rotulo="Gabarito">
            <CardAlternativa
              status="Correta"
              Icone={CheckCircleIcon}
              cor="text-[#059669]"
              acento="border-l-[#059669]"
              letra={dados.letraCorreta}
              texto={dados.respostaCorreta}
            />
          </Campo>
        </div>

        {dados.anotacao && (
          <div className="mt-4">
            <Campo rotulo="Sua anotação">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-cream-400">
                {dados.anotacao}
              </p>
            </Campo>
          </div>
        )}

        {dados.pedido && (
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <p className="text-sm font-medium leading-relaxed text-cream-50">
              {dados.pedido}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Campo({ rotulo, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] tracking-[0.14em] uppercase font-semibold text-brass">
        {rotulo}
      </p>
      {children}
    </div>
  );
}

// Dois cards irmãos de mesma base neutra: o status aparece só no badge, no
// ícone e num acento de 2px na lateral — nunca preenchendo o card inteiro.
function CardAlternativa({ status, Icone, cor, acento, letra, texto }) {
  return (
    <div
      className={`rounded-lg border border-ink-800 border-l-2 ${acento} bg-ink-900 px-3 py-2.5`}
    >
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${cor}`}
      >
        <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {status}
      </span>
      <p className="mt-1.5 text-sm leading-relaxed text-cream-50">
        <span className="font-semibold">{letra}</span>
        <span className="text-cream-600"> — </span>
        {texto}
      </p>
    </div>
  );
}

function Message({ role, content, streaming, pergunta, materia }) {
  const [saveStatus, setSaveStatus] = useState("idle");
  const savingRef = useRef(false);

  if (role === "user") {
    // Questão vinda do caderno/simulado: vira bloco editorial de contexto.
    // Se o reconhecimento falhar, cai no bubble normal.
    const revisao = parseRevisaoQuestao(content);
    if (revisao) return <QuestaoRevisao dados={revisao} />;

    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[68%] bg-brass text-ink-950 px-3.5 py-2.5 rounded-2xl rounded-br-md">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    );
  }

  async function salvar() {
    if (!pergunta || !content || savingRef.current) return;

    savingRef.current = true;
    setSaveStatus("saving");

    try {
      const saved = await salvarDoChat({
        pergunta,
        resposta: content,
        materia,
      });
      setSaveStatus(saved ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <div className="fade-in">
      <div className="min-w-0 rounded-2xl border border-ink-800 bg-ink-950 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-border-subtle">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brass-soft">
            <SparklesIcon className="h-4 w-4 text-brass" aria-hidden="true" />
          </span>
          <span className="font-sans text-[11px] tracking-[0.16em] uppercase font-semibold text-brass">
            Mentor Jurídico
          </span>
          <span
            className="text-brass/[0.35] text-xs select-none"
            aria-hidden="true"
          >
            •
          </span>
          <span className="font-sans text-[11px] tracking-[0.16em] uppercase text-cream-450">
            IA especializada
          </span>
        </div>
        <div
          className={`markdown text-cream-50 ${streaming ? "typing-cursor" : ""}`}
        >
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={MARKDOWN_COMPONENTS}
            >
              {content}
            </ReactMarkdown>
          ) : null}
        </div>
        {!streaming && content && pergunta && (
          <div
            className="mt-5 pt-4 border-t border-border-subtle"
            aria-live="polite"
          >
            {saveStatus === "saved" ? (
              <span
                role="status"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-brass/25 bg-brass-soft px-3 py-1.5 text-xs font-medium text-brass"
              >
                <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Salvo no caderno
              </span>
            ) : saveStatus === "saving" ? (
              <button
                disabled
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3 py-1.5 text-xs font-medium text-cream-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BookmarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Salvando…
              </button>
            ) : saveStatus === "error" ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span role="alert" className="text-xs text-alert">
                  Não foi possível salvar no caderno.
                </span>
                <button
                  onClick={salvar}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3 py-1.5 text-xs font-medium text-brass hover:bg-surface-button-hover hover:border-surface-border-button-hover transition-colors duration-200 ease-in-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass"
                  aria-label="Tentar salvar resposta no caderno"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <button
                onClick={salvar}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-surface-border-button bg-ink-950 px-3 py-1.5 text-xs font-medium text-brass hover:bg-surface-button-hover hover:border-surface-border-button-hover transition-colors duration-200 ease-in-out focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saveStatus === "saving"}
                aria-label="Salvar resposta no caderno"
              >
                <BookmarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Salvar no caderno
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Atalhos do estado vazio: só preenchem o composer com um prompt inicial
// aberto, para a pessoa completar. Não criam ação nem endpoint novo.
const ACOES_RAPIDAS = [
  {
    label: "Revisar um tema",
    Icone: BookOpenIcon,
    descricao: "Peça uma explicação objetiva de qualquer matéria.",
    prompt: "Quero revisar um tema da OAB: ",
  },
  {
    label: "Entender uma questão",
    Icone: ClipboardDocumentCheckIcon,
    descricao: "Analise alternativas, erros e pegadinhas da banca.",
    prompt: "Quero entender melhor esta questão: ",
  },
  {
    label: "Tirar uma dúvida",
    Icone: ChatBubbleLeftRightIcon,
    descricao: "Pergunte livremente ao Mentor Jurídico.",
    prompt: "Tenho uma dúvida sobre: ",
  },
];

const EXEMPLOS_INICIAIS = [
  "Explique controle de constitucionalidade de forma simples",
  "Qual a diferença entre prescrição e decadência?",
  "Crie 5 questões de Ética no estilo OAB",
];

function EmptyState({ onPick, primeiroUso = false }) {
  return (
    <div className="mx-auto w-full max-w-[760px] pt-6 pb-2 md:pt-8 md:pb-3">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brass-soft border border-brass/[0.14]">
          <SparklesIcon className="h-6 w-6 text-brass" aria-hidden="true" />
        </span>
        <p className="text-[10px] tracking-[0.14em] uppercase text-brass font-semibold mt-4">
          Mentor Jurídico
        </p>
        <h2
          className="font-serif text-[32px] sm:text-[34px] text-cream-50 leading-tight tracking-tight mt-2"
          style={{ fontVariationSettings: '"opsz" 96' }}
        >
          O que vamos estudar hoje?
        </h2>
        <p className="text-[15px] text-cream-400 mt-3 leading-7 max-w-[620px]">
          Tire uma dúvida, revise um tema ou entenda onde errou em uma questão.
        </p>
      </div>

      <div
        className={`mt-7 grid w-full grid-cols-1 gap-3 ${primeiroUso ? "lg:grid-cols-3" : "xl:grid-cols-3"}`}
      >
        {ACOES_RAPIDAS.map(({ label, descricao, prompt, Icone }) => (
          <button
            key={label}
            onClick={() => onPick(prompt)}
            className="group/acao xl:min-h-[104px] rounded-xl border border-surface-border-subtle bg-ink-900 px-4 py-3 xl:py-4 text-left transition-[background-color,border-color,box-shadow] duration-200 ease-editorial hover:bg-surface-subcard-hover hover:border-surface-border-hover hover:shadow-subcard-hover focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/20 focus-visible:border-brass motion-reduce:transition-none"
          >
            <span className="flex items-center gap-2">
              <Icone
                className="h-4 w-4 shrink-0 text-brass"
                aria-hidden="true"
              />
              <span className="min-w-0 text-[13px] font-medium text-cream-50">
                {label}
              </span>
              <ArrowRightIcon
                className="ml-auto h-3.5 w-3.5 shrink-0 text-brass transition-transform duration-150 group-hover/acao:translate-x-[3px] motion-reduce:transform-none motion-reduce:transition-none"
                aria-hidden="true"
              />
            </span>
            <span className="mt-2 block text-xs leading-relaxed text-cream-400">
              {descricao}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
