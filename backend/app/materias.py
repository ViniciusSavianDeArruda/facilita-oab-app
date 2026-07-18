"""
Normaliza o nome de matéria que o Gemini escreve livremente por questão
em simulados sem foco definido (modo rápido). Sem isso, "Direito Civil",
"Civil" e variantes viram categorias diferentes nas estatísticas.
"""

MATERIAS_CANONICAS = frozenset({
    "Civil", "Processo Civil", "Constitucional", "Ética", "Penal",
    "Trabalho", "Administrativo", "Tributário", "Processo Penal",
    "Empresarial", "Processo do Trabalho", "Filosofia", "Direitos Humanos",
    "Internacional", "Ambiental", "Financeiro", "ECA", "Consumidor",
})

# Variações conhecidas que o Gemini já escreveu, mapeadas pro nome curto
# (mesmo mapeamento das migrações 341a06dbe2ea/23afeb965802).
_SINONIMOS = {
    "Direito Administrativo": "Administrativo",
    "Direito Ambiental": "Ambiental",
    "Direito Civil": "Civil",
    "Direito Constitucional": "Constitucional",
    "Direito Empresarial": "Empresarial",
    "Direito Penal": "Penal",
    "Direito Processual Civil": "Processo Civil",
    "Direito Processual Penal": "Processo Penal",
    "Direito Tributário": "Tributário",
    "Direito do Consumidor": "Consumidor",
    "Direito do Trabalho": "Trabalho",
    "Estatuto da Advocacia e da OAB": "Ética",
}

# Lookups em minúsculo pra comparação case-insensitive — LLMs variam a
# caixa ("civil", "CIVIL", "Civil"), e perder o match por causa disso
# geraria "Geral" pra matéria que na verdade é conhecida. O valor
# retornado continua com a caixa canônica correta.
_CANONICAS_POR_LOWER = {m.lower(): m for m in MATERIAS_CANONICAS}
_SINONIMOS_POR_LOWER = {k.lower(): v for k, v in _SINONIMOS.items()}


def canonicalizar_materia(nome: str) -> str:
    """Mapeia pro nome curto oficial (comparação case-insensitive). Se
    não reconhecer (variação nova ou matéria que o Gemini inventou fora
    do currículo), retorna "Geral" em vez de chutar a mais parecida —
    categorizar errado é pior do que admitir a incerteza."""
    nome_lower = (nome or "").strip().lower()
    if nome_lower in _CANONICAS_POR_LOWER:
        return _CANONICAS_POR_LOWER[nome_lower]
    if nome_lower in _SINONIMOS_POR_LOWER:
        return _SINONIMOS_POR_LOWER[nome_lower]
    return "Geral"
