import { describe, it, expect } from 'vitest';
import type { Card } from '@/lib/api';

describe('Card type', () => {
  it('Card has required properties', () => {
    const card: Card = {
      id: 1,
      title: 'Test',
      details: 'Details',
      column_id: 1,
      sort_order: 0,
    };
    expect(card.id).toBe(1);
    expect(card.title).toBe('Test');
  });

  it('Column can have cards', () => {
    const cards: Card[] = [
      { id: 1, title: 'Card 1', details: '', column_id: 1, sort_order: 0 },
      { id: 2, title: 'Card 2', details: '', column_id: 1, sort_order: 1 },
    ];
    expect(cards).toHaveLength(2);
  });
});
