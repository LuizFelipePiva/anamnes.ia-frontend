// Tipagem do índice de uso das chaves i18n (SPEC-008 §9.4, SPEC-009 §11.1).

/** Onde uma chave aparece no código. `soft` = o literal pode ser fragmento. */
export interface UsageSpot {
  file: string;
  line: number;
  soft?: boolean;
}

export interface KeyOccurrence {
  /** Namespace explícito (`ns:chave`), quando presente. */
  ns?: string;
  key: string;
  line: number;
  soft: boolean;
}

export interface DynamicPrefix {
  prefix: string;
  line: number;
}

export interface UsageIndex {
  /** "ns:chave" → lugares onde aparece. `*` = namespace indeterminado. */
  byKey: Map<string, UsageSpot[]>;
  /** "ns:prefixo" de chaves montadas dinamicamente. */
  prefixes: Set<string>;
}

export interface OrphanReport {
  /** Ids "ns:chave" definidos e sem uso encontrado. */
  orphans: string[];
  /** Usos sem chave correspondente no dicionário de referência. */
  missing: { id: string; spots: UsageSpot[] }[];
}

/** Prefixos "ns:chave" isentos do relatório de órfãs (chave dinâmica). */
export declare const USAGE_ALLOWLIST: string[];

export declare function extractFromSource(text: string): {
  keys: KeyOccurrence[];
  prefixes: DynamicPrefix[];
};

export declare function scanUsage(srcDir: string): UsageIndex;

export declare function findOrphans(
  definedByNs: Record<string, Record<string, string>>,
  usage: UsageIndex,
): OrphanReport;

/** Carrega os dicionários de um idioma já achatados, por namespace. */
export declare function loadDefined(langDir: string): Record<string, Record<string, string>>;
