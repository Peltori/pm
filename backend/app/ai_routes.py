from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from .database import SessionLocal, Board, Column, Card
from .schemas import ChatRequest, ChatResponse
from .services.ai import chat, test_ai, test_structured_output, _conversation_history

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_board_for_ai(db: Session) -> dict:
    """Get the board state as a dict for the AI context."""
    board = db.query(Board).order_by(Board.id.desc()).first()
    if not board:
        return {"id": None, "columns": []}
    return {
        "id": board.id,
        "columns": [
            {
                "id": c.id,
                "title": c.title,
                "cards": [
                    {
                        "id": cd.id,
                        "title": cd.title,
                        "details": cd.details,
                    }
                    for cd in sorted(c.cards, key=lambda x: x.sort_order)
                ],
            }
            for c in sorted(board.columns, key=lambda x: x.sort_order)
        ],
    }


@router.get("/ai/test")
async def ai_test():
    """Verify AI connectivity with a simple 2+2 test."""
    result = await test_ai()
    return {"result": result}


@router.get("/ai/test-structured")
async def ai_test_structured():
    """Test structured JSON output from the model."""
    result = await test_structured_output()
    return JSONResponse(content={"structured_result": result})


@router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """AI chat endpoint: respond to user message and optionally update the Kanban board."""
    # Get current board state
    board = _get_board_for_ai(db)

    # Get conversation history for this user
    history = _conversation_history.get(payload.user_id, [])

    # Get AI response
    result = await chat(board, payload.message, history, payload.user_id)

    response_text = result.get("response", "")
    board_update = result.get("board_update")

    # Apply board updates if any
    if board_update and board["id"]:
        board_id = board["id"]

        # Add cards
        if board_update.get("add_cards"):
            for add_req in board_update["add_cards"]:
                col_id = add_req.get("column_id")
                title = add_req.get("title", "")
                details = add_req.get("details", "")
                if col_id is None:
                    continue
                column = db.query(Column).filter(Column.id == col_id).first()
                if not column:
                    continue
                sort_order = column.cards[-1].sort_order + 1 if column.cards else 0
                card = Card(column_id=col_id, title=title, details=details, sort_order=sort_order)
                db.add(card)
                db.flush()

        # Move cards
        if board_update.get("move_cards"):
            for move_req in board_update["move_cards"]:
                card_id = move_req.get("card_id")
                to_column_id = move_req.get("to_column_id")
                position = move_req.get("position")
                if card_id is None or to_column_id is None:
                    continue
                card = db.query(Card).filter(Card.id == card_id).first()
                column = db.query(Column).filter(Column.id == to_column_id).first()
                if not card or not column:
                    continue
                if to_column_id != card.column_id:
                    # Remove card from old column's order
                    other_cards = (
                        db.query(Card)
                        .filter(Card.column_id == card.column_id, Card.id != card_id)
                        .order_by(Card.sort_order)
                        .all()
                    )
                    card.column_id = to_column_id
                    # Re-sort old column
                    for i, c in enumerate(other_cards):
                        c.sort_order = i
                if position is not None:
                    card.sort_order = position
                db.flush()

        # Delete cards
        if board_update.get("delete_cards"):
            for card_id in board_update["delete_cards"]:
                card = db.query(Card).filter(Card.id == card_id).first()
                if card:
                    db.delete(card)

        db.commit()

    return ChatResponse(response=response_text, board_update=board_update)
