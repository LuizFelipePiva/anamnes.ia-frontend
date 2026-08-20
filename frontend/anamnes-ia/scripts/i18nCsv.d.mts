// Tipagem do utilitário de export/import CSV dos dicionários i18n (SPEC-007 / RF16).
export declare const LANGS: readonly ['pt-BR', 'en', 'es'];

type Json = Record<string, unknown>;
type Dicts = Record<string, Record<string, Json>>;

export declare function flatten(obj: Json, prefix?: string, out?: Record<string, string>): Record<string, string>;
export declare function unflatten(flat: Record<string, string>): Json;
export declare function toCsv(rows: string[][]): string;
export declare function parseCsv(text: string): string[][];
export declare function dictsToRows(dicts: Dicts, namespaces: string[]): string[][];
export declare function rowsToDicts(rows: string[][]): Dicts;
