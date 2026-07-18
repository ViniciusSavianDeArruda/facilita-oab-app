import {
  Bars3Icon,
  EllipsisHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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

const SUGGESTIONS = [
  "qual o prazo do mandado de segurança?",
  "diferença entre prescrição e decadência",
  "cai muito CPC na prova?",
  "resume os pontos-chave de ética profissional",
];

export default function Chat({
  materia,
  initialMessage,
  initialTitle,
  onInitialConsumed,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [conversas, setConversas] = useState(listarConversas());
  const [conversaAtivaId, setConversaAtivaId] = useState(null);
  const [mostrarDrawer, setMostrarDrawer] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const enviouInicialRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeConversas(() => setConversas(listarConversas()));
    hydrateConversas();
    return unsub;
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

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

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

  async function send(text, tituloConversa) {
    const content = text.trim();
    if (!content || isStreaming) return;

    setError(null);
    setInput("");

    const newMessages = [...messages, { role: "user", content }];
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

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 w-full flex flex-col md:flex-row md:pl-5 md:pr-8">
        {/* Sidebar interna — desktop: coluna fixa à esquerda */}
        <aside className="hidden md:flex md:w-[280px] md:flex-col md:border-r md:border-ink-700 shrink-0 overflow-y-auto">
          <div className="px-4 pt-8 pb-4 border-b border-ink-800">
            <button
              onClick={iniciarNovaConversa}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-800 hover:border-brass-dim text-sm text-cream-50 transition-colors"
            >
              <PlusIcon className="w-4 h-4 text-brass-dim" />
              Nova conversa
            </button>
          </div>
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            {conversas.length === 0 ? (
              <p className="text-[11px] text-cream-600 px-3 py-2 leading-relaxed">
                Suas conversas aparecem aqui.
              </p>
            ) : (
              <div className="space-y-1">
                {conversas.map((c) => (
                  <ItemConversa
                    key={c.id}
                    conversa={c}
                    ativa={c.id === conversaAtivaId}
                    onClick={() => selecionarConversa(c.id)}
                    onRenomear={(titulo) => renomearConversaItem(c.id, titulo)}
                    onDeletar={() => deletarConversaItem(c.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Mobile: botão discreto que abre a lista de conversas em drawer */}
        <div className="md:hidden flex items-center px-6 py-3 border-b border-ink-800">
          <button
            onClick={() => setMostrarDrawer(true)}
            className="flex items-center gap-2 text-sm text-cream-400 hover:text-cream-50 transition-colors"
          >
            <Bars3Icon className="w-4 h-4" />
            Conversas
          </button>
        </div>

        {/* Drawer mobile — lista completa de conversas em overlay */}
        {mostrarDrawer && (
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
                  className="text-cream-400 hover:text-cream-50 transition-colors p-1"
                  aria-label="Fechar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <button
                  onClick={iniciarNovaConversa}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-ink-800 hover:border-brass-dim text-sm text-cream-50 transition-colors mb-3"
                >
                  <PlusIcon className="w-4 h-4 text-brass-dim" />
                  Nova conversa
                </button>
                {conversas.length === 0 ? (
                  <p className="text-[11px] text-cream-600 px-3 py-2 leading-relaxed">
                    Suas conversas aparecem aqui.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {conversas.map((c) => (
                      <ItemConversa
                        key={c.id}
                        conversa={c}
                        ativa={c.id === conversaAtivaId}
                        maxChars={40}
                        onClick={() => selecionarConversa(c.id)}
                        onRenomear={(titulo) =>
                          renomearConversaItem(c.id, titulo)
                        }
                        onDeletar={() => deletarConversaItem(c.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Área principal: mensagens + input — largura própria contida
            (max-w-[680px]) mesmo com a coluna ocupando o resto da tela,
            senão bubbles ficam esticadas demais em telas largas. */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 md:px-8 py-8"
          >
            <div className="max-w-[680px] mx-auto">
              {isEmpty ? (
                <EmptyState onPick={send} />
              ) : (
                <div className="space-y-6">
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
                    <div className="text-sm text-alert border border-alert/30 bg-alert/5 rounded-lg px-4 py-3">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-ink-800 bg-ink-950/80 backdrop-blur px-6 md:px-8 py-4">
            <div className="max-w-[680px] mx-auto">
              <div className="flex items-end gap-3 bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3 focus-within:border-brass-dim transition-colors">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    materia
                      ? `Pergunte sobre ${materia}...`
                      : "Sua dúvida jurídica..."
                  }
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none placeholder:text-cream-600 text-cream-50 leading-relaxed py-1"
                  disabled={isStreaming}
                />
                {isStreaming ? (
                  <button
                    onClick={cancel}
                    className="shrink-0 h-9 w-9 rounded-full bg-ink-800 hover:bg-ink-700 text-cream-400 flex items-center justify-center transition-colors"
                    aria-label="Parar"
                    title="Parar"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    className="shrink-0 h-9 w-9 rounded-full bg-brass hover:bg-brass-hover disabled:bg-ink-800 disabled:text-cream-600 text-ink-950 flex items-center justify-center transition-colors"
                    aria-label="Enviar"
                    title="Enviar (Enter)"
                  >
                    <ArrowIcon />
                  </button>
                )}
              </div>
              <p className="text-xs text-cream-600 mt-2 px-1">
                Enter envia · Shift+Enter quebra linha · o mentor pode errar em
                jurisprudência específica, sempre confira números de súmula.
              </p>
            </div>
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
          className="w-full bg-ink-900 border border-brass-dim rounded-lg px-2 py-1.5 text-sm text-cream-50 outline-none"
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
      className={`group relative w-full rounded-lg border transition-colors ${
        ativa
          ? "bg-brass/10 border-brass"
          : "border-transparent hover:bg-ink-900"
      }`}
    >
      <button onClick={onClick} className="w-full text-left px-3 py-2.5 pr-9">
        <div className="text-sm text-cream-50 truncate">{titulo}</div>
        <div className="text-[11px] text-cream-600 mt-0.5">
          {formatarDataRelativa(conversa.atualizadaEm)}
        </div>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuAberto((v) => !v);
        }}
        className={`absolute right-1.5 top-1.5 p-1 rounded-md text-cream-600 hover:text-cream-50 hover:bg-ink-800 transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
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
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-cream-50 hover:bg-ink-900 transition-colors"
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
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-alert hover:bg-alert/10 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

function Message({ role, content, streaming, pergunta, materia }) {
  const [saved, setSaved] = useState(false);

  if (role === "user") {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[85%] bg-brass text-ink-950 px-4 py-3 rounded-2xl rounded-br-md">
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    );
  }

  function salvar() {
    if (!pergunta || !content) return;
    salvarDoChat({ pergunta, resposta: content, materia });
    setSaved(true);
  }

  return (
    <div className="flex fade-in">
      <div className="max-w-[92%] pl-4 border-l-2 border-brass-dim">
        <div className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-2 font-sans">
          Mentor
        </div>
        <div
          className={`markdown text-cream-50 ${streaming ? "typing-cursor" : ""}`}
        >
          {content ? <ReactMarkdown>{content}</ReactMarkdown> : null}
        </div>
        {!streaming && content && pergunta && (
          <div className="mt-3">
            {saved ? (
              <span className="text-[11px] text-brass tracking-wide">
                salvo no caderno ✓
              </span>
            ) : (
              <button
                onClick={salvar}
                className="text-[11px] text-cream-400 hover:text-brass tracking-wide transition-colors"
              >
                salvar no caderno
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick }) {
  return (
    <div className="pt-16 pb-8">
      <p
        className="font-serif text-3xl md:text-4xl text-cream-50 leading-tight tracking-tight"
        style={{ fontVariationSettings: '"opsz" 96' }}
      >
        Bom estudo hoje.
      </p>
      <p className="text-cream-400 mt-3 leading-relaxed max-w-md">
        Pergunte qualquer coisa sobre a 1ª fase. O mentor cita artigo, resume o
        essencial e alerta sobre o que a FGV cobra.
      </p>
      <div className="mt-10">
        <p className="text-[11px] tracking-widest uppercase text-brass-dim font-medium mb-3">
          Sugestões
        </p>
        <div className="flex flex-col gap-2">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => onPick(s)}
              className="text-left px-4 py-3 rounded-xl bg-ink-900 border border-ink-800 hover:border-brass-dim hover:bg-ink-800/60 transition-colors text-cream-50 text-sm leading-snug"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2L8 14M8 2L3 7M8 2L13 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="2" width="8" height="8" rx="1.5" />
    </svg>
  );
}
