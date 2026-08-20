import React from 'react';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

export interface Deck {
  id: string;
  name: string;
  specialty: string;
  source: 'manual' | 'case' | 'soap' | 'ai';
  cards: Flashcard[];
  /** Solid hex color, e.g. '#C0415A' */
  color: string;
  icon: React.ReactNode;
  /** Cards due for review today */
  due_count: number;
  total: number;
  class_ids?: string[];
  class_names?: string[];
}
