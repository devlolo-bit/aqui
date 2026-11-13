/*
 * Meus Números — os indicadores do negócio da usuária.
 *
 * A página 51 do brandbook pedia, na tela inicial, "os dados dela de vendas,
 * prospecção, crescimento, Branding Value". Nunca existiu lugar para guardar
 * isso, e é o que este módulo resolve.
 *
 * ONDE OS DADOS MORAM, e por quê.
 * O desenho certo seria uma coleção própria, `business_metric`. A IA do Studio
 * da Fabapp não consegue criar coleção nova — só acrescentar campos a coleções
 * existentes — então os indicadores vivem em `journal_entry`, com a categoria
 * "indicadores" separando-os dos registros pessoais.
 *
 * É contorno, não desenho. Se a plataforma passar a criar coleções, vale
 * migrar: os campos já têm os nomes definitivos.
 */

export const METRIC_CATEGORY = 'indicadores';

export type MetricRow = {
  id: string;
  owner_id?: string;
  title?: string;
  body?: string | null;
  category?: string;
  entry_date?: string | null;
  revenue?: number | null;
  new_clients?: number | null;
  leads?: number | null;
  followers?: number | null;
};

export type MetricKey = 'revenue' | 'new_clients' | 'leads' | 'followers';

export type MetricDef = {
  key: MetricKey;
  label: string;
  /* O que a usuária deve contar, em uma linha. */
  hint: string;
  /* Como o número é escrito na tela. */
  format: (n: number) => string;
  /* A pergunta que o indicador responde, para o cabeçalho do gráfico. */
  question: string;
};

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat('pt-BR');

export const METRICS: MetricDef[] = [
  {
    key: 'revenue',
    label: 'Faturamento',
    hint: 'Quanto entrou no mês, antes de descontar custos.',
    format: (n) => brl.format(n),
    question: 'Quanto o seu trabalho gerou',
  },
  {
    key: 'new_clients',
    label: 'Novos clientes',
    hint: 'Quantas pessoas compraram de você pela primeira vez.',
    format: (n) => plain.format(n),
    question: 'Quantas pessoas novas você conquistou',
  },
  {
    key: 'leads',
    label: 'Novos contatos',
    hint: 'Quantas pessoas demonstraram interesse, mesmo sem comprar.',
    format: (n) => plain.format(n),
    question: 'Quanto a sua marca atraiu',
  },
  {
    key: 'followers',
    label: 'Seguidores',
    hint: 'O total que você tinha no fim do mês, somando as redes.',
    format: (n) => plain.format(n),
    question: 'Qual o alcance da sua marca',
  },
];

/* O mês de referência, no formato AAAA-MM. */
export function periodKey(iso: string | null | undefined): string {
  return (iso ?? '').slice(0, 7);
}

export function periodLabel(iso: string | null | undefined): string {
  const key = periodKey(iso);
  if (key.length !== 7) return '';
  const [y, m] = key.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const idx = Number(m) - 1;
  return `${names[idx] ?? m}/${y.slice(2)}`;
}

/* Um registro por mês: se houver mais de um, o mais recente vence.
 * Ordena do mais antigo para o mais novo, que é como o gráfico lê. */
export function byMonth(rows: MetricRow[]): MetricRow[] {
  const map = new Map<string, MetricRow>();
  for (const r of rows) {
    const key = periodKey(r.entry_date);
    if (key.length !== 7) continue;
    const current = map.get(key);
    if (!current || String(r.entry_date) >= String(current.entry_date)) map.set(key, r);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, r]) => r);
}

export function valueOf(row: MetricRow, key: MetricKey): number | null {
  const v = row[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* A variação entre o último mês e o anterior, em porcentagem.
 * Devolve null quando não há base de comparação — crescimento sobre zero não
 * é um número, é uma ilusão de ótica. */
export function growth(rows: MetricRow[], key: MetricKey): { last: number; delta: number | null } | null {
  const series = byMonth(rows)
    .map((r) => valueOf(r, key))
    .filter((v): v is number => v !== null);
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  if (series.length < 2) return { last, delta: null };
  const prev = series[series.length - 2];
  if (prev === 0) return { last, delta: null };
  return { last, delta: Math.round(((last - prev) / prev) * 100) };
}
