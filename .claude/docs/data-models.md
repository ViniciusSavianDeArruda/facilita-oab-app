# Modelos de dados relevantes pro frontend

## Plano de cronograma (cronograma.js, Cronograma.jsx)

Cada dia do plano: { data (ISO), itens: [...], concluido }

Cada item dentro de um dia:
```
{
  id: string (uuid, gerado via crypto.randomUUID()),
  tipo: "revisar" | "simulado" | "caderno",
  materia: string (só presente quando tipo === "revisar"),
  minutos: number,
  concluido: boolean
}
```

Não existe campo de subtítulo/subtema — só matéria + tipo + duração. Não inventar esse dado ao gerar UI.

## Autenticação

JWT armazenado em localStorage (authClient.js). Ao receber 401, handleAuthExpired() remove o token ANTES de disparar o evento auth:expired — importante manter essa ordem pra evitar loop de requisições (bug já corrigido, ver commit f5b584c).

## Simulados

Gerados via structured output do Gemini, 10 questões por simulado. Modo "rápido" (matérias variadas) ou "focar em matéria" (1 matéria escolhida). Sem persistência de progresso pausado (retomar simulado do meio não é suportado hoje).
