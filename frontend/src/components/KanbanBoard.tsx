"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import {
  getBoard,
  addCard as apiAddCard,
  updateColumn as apiUpdateColumn,
  deleteCard as apiDeleteCard,
  reorderCard as apiReorderCard,
  type Card as ApiCard,
  type Column as ApiColumn,
} from "@/lib/api";

type BoardState = {
  boardId: number;
  columns: ApiColumn[];
  loading: boolean;
  error: string | null;
};

function toColumn(column: ApiColumn): ApiColumn {
  return { ...column, cards: [...column.cards].sort((a, b) => a.sort_order - b.sort_order) };
}

// Collision detection: find which column the pointer is in, then which card (if any)
function pointerBasedCollision(
  rects: { id: string | number; rect: DOMRect }[],
  pointerX: number,
  pointerY: number
): { id: string | number; distance: number }[] {
  let matchedId: string | number | null = null;
  let minDistance = Infinity;

  // First pass: find columns that contain the pointer horizontally
  for (const item of rects) {
    const el = document.querySelector(`[data-testid="${item.id}"]`);
    if (!el) continue;
    const box = (el as HTMLElement).getBoundingClientRect();

    // Check if pointer is within the element's bounds
    if (pointerX >= box.left && pointerX <= box.right && pointerY >= box.top && pointerY <= box.bottom) {
      // Calculate distance from pointer center to element center
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const distance = Math.sqrt((pointerX - centerX) ** 2 + (pointerY - centerY) ** 2);

      // Columns (id matches column.id from API) have a "column-" prefix in data-testid
      const isColumn = String(item.id).startsWith("column-") || rects.some(r => r.id === item.id && !rects.some(c => c.id === item.id && String(c.id).includes("card")));

      if (isColumn || !matchedId) {
        if (distance < minDistance) {
          minDistance = distance;
          matchedId = item.id;
        }
      }
    }
  }

  if (matchedId) {
    return [{ id: matchedId, distance: minDistance }];
  }

  // Fallback: check which column the pointer is horizontally closest to
  const columnRects = rects.filter((r) => {
    const el = document.querySelector(`[data-testid="column-${r.id}"]`);
    return el !== null;
  });

  for (const rect of columnRects) {
    const el = document.querySelector(`[data-testid="column-${rect.id}"]`) as HTMLElement;
    if (!el) continue;
    const box = el.getBoundingClientRect();
    if (pointerX >= box.left && pointerX <= box.right) {
      // Find closest card top within this column
      const cardRects = rects.filter((r) => {
        const cardEl = document.querySelector(`[data-testid="card-${r.id}"]`);
        return cardEl !== null && cardEl.parentElement?.closest(`[data-testid="column-${rect.id}"]`) !== null;
      });

      for (const cardRect of cardRects) {
        const cardEl = document.querySelector(`[data-testid="card-${cardRect.id}"]`) as HTMLElement;
        if (!cardEl) continue;
        const cardBox = cardEl.getBoundingClientRect();
        if (pointerY >= cardBox.top && pointerY <= cardBox.bottom) {
          return [{ id: cardRect.id, distance: 0 }];
        }
      }

      // Over column background
      return [{ id: rect.id, distance: 0 }];
    }
  }

  return [];
}

export const KanbanBoard = () => {
  const [state, setState] = useState<BoardState>({
    boardId: 0,
    columns: [],
    loading: true,
    error: null,
  });
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  // Keep a ref to columns for collision detection (avoids stale closure)
  const columnsRef = useRef<ApiColumn[]>([]);
  useEffect(() => {
    columnsRef.current = state.columns;
  }, [state.columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const cardsById = useMemo(() => {
    const map: Record<number, ApiCard> = {};
    for (const col of state.columns) {
      for (const card of col.cards) {
        map[card.id] = card;
      }
    }
    return map;
  }, [state.columns]);

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
        error: err instanceof Error ? err.message : "Failed to load board",
      }));
    }
  }, []);

  useEffect(() => {
    refreshBoard();
  }, [refreshBoard]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(Number(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id || state.boardId === 0) return;

    const activeId = Number(active.id);
    const activeCard = columnsRef.current.flatMap((c) => c.cards).find((c) => c.id === activeId);
    if (!activeCard) return;

    // Find the over column/card
    let targetColumnId: number | null = null;
    let targetOrder: number | null = null;

    if (columnsRef.current.some((c) => c.id === Number(over.id))) {
      // Dropped on a column (new card)
      targetColumnId = Number(over.id);
      targetOrder = columnsRef.current
        .find((c) => c.id === targetColumnId)!
        .cards.length;
    } else {
      // Dropped on a card
      for (const col of columnsRef.current) {
        const overCard = col.cards.find((c) => c.id === Number(over.id));
        if (overCard) {
          targetColumnId = col.id;
          targetOrder = col.cards.indexOf(overCard);
          break;
        }
      }
    }

    if (targetColumnId === null) return;

    try {
      await apiReorderCard(state.boardId, activeId, targetColumnId, targetOrder);
      refreshBoard();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to move card",
      }));
    }
  };

  const handleAddCard = async (columnId: number, title: string, details: string) => {
    if (state.boardId === 0) return;
    try {
      await apiAddCard(state.boardId, columnId, title, details);
      refreshBoard();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to add card",
      }));
    }
  };

  const handleDeleteCard = async (columnId: number, cardId: number) => {
    if (state.boardId === 0) return;
    try {
      await apiDeleteCard(state.boardId, cardId);
      refreshBoard();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete card",
      }));
    }
  };

  const handleRenameColumn = async (columnId: number, title: string) => {
    if (state.boardId === 0) return;
    const column = state.columns.find((c) => c.id === columnId);
    if (!column) return;
    try {
      await apiUpdateColumn(state.boardId, columnId, title, column.sort_order);
      refreshBoard();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to rename column",
      }));
    }
  };

  const activeCard = activeCardId ? cardsById[activeCardId] : null;

  if (state.loading) {
    return (
      <section className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">Loading board...</div>
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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerBasedCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <section className="flex flex-1 gap-6 overflow-x-auto pb-2">
        {state.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={column.cards}
            onRename={handleRenameColumn}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
          />
        ))}
      </section>
      <DragOverlay>
        {activeCard ? (
          <div className="w-[260px]">
            <KanbanCardPreview card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
