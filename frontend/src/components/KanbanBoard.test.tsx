import { screen, render, waitFor, fireEvent } from "@testing-library/react";
import { KanbanBoard } from "./KanbanBoard";

const mockBoard = {
  id: 1,
  columns: [
    { id: 1, board_id: 1, title: "Backlog", sort_order: 0, cards: [{ id: 1, column_id: 1, title: "Card 1", details: "D1", sort_order: 0 }] },
    { id: 2, board_id: 1, title: "In Progress", sort_order: 1, cards: [{ id: 2, column_id: 2, title: "Card 2", details: "D2", sort_order: 0 }] },
    { id: 3, board_id: 1, title: "Done", sort_order: 2, cards: [] },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setupBoard() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockBoard),
  });
  render(<KanbanBoard />);
}

it("renders columns after loading board", async () => {
  setupBoard();
  await waitFor(() => {
    expect(screen.getByDisplayValue("Backlog")).toBeInTheDocument();
  });
});

it("renders cards from board", async () => {
  setupBoard();
  await waitFor(() => {
    expect(screen.getByText("Card 1")).toBeInTheDocument();
  });
});

it("shows loading state initially", () => {
  render(<KanbanBoard />);
  expect(screen.getByText("Loading board...")).toBeInTheDocument();
});
