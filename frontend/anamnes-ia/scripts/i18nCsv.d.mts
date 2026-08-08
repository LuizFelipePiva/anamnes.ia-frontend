// Tipagem do utilitário de export/import CSV dos dicionários i18n
// (SPEC-007 / RF16, redesenhado pela SPEC-009).
export declare const LANGS: readonly ['pt-BR', 'en', 'es', 'ru'];

type Json = Record<string, unknown>;
type Dicts = Record<string, Record<string, Json>>;

export interface CsvOptions {
  /** Separador de colunas. Default ';' (Excel pt-BR). */
  sep?: string;
  /** Prefixa BOM UTF-8 para o Excel reconhecer a codificação. */
  bom?: boolean;
  /** Termina as linhas com CRLF (RFC 4180). */
  crlf?: boolean;
}

/** lang → namespace → chave → marca de revisão (SPEC-009 §11.2). */
export type ReviewStatus = Record<string, Record<string, Record<string, string>>>;

export interface ExportOptions {
  /** Idiomas editáveis do recorte. Default: todos de LANGS. */
  langs?: string[];
  /** Idioma exportado como coluna somente-leitura `ref:<lang>`. */
  refLang?: string;
  /** Só linhas ausentes ou começando com "TODO:" nos idiomas editáveis. */
  todo?: boolean;
  /** Origem da chave na UI → coluna somente-leitura `context`. */
  context?: (ns: string, key: string) => string;
  /** Marcas atuais → colunas `status:<lang>`. */
  status?: ReviewStatus;
}

export interface ImportOptions {
  /** Habilita a marca `<DELETE>` para remover chaves. */
  allowDelete?: boolean;
  /** Restringe quais colunas de idioma são aplicadas. */
  langs?: string[];
  /** Marcas já gravadas; o CSV é aplicado como merge sobre elas. */
  existingStatus?: ReviewStatus;
}

export interface ValidateOptions extends ImportOptions {
  /** Namespaces existentes; qualquer outro no CSV vira erro. */
  validNamespaces?: string[];
}

export interface ImportReport {
  updated: number;
  created: number;
  unchanged: number;
  removed: number;
}

export declare function flatten(
  obj: Json,
  prefix?: string,
  out?: Record<string, unknown>,
): Record<string, unknown>;
export declare function unflatten(flat: Record<string, unknown>): Json;

export declare function escapeFormulaCell(s: string): string;
export declare function unescapeFormulaCell(s: string): string;
export declare function detectSeparator(headerLine: string): string;

export declare function toCsv(rows: string[][], opts?: CsvOptions): string;
export declare function parseCsv(text: string, opts?: Pick<CsvOptions, 'sep'>): string[][];

export declare function dictsToRows(
  dicts: Dicts,
  namespaces: string[],
  opts?: ExportOptions,
): string[][];

export declare function rowsToDicts(
  rows: string[][],
  existingDicts?: Dicts,
  opts?: ImportOptions,
): { dicts: Dicts; touched: Record<string, Set<string>>; status: ReviewStatus };

/** Aplica as colunas `status:<lang>` do CSV sobre as marcas existentes (merge). */
export declare function rowsToStatus(
  rows: string[][],
  existingStatus?: ReviewStatus,
): ReviewStatus;

export declare function validateImport(
  rows: string[][],
  existingDicts?: Dicts,
  opts?: ValidateOptions,
): { errors: string[]; report: ImportReport };

export declare function resolveNamespaces(
  requested: string[] | undefined,
  available: string[],
): { errors: string[]; valid?: string[] };

export declare function writeDictsAtomic(files: { path: string; content: string }[]): number;
