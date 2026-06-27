from __future__ import annotations

import os
from pathlib import Path
from datetime import datetime, timezone

import bcrypt
from sqlalchemy import Column as SQLAlchemyColumn
from sqlalchemy import ForeignKey, Integer, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, relationship, sessionmaker

DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///kanban.db")
engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


def load_env_file():
    """Load .env from one of several candidate locations."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent.parent.parent / ".env",
    ]
    for env_path in candidates:
        if env_path.exists():
            from dotenv import load_dotenv
            load_dotenv(str(env_path))
            break


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def get_db():
    """Shared database session generator for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = SQLAlchemyColumn(Integer, primary_key=True)
    username: Mapped[str] = SQLAlchemyColumn(String, unique=True, nullable=False)
    password_hash: Mapped[str] = SQLAlchemyColumn(String, nullable=False)

    boards = relationship("Board", back_populates="user")


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[int] = SQLAlchemyColumn(Integer, primary_key=True)
    user_id: Mapped[int] = SQLAlchemyColumn(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[str] = SQLAlchemyColumn(String, nullable=False)
    updated_at: Mapped[str] = SQLAlchemyColumn(String, nullable=False)

    user = relationship("User", back_populates="boards")
    columns = relationship("Column", back_populates="board", cascade="all, delete-orphan")



class Column(Base):
    __tablename__ = "columns"

    id: Mapped[int] = SQLAlchemyColumn(Integer, primary_key=True)
    board_id: Mapped[int] = SQLAlchemyColumn(Integer, ForeignKey("boards.id"), nullable=False)
    title: Mapped[str] = SQLAlchemyColumn(String, nullable=False)
    sort_order: Mapped[int] = SQLAlchemyColumn(Integer, nullable=False)

    board = relationship("Board", back_populates="columns")
    cards = relationship("Card", back_populates="column", cascade="all, delete-orphan")


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = SQLAlchemyColumn(Integer, primary_key=True)
    column_id: Mapped[int] = SQLAlchemyColumn(Integer, ForeignKey("columns.id"), nullable=False)
    title: Mapped[str] = SQLAlchemyColumn(String, nullable=False)
    details: Mapped[str] = SQLAlchemyColumn(String, nullable=False, default="")
    sort_order: Mapped[int] = SQLAlchemyColumn(Integer, nullable=False)

    column = relationship("Column", back_populates="cards")


def init_db():
    Base.metadata.create_all(bind=engine)


def seed():
    if SessionLocal().query(User).first():
        return
    now = datetime.now(timezone.utc).isoformat()
    user = User(username="user", password_hash=hash_password("password"))
    board = Board(created_at=now, updated_at=now)
    columns_data = [
        ("Backlog", 0),
        ("Discovery", 1),
        ("In Progress", 2),
        ("Review", 3),
        ("Done", 4),
    ]
    cards_data = {
        "Backlog": [("Align roadmap themes", "Draft quarterly themes with impact statements and metrics."), ("Gather customer signals", "Review support tags, sales notes, and churn feedback.")],
        "Discovery": [("Prototype analytics view", "Sketch initial dashboard layout and key drill-downs.")],
        "In Progress": [("Refine status language", "Standardize column labels and tone across the board."), ("Design card layout", "Add hierarchy and spacing for scanning dense lists.")],
        "Review": [("QA micro-interactions", "Verify hover, focus, and loading states.")],
        "Done": [("Ship marketing page", "Final copy approved and asset pack delivered."), ("Close onboarding sprint", "Document release notes and share internally.")],
    }
    db = SessionLocal()
    db.add(user)
    db.flush()
    board.user = user
    db.add(board)
    db.flush()
    for col_title, col_order in columns_data:
        col = Column(board_id=board.id, title=col_title, sort_order=col_order)
        board.columns.append(col)
        for card_title, card_details in cards_data[col_title]:
            card = Card(column_id=col.id, title=card_title, details=card_details, sort_order=0)
            col.cards.append(card)
    db.commit()
