import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, User, Board, Column, Card

TEST_DB_URL = "sqlite:///test_shared.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Create tables and seed a user/board before each test, clean up after."""
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()
    try:
        db.query(User).delete()
        db.query(Board).delete()
        db.query(Column).delete()
        db.query(Card).delete()
        db.commit()

        user = User(username="user", password_hash="password")
        db.add(user)
        db.flush()

        board = Board(user_id=user.id, created_at="2024-01-01T00:00:00Z", updated_at="2024-01-01T00:00:00Z")
        db.add(board)
        db.flush()

        for title, order in [("Backlog", 0), ("In Progress", 1), ("Done", 2)]:
            col = Column(board_id=board.id, title=title, sort_order=order)
            db.add(col)
        db.flush()
        db.commit()
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
