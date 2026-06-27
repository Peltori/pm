"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/KanbanColumn";
import { KanbanCardPreview } from "@/components/KanbanCardPreview";
import {
  getBoard,
  addCard as apiAddCard,
  updateCard as apiUpdateCard,
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

export const KanbanBoard = () => {
  const [state, setState] = useState<BoardState>({
    boardId: 0,
    columns: [],
    loading: true,
    error: null,
  });
  const [activeCardId, setActiveCardId] = useState<number | null>(null);

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
    const activeCard = state.columns.flatMap((c) => c.cards).find((c) => c.id === activeId);
    if (!activeCard) return;

    // Find the over column/card
    let targetColumnId: number | null = null;
    let targetOrder: number | null = null;

    if (state.columns.some((c) => c.id === Number(over.id))) {
      // Dropped on a column (new card)
      targetColumnId = Number(over.id);
      targetOrder = state.columns
        .find((c) => c.id === targetColumnId)!
        .cards.length;
    } else {
      // Dropped on a card
      targetColumnId = activeCard.column_id;
      for (const col of state.columns) {
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
      await apiUpdateCard(state.boardId, columnId, title, undefined, column.sort_order);
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
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <section className="grid gap-6 lg:grid-cols-5">
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
