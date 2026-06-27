"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type Collision,
  type CollisionDescriptor,
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

// Module-level ref to column IDs (updated each render for collision detection)
const columnIdsRef = new Set<string>();

function registerColumnIds(ids: Set<string>) {
  columnIdsRef.clear();
  ids.forEach((id) => columnIdsRef.add(id));
}

// Collision detection: find which column the pointer is in, then which card (if any)
// Uses rect data from args — never accesses document
function pointerBasedCollision(args: {
  active: { id: string | number; data?: any };
  collisionRect: { left: number; top: number; width: number; height: number };
  droppableRects: Map<string | number, { left: number; top: number; width: number; height: number }>;
  droppableContainers: Array<{ id: string | number; disabled: boolean }>;
  pointerCoordinates: { x: number; y: number } | null;
}): Collision[] {
  const pointer = args.pointerCoordinates;
  if (!pointer) return [];

  // Separate columns from cards using columnIdsRef
  interface RectItem { id: string | number; rect: { left: number; top: number; width: number; height: number } }
  const columns: RectItem[] = [];
  const cards: RectItem[] = [];

  for (const container of args.droppableContainers) {
    const rect = args.droppableRects.get(container.id);
    if (!rect) continue;
    const idStr = String(container.id);
    if (columnIdsRef.has(idStr)) {
      columns.push({ id: container.id, rect });
    } else {
      cards.push({ id: container.id, rect });
    }
  }

  if (columns.length === 0 && cards.length === 0) {
    return [];
  }

  // For number-only IDs, use a heuristic: cards have the active card's rect as collisionRect
  // Columns are wider and taller. We'll use the active card's position to determine
  // which column the pointer is in.
  let matchedColumnId: string | number | null = null;
  let minColDistance = Infinity;

  for (const col of columns) {
    // Check if pointer is horizontally within this column
    if (pointer.x >= col.rect.left && pointer.x <= col.rect.left + col.rect.width) {
      const centerY = col.rect.top + col.rect.height / 2;
      const distance = Math.abs(pointer.y - centerY);
      if (distance < minColDistance) {
        minColDistance = distance;
        matchedColumnId = col.id;
      }
    }
  }

  // Also check if pointer is within the collision rect's horizontal bounds
  if (!matchedColumnId) {
    for (const col of columns) {
      if (
        args.collisionRect.left + args.collisionRect.width >= col.rect.left &&
        args.collisionRect.left <= col.rect.left + col.rect.width
      ) {
        const centerY = col.rect.top + col.rect.height / 2;
        const distance = Math.abs(
          args.collisionRect.top + args.collisionRect.height / 2 - centerY
        );
        if (distance < minColDistance) {
          minColDistance = distance;
          matchedColumnId = col.id;
        }
      }
    }
  }

  if (!matchedColumnId) return [];

  // Second pass: check if pointer is over a specific card in the matched column
  for (const card of cards) {
    if (
      pointer.x >= card.rect.left &&
      pointer.x <= card.rect.left + card.rect.width &&
      pointer.y >= card.rect.top &&
      pointer.y <= card.rect.top + card.rect.height
    ) {
      return [{ id: card.id }];
    }
  }

  // Pointer is over the column background
  return [{ id: matchedColumnId }];
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

  // Column IDs for collision detection
  const columnIds = useMemo(() => {
    const ids = new Set(state.columns.map((c) => String(c.id)));
    registerColumnIds(ids);
    return ids;
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
