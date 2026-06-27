import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AIChatSidebar } from "./AIChatSidebar";
import { aiChat } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  aiChat: vi.fn(),
}));

const mockOnBoardUpdate = vi.fn();
const mockOnClose = vi.fn();

describe("AIChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask the AI/i)).toBeInTheDocument();
  });

  it("shows empty state message", () => {
    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    expect(
      screen.getByText(/Ask me to add, move, or organize cards/i)
    ).toBeInTheDocument();
  });

  it("sends message and displays AI response", async () => {
    const { aiChat: mockAiChat } = await import("@/lib/api");
    mockAiChat.mockResolvedValue({
      response: "I've added the task to Backlog.",
      board_update: null,
    });

    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText(/Ask the AI/i);
    fireEvent.change(input, { target: { value: "Add a task to Backlog" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(mockAiChat).toHaveBeenCalledWith("Add a task to Backlog", "default");
    });

    await waitFor(() => {
      expect(screen.getByText("I've added the task to Backlog.")).toBeInTheDocument();
    });
  });

  it("shows loading indicator while waiting for response", async () => {
    const { aiChat: mockAiChat } = await import("@/lib/api");
    const promise = new Promise((resolve) =>
      setTimeout(() =>
        resolve({
          response: "Done!",
          board_update: null,
        }),
        100
      )
    );
    mockAiChat.mockReturnValue(promise);

    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText(/Ask the AI/i);
    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(screen.getByText("...")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Done!")).toBeInTheDocument();
    });
  });

  it("calls onBoardUpdate when board update is received", async () => {
    const { aiChat: mockAiChat } = await import("@/lib/api");
    mockAiChat.mockResolvedValue({
      response: "Task added.",
      board_update: {
        add_cards: [{ column_id: 1, title: "New Task", details: "" }],
      },
    });

    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText(/Ask the AI/i);
    fireEvent.change(input, { target: { value: "Add task" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(mockOnBoardUpdate).toHaveBeenCalledWith({
        add_cards: [{ column_id: 1, title: "New Task", details: "" }],
      });
    });
  });

  it("handles API errors gracefully", async () => {
    const { aiChat: mockAiChat } = await import("@/lib/api");
    mockAiChat.mockRejectedValue(new Error("API Error"));

    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText(/Ask the AI/i);
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.click(screen.getByText("Send"));

    await waitFor(() => {
      expect(
        screen.getByText("Sorry, something went wrong. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("closes when close button is clicked", () => {
    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText("Close sidebar");
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("sends message on Enter key", async () => {
    const { aiChat: mockAiChat } = await import("@/lib/api");
    mockAiChat.mockResolvedValue({
      response: "OK",
      board_update: null,
    });

    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText(/Ask the AI/i);
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockAiChat).toHaveBeenCalledWith("Test", "default");
    });
  });

  it("disables send button when input is empty", () => {
    render(
      <AIChatSidebar
        onBoardUpdate={mockOnBoardUpdate}
        onClose={mockOnClose}
      />
    );

    const sendButton = screen.getByText("Send");
    expect(sendButton).toBeDisabled();
  });
});
