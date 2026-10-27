# Débito técnico conhecido

Este documento registra limitações persistentes, riscos e decisões adiadas.
Pendências acionáveis e priorizáveis ficam em TODO.md.

## Race condition no cronograma (issue aberta no GitHub)

Cliques rápidos (<200ms de intervalo) ao marcar tarefas causam estado inconsistente — respostas de requests antigos podem sobrescrever estado mais recente. Causa: múltiplos PUTs concorrentes + latência Render↔Neon (~2.4s). Solução já especificada: versionamento de requests em savePlano (cronograma.js) — descartar resposta se não for a versão mais recente. Não implementado ainda.

## Dados de teste

Os itens acionáveis de limpeza de dados de teste estão em TODO.md. Este risco permanece relevante enquanto ambientes de desenvolvimento forem reutilizados como demonstração.

## Rate limit atrás do proxy do Render

O `Dockerfile` roda `uvicorn` sem `--forwarded-allow-ips`; o padrão confia em `X-Forwarded-For` só de `127.0.0.1`. Atrás do Render o cabeçalho é ignorado e o limite (`slowapi`, por `request.client.host`) tende a agrupar todos os clientes sob o IP do proxy: nenhuma burla por cabeçalho forjado (coberto por teste), mas 5 tentativas erradas de login/minuto de qualquer origem bloqueiam também o dono. Não confirmado em produção (IP visto pelo app no Render). Não definir `FORWARDED_ALLOW_IPS=*`: o uvicorn usaria o primeiro IP do cabeçalho, forjável pelo cliente, e anularia o limite de login. Correção segura exige confirmar a faixa de IPs do proxy do Render e restringir `--forwarded-allow-ips` a ela.


## Cabeçalhos de segurança do frontend (Vercel)

A API envia CSP restritiva (`default-src 'none'`), HSTS, `nosniff` e `X-Frame-Options`; CORS libera só `CORS_ORIGINS`, métodos e cabeçalhos usados, sem credenciais. O frontend servido pela Vercel não tem `vercel.json` nem CSP/cabeçalhos próprios. Definir uma CSP exige mapear fontes, estilos inline do Tailwind/Vite e a URL da API e testar em navegador; fica pendente para não quebrar a interface em produção. O token JWT continua em `localStorage`, o que torna uma CSP útil contra XSS.
