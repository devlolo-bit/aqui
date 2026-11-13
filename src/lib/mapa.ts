export const DIMENSIONS = [
  {
    key: 'profissional',
    label: 'Profissional',
    question: 'Em que medida você tem clareza sobre a sua atuação profissional?',
  },
  { key: 'pessoal', label: 'Pessoal', question: 'Em que medida você se sente à vontade para decidir por si mesma?' },
  { key: 'financeira', label: 'Financeira', question: 'Em que medida você acompanha e organiza as suas finanças?' },
  { key: 'emocional', label: 'Emocional', question: 'Em que medida você sustenta as suas escolhas com segurança?' },
  { key: 'energetica', label: 'Energética', question: 'Em que medida você administra a sua energia e a sua rotina?' },
];

export function computeScores(answers: Record<string, number>) {
  const byDimension: Record<string, number> = {};
  let answered = 0;
  let sum = 0;
  for (const d of DIMENSIONS) {
    const v = answers[d.key];
    if (v) {
      answered += 1;
      sum += v;
    }
    byDimension[d.key] = v ? Math.round((v / 5) * 100) : 0;
  }
  const overall = answered ? Math.round((sum / (answered * 5)) * 100) : 0;
  return { byDimension, overall, answered };
}

export function stageFor(overall: number) {
  if (overall >= 80) return 'PROSPERAR';
  if (overall >= 60) return 'CONECTAR';
  if (overall >= 40) return 'CONSTRUIR';
  if (overall >= 20) return 'DESENVOLVER';
  return 'DIAGNOSTICAR';
}
