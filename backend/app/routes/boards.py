from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal, Board, Column, Card
from ..schemas import ColumnCreate, ColumnUpdate, CardCreate, CardUpdate, ReorderRequest
from ..services.board_service import (
    get_or_create_board,
    get_board_with_cards,
    add_column,
    update_column,
    delete_column,
    add_card,
    update_card,
    delete_card,
    reorder_card,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter()


def _ensure_board(db: Session) -> Board:
    board = db.query(Board).order_by(Board.id.desc()).first()
    if not board:
        board = get_or_create_board(db, user_id=1)
    return board


def _board_response(db: Session, board: Board) -> dict:
    return {
        "id": board.id,
        "user_id": board.user_id,
        "created_at": board.created_at,
        "updated_at": board.updated_at,
        "columns": [
            {
                "id": c.id,
                "board_id": c.board_id,
                "title": c.title,
                "sort_order": c.sort_order,
                "cards": [
                    {
                        "id": cd.id,
                        "column_id": cd.column_id,
                        "title": cd.title,
                        "details": cd.details,
                        "sort_order": cd.sort_order,
                    }
                    for cd in sorted(c.cards, key=lambda x: x.sort_order)
                ],
            }
            for c in sorted(board.columns, key=lambda x: x.sort_order)
        ],
    }


@router.get("/boards/{board_id}", response_model=dict)
def get_board(board_id: int, db: Session = Depends(get_db)):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return _board_response(db, board)


@router.post("/boards/{board_id}/columns", response_model=dict)
def add_column_to_board(
    board_id: int,
    payload: ColumnCreate,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    column = add_column(db, board_id, payload.title, payload.sort_order)
    return {"id": column.id, "board_id": column.board_id, "title": column.title, "sort_order": column.sort_order}


@router.put("/boards/{board_id}/columns/{column_id}", response_model=dict)
def update_column_in_board(
    board_id: int,
    column_id: int,
    payload: ColumnUpdate,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    column = update_column(db, column_id, payload.title, payload.sort_order)
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    return {"id": column.id, "board_id": column.board_id, "title": column.title, "sort_order": column.sort_order}


@router.delete("/boards/{board_id}/columns/{column_id}", response_model=dict)
def delete_column_from_board(
    board_id: int,
    column_id: int,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    success = delete_column(db, column_id)
    if not success:
        raise HTTPException(status_code=404, detail="Column not found")
    return {"status": "deleted", "column_id": column_id}


@router.post("/boards/{board_id}/cards", response_model=dict)
def add_card_to_board(
    board_id: int,
    payload: CardCreate,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    column = db.query(Column).filter(Column.id == payload.sort_order).first()
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    card = add_card(db, column.id, payload.title, payload.details, payload.sort_order)
    return {
        "id": card.id,
        "column_id": card.column_id,
        "title": card.title,
        "details": card.details,
        "sort_order": card.sort_order,
    }


@router.put("/boards/{board_id}/cards/{card_id}", response_model=dict)
def update_card_in_board(
    board_id: int,
    card_id: int,
    payload: CardUpdate,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    card = update_card(db, card_id, payload.title, payload.details, payload.sort_order)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return {
        "id": card.id,
        "column_id": card.column_id,
        "title": card.title,
        "details": card.details,
        "sort_order": card.sort_order,
    }


@router.delete("/boards/{board_id}/cards/{card_id}", response_model=dict)
def delete_card_from_board(
    board_id: int,
    card_id: int,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    success = delete_card(db, card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"status": "deleted", "card_id": card_id}


@router.post("/boards/{board_id}/reorder", response_model=dict)
def reorder_card_in_board(
    board_id: int,
    payload: ReorderRequest,
    db: Session = Depends(get_db),
):
    board = get_board_with_cards(db, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if payload.to_column_id is not None:
        column = db.query(Column).filter(Column.id == payload.to_column_id).first()
        if not column:
            raise HTTPException(status_code=404, detail="Target column not found")
    card = reorder_card(db, payload.card_id, payload.to_column_id, payload.new_order)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return {
        "id": card.id,
        "column_id": card.column_id,
        "title": card.title,
        "details": card.details,
        "sort_order": card.sort_order,
    }
