from sqlalchemy.orm import Session

from ..database import Board, Column, Card


def get_or_create_board(db: Session, user_id: int) -> Board:
    board = db.query(Board).filter(Board.user_id == user_id).first()
    if not board:
        board = Board(user_id=user_id)
        db.add(board)
        db.commit()
        db.refresh(board)
    return board


def get_board_with_cards(db: Session, board_id: int) -> Board | None:
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        return None
    return board


def add_column(db: Session, board_id: int, title: str, sort_order: int) -> Column:
    column = Column(board_id=board_id, title=title, sort_order=sort_order)
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


def update_column(db: Session, column_id: int, title: str, sort_order: int) -> Column | None:
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        return None
    column.title = title
    column.sort_order = sort_order
    db.commit()
    db.refresh(column)
    return column


def delete_column(db: Session, column_id: int) -> bool:
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        return False
    db.delete(column)
    db.commit()
    return True


def add_card(db: Session, column_id: int, title: str, details: str) -> Card:
    column = db.query(Column).filter(Column.id == column_id).first()
    if not column:
        return None  # type: ignore
    sort_order = column.cards[-1].sort_order + 1 if column.cards else 0
    card = Card(column_id=column_id, title=title, details=details, sort_order=sort_order)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def update_card(db: Session, card_id: int, title: str | None, details: str | None, sort_order: int | None) -> Card | None:
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        return None
    if title is not None:
        card.title = title
    if details is not None:
        card.details = details
    if sort_order is not None:
        card.sort_order = sort_order
    db.commit()
    db.refresh(card)
    return card


def delete_card(db: Session, card_id: int) -> bool:
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        return False
    db.delete(card)
    db.commit()
    return True


def reorder_card(db: Session, card_id: int, to_column_id: int | None, new_order: int | None) -> Card | None:
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        return None

    if to_column_id is not None and to_column_id != card.column_id:
        card.column_id = to_column_id

    if new_order is not None:
        card.sort_order = new_order

    db.commit()
    db.refresh(card)
    return card
