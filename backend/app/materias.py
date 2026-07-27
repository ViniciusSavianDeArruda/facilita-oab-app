"""Utilitários para normalização dos nomes das matérias da aplicação."""

MATERIAS_CANONICAS = frozenset({
    "Civil", "Processo Civil", "Constitucional", "Ética", "Penal",
    "Trabalho", "Administrativo", "Tributário", "Processo Penal",
    "Empresarial", "Processo do Trabalho", "Filosofia", "Direitos Humanos",
    "Internacional", "Ambiental", "Financeiro", "ECA", "Consumidor",
})

# Mapeia variações conhecidas para o nome canônico da matéria.
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

# Estruturas auxiliares para comparação sem diferenciar maiúsculas e minúsculas.
_CANONICAS_POR_LOWER = {m.lower(): m for m in MATERIAS_CANONICAS}
_SINONIMOS_POR_LOWER = {k.lower(): v for k, v in _SINONIMOS.items()}


# Retorna o nome canônico da matéria ou "Geral" quando não houver correspondência.
def canonicalizar_materia(nome: str) -> str:
    nome_lower = (nome or "").strip().lower()

    if nome_lower in _CANONICAS_POR_LOWER:
        return _CANONICAS_POR_LOWER[nome_lower]

    if nome_lower in _SINONIMOS_POR_LOWER:
        return _SINONIMOS_POR_LOWER[nome_lower]

    return "Geral"
