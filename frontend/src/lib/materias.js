/**
 * Fonte única das matérias da 1ª fase da OAB, com peso aproximado de
 * cada uma na prova real (FGV). Cronograma usa todas as 17; Simulado
 * filtra por peso (ver MATERIAS_SIMULADO abaixo). Pra mudar o corte
 * do Simulado no futuro, mexe só em PESO_MINIMO_SIMULADO.
 */

export const MATERIAS = [
  { nome: "Civil", pesoFgv: 10 },
  { nome: "Processo Civil", pesoFgv: 10 },
  { nome: "Constitucional", pesoFgv: 8 },
  { nome: "Ética", pesoFgv: 8 },
  { nome: "Penal", pesoFgv: 8 },
  { nome: "Trabalho", pesoFgv: 6 },
  { nome: "Administrativo", pesoFgv: 5 },
  { nome: "Tributário", pesoFgv: 5 },
  { nome: "Processo Penal", pesoFgv: 5 },
  { nome: "Empresarial", pesoFgv: 4 },
  { nome: "Processo do Trabalho", pesoFgv: 3 },
  { nome: "Filosofia", pesoFgv: 2 },
  { nome: "Direitos Humanos", pesoFgv: 2 },
  { nome: "Internacional", pesoFgv: 2 },
  { nome: "Ambiental", pesoFgv: 1 },
  { nome: "Financeiro", pesoFgv: 1 },
  { nome: "ECA", pesoFgv: 1 },
];

// Lookup nome -> peso, mesmo formato que cronograma.js já usa hoje
// (Object.entries(PESO_FGV)) — o algoritmo de distribuição não precisa mudar.
export const PESO_FGV = Object.fromEntries(MATERIAS.map((m) => [m.nome, m.pesoFgv]));

// Cronograma precisa cobrir 100% da matéria da prova.
export const MATERIAS_CRONO = MATERIAS.map((m) => m.nome);

// Simulado só oferece matérias de peso alto (≥4) porque questões
// focadas em matérias de peso baixo geram pouco valor de estudo —
// ex: 10 questões de ECA (peso 1) é desperdício quando vale 1
// questão na prova real.
const PESO_MINIMO_SIMULADO = 4;
export const MATERIAS_SIMULADO = MATERIAS
  .filter((m) => m.pesoFgv >= PESO_MINIMO_SIMULADO)
  .map((m) => m.nome);
