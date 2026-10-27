# Débito técnico conhecido

Registra limitações persistentes, riscos e decisões adiadas após a V2.
Pendências acionáveis ficam em TODO.md.

## Rate limit atrás do proxy do Render — pendente de validação

O backend roda com `uvicorn` sem `--forwarded-allow-ips`; o padrão só confia
em `X-Forwarded-For` de `127.0.0.1`. Atrás do Render, o `request.client.host`
visto pelo `slowapi` pode ser o IP do proxy — o que agruparia todos os clientes
sob o mesmo endereço: 5 tentativas erradas de login em um minuto bloqueiam a
conta mesmo para o dono legítimo.

Não confirmado em produção (IP real visto pelo app no Render não foi verificado).
Não configurar `FORWARDED_ALLOW_IPS=*`: o uvicorn passaria a confiar no primeiro
IP do cabeçalho `X-Forwarded-For`, que é forjável pelo cliente, anulando o rate
limit de login. A correção segura exige confirmar a faixa de IPs do proxy do
Render e restringir `--forwarded-allow-ips` a ela.

## POST /me/simulados sem idempotência — risco aceito

Reenviar o mesmo resultado cria um segundo registro no banco. A UI evita
duplicação conferindo o histórico antes de tentar de novo após uma falha de
rede, mas qualquer outro cliente, ou um reenvio que a tela não detecte, duplica
o registro e distorce as estatísticas (total de simulados, médias, evolução).

Para app single-user com interface controlada, o risco é aceito como está.
A correção definitiva seria uma chave de idempotência enviada pelo cliente
(ex.: UUID gerado no início do simulado) e verificada pelo servidor com
`ON CONFLICT DO NOTHING`.

## CSP no frontend da Vercel — pendente

O backend emite CSP restritiva em produção. O frontend servido pela Vercel não
tem `vercel.json` com `Content-Security-Policy`. O token JWT fica em
`localStorage`, o que torna uma CSP útil como defesa em profundidade contra XSS.

Implementar exige mapear todas as origens (fontes, estilos inline do
Tailwind/Vite, URL da API) e testar em navegador para não quebrar a interface.
Fica pendente para a próxima iteração de segurança.

## Falhas silenciosas de carga em alguns módulos

`App.jsx` exibe a faixa global de aviso quando `cargaFalhas.js` registra uma
falha de hidratação. Os módulos `hydrateCaderno`, `hydrateSimulados` e
`hydrateSettings` reportam por essa via. Os módulos de cronograma, última
atividade e conversas **não reportam** falhas individuais — o usuário não recebe
aviso caso esses dados não carreguem.

## Múltiplas abas simultâneas no Plano

A fila de escritas de `planoPersistence.js` garante serialização dentro de uma
aba. Em duas abas abertas ao mesmo tempo, a segunda pode sobrescrever o estado
salvo pela primeira se ambas fizerem PUT concorrentes. A solução completa
exigiria versionamento ou ETag no backend.

## Deduplicação do Caderno por enunciado ignora itens dominados

Ao salvar o resultado de um Simulado, o backend inclui no Caderno somente
questões erradas ainda não presentes, comparando pelo enunciado. Itens já
marcados como "dominado" são considerados presentes e não são reinseridos —
o que significa que uma questão errada de novo em "dominado" não retorna ao
estado "aberto". É um comportamento intencional simplificado; pode ser revisado
se necessário.
