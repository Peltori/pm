'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBoard,
  addCard as apiAddCard,
  updateColumn as apiUpdateColumn,
  deleteCard as apiDeleteCard,
  reorderCard as apiReorderCard,
  type Card as ApiCard,
  type Column as ApiColumn,
} from '@/lib/api';
import {
  Kanban,
  KanbanBoard as KanbanBoardUI,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from '@/components/ui/kanban';
import { NewCardForm } from '@/components/NewCardForm';
import { KanbanCardPreview } from '@/components/KanbanCardPreview';

// Prefix for column keys to disambiguate from card IDs when they collide.
const colKey = (id: number | string): string => `col-${id}`;

type BoardState = {
  boardId: number;
  columns: ApiColumn[];
  loading: boolean;
  error: string | null;
};

function toColumn(column: ApiColumn): ApiColumn {
  return {
    ...column,
    cards: [...column.cards].sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Convert API board state to kanban-friendly format */
function toKanbanData(columns: ApiColumn[]) {
  return Object.fromEntries(
    columns.map((col) => [colKey(col.id), col.cards])
  ) as Record<string, ApiCard[]>;
}

export function KanbanBoard() {
  const [state, setState] = useState<BoardState>({
    boardId: 0,
    columns: [],
    loading: true,
    error: null,
  });

  const kanbanData = useMemo(
    () => toKanbanData(state.columns),
    [state.columns]
  );

  const refreshBoard = useCallback(async () => {
    try {
      const board = await getBoard();
      if (!board.id) return;
      setState((prev) => ({
        ...prev,
        boardId: board.id ?? prev.boardId,
        columns: board.columns.map(toColumn),
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error ? err.message : 'Failed to load board',
      }));
    }
  }, []);

  useEffect(() => {
    refreshBoard();
  }, [refreshBoard]);

  const handleRenameColumn = useCallback(
    async (columnId: number, title: string) => {
      if (state.boardId === 0) return;
      const column = state.columns.find((c) => c.id === columnId);
      if (!column) return;
      try {
        await apiUpdateColumn(state.boardId, columnId, title, column.sort_order);
        refreshBoard();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to rename column',
        }));
      }
    },
    [state.boardId, state.columns, refreshBoard]
  );

  const handleAddCard = useCallback(
    async (columnId: number, title: string, details: string) => {
      if (state.boardId === 0) return;
      try {
        await apiAddCard(state.boardId, columnId, title, details);
        refreshBoard();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to add card',
        }));
      }
    },
    [state.boardId, refreshBoard]
  );

  const handleDeleteCard = useCallback(
    async (columnId: number, cardId: number) => {
      if (state.boardId === 0) return;
      try {
        await apiDeleteCard(state.boardId, cardId);
        refreshBoard();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to delete card',
        }));
      }
    },
    [state.boardId, refreshBoard]
  );

  const handleMoveCard = useCallback(
    async (event: {
      activeContainer: string;
      activeIndex: number;
      overContainer: string;
      overIndex: number;
    }) => {
      if (state.boardId === 0) return;

      const { activeContainer, activeIndex, overContainer, overIndex } = event;
      // Strip "col-" prefix added by Kanban for ID disambiguation.
      const activeColumnId = parseInt(activeContainer.replace(/^col-/, ''), 10);
      const overColumnId = parseInt(overContainer.replace(/^col-/, ''), 10);

      // Find the card being moved
      const sourceCards = state.columns.find(
        (c) => c.id === activeColumnId
      )?.cards;
      if (!sourceCards || sourceCards.length === 0) return;

      const cardToMove = sourceCards[activeIndex];
      if (!cardToMove) return;

      try {
        // Determine target column and position
        const targetColumnId = overColumnId;
        const targetOrder = overIndex;

        await apiReorderCard(
          state.boardId,
          cardToMove.id,
          targetColumnId,
          targetOrder
        );
        refreshBoard();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : 'Failed to move card',
        }));
      }
    },
    [state.boardId, state.columns, refreshBoard]
  );

  if (state.loading) {
    return (
      <section className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Loading board...
        </div>
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-red-500">{state.error}</p>
        <button
          onClick={refreshBoard}
          className="rounded bg-purple-secondary px-4 py-2 text-white transition hover:bg-purple-secondary/90"
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <Kanban
      value={kanbanData}
      onValueChange={(data) => {
        // This is called during drag for real-time visual feedback.
        // The actual API call happens in onMove.
      }}
      getItemValue={(item) => String(item.id)}
      onMove={handleMoveCard}
      className="mx-auto w-full"
    >
      <KanbanBoardUI className="flex gap-6 overflow-x-auto pb-2">
        {state.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            value={colKey(column.id)}
            className="w-[320px] flex-shrink-0"
          >
            <section
              className="flex flex-col rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow)] transition"
              data-testid={`column-${column.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-full">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-10 rounded-full bg-[var(--accent-yellow)]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
                      {column.cards.length} cards
                    </span>
                  </div>
                  <input
                    value={column.title}
                    onChange={(e) =>
                      handleRenameColumn(column.id, e.target.value)
                    }
                    className="mt-3 w-full bg-transparent font-display text-lg font-semibold text-[var(--navy-dark)] outline-none"
                    aria-label="Column title"
                  />
                </div>
              </div>
              <KanbanColumnContent value={colKey(column.id)}>
                {column.cards.map((card) => (
                  <KanbanItem
                    key={card.id}
                    value={String(card.id)}
                    className="flex-1"
                  >
                    <KanbanItemHandle>
                      <KanbanCardPreview card={card} />
                    </KanbanItemHandle>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(column.id, card.id)}
                      className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-[var(--gray-text)] transition hover:border-[var(--stroke)] hover:text-[var(--navy-dark)]"
                      aria-label={`Delete ${card.title}`}
                    >
                      Remove
                    </button>
                  </KanbanItem>
                ))}
                {column.cards.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
                    Drop a card here
                  </div>
                )}
              </KanbanColumnContent>
              <NewCardForm
                onAdd={(title, details) =>
                  handleAddCard(column.id, title, details)
                }
              />
            </section>
          </KanbanColumn>
        ))}
      </KanbanBoardUI>
      <KanbanOverlay>
        {({ value, variant }) => {
          const stringValue = String(value);

          if (variant === 'column') {
            // Overlay for dragging a column (value is prefixed with "col-")
            const colId = parseInt(stringValue.replace(/^col-/, ''), 10);
            return (
              <section
                className="flex w-[320px] flex-col rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-4 opacity-50"
                data-testid={`column-${colId}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-10 rounded-full bg-[var(--accent-yellow)]" />
                  <span className="text-sm font-semibold text-[var(--navy-dark)]">
                    Column
                  </span>
                </div>
              </section>
            );
          }

          // Overlay for dragging a card
          const allCards = state.columns.flatMap((col) => col.cards);
          const card = allCards.find((c) => String(c.id) === stringValue);
          if (!card) return null;

          return (
            <div className="w-[260px]">
              <KanbanCardPreview card={card} />
            </div>
          );
        }}
      </KanbanOverlay>
    </Kanban>
  );
}
