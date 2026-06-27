const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export type Card = {
  id: number;
  column_id: number;
  title: string;
  details: string;
  sort_order: number;
};

export type Column = {
  id: number;
  board_id: number;
  title: string;
  sort_order: number;
  cards: Card[];
};

export type Board = {
  id: number | null;
  columns: Column[];
};

async function fetchApi(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers as Record<string, string>) },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

export async function getBoard(): Promise<Board> {
  return fetchApi(`${API_BASE}/boards`) as Promise<Board>;
}

export async function addColumn(boardId: number, title: string, sortOrder: number) {
  return fetchApi(`${API_BASE}/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify({ title, sort_order: sortOrder }),
  }) as Promise<{ id: number; title: string }>;
}

export async function updateColumn(boardId: number, columnId: number, title: string, sortOrder: number) {
  return fetchApi(`${API_BASE}/boards/${boardId}/columns/${columnId}`, {
    method: "PUT",
    body: JSON.stringify({ title, sort_order: sortOrder }),
  }) as Promise<{ title: string }>;
}

export async function deleteColumn(boardId: number, columnId: number) {
  return fetchApi(`${API_BASE}/boards/${boardId}/columns/${columnId}`, {
    method: "DELETE",
  }) as Promise<{ status: string }>;
}

export async function addCard(boardId: number, columnId: number, title: string, details: string) {
  return fetchApi(`${API_BASE}/boards/${boardId}/cards`, {
    method: "POST",
    body: JSON.stringify({ column_id: columnId, title, details }),
  }) as Promise<Card>;
}

export async function updateCard(boardId: number, cardId: number, title?: string, details?: string, sortOrder?: number) {
  const payload: Record<string, unknown> = {};
  if (title !== undefined) payload.title = title;
  if (details !== undefined) payload.details = details;
  if (sortOrder !== undefined) payload.sort_order = sortOrder;
  return fetchApi(`${API_BASE}/boards/${boardId}/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }) as Promise<Card>;
}

export async function deleteCard(boardId: number, cardId: number) {
  return fetchApi(`${API_BASE}/boards/${boardId}/cards/${cardId}`, {
    method: "DELETE",
  }) as Promise<{ status: string }>;
}

export async function reorderCard(boardId: number, cardId: number, toColumnId: number | null, newOrder: number | null) {
  return fetchApi(`${API_BASE}/boards/${boardId}/reorder`, {
    method: "POST",
    body: JSON.stringify({ card_id: cardId, to_column_id: toColumnId, new_order: newOrder }),
  }) as Promise<Card>;
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type BoardUpdate = {
  add_cards?: Array<{ column_id: number; title: string; details?: string }>;
  move_cards?: Array<{ card_id: number; to_column_id: number; position?: number }>;
  delete_cards?: number[];
};

export type AIChatResponse = {
  response: string;
  board_update: BoardUpdate | null;
};

export async function aiChat(message: string, userId: string = "default"): Promise<AIChatResponse> {
  return fetchApi(`${API_BASE}/ai/chat`, {
    method: "POST",
    body: JSON.stringify({ message, user_id: userId }),
  }) as Promise<AIChatResponse>;
}
