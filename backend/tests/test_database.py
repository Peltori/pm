from app.database import (
    SessionLocal,
    User,
    Board,
    Column as ColumnModel,
    Card,
    init_db,
    seed,
)


def test_db_creates_tables():
    init_db()
    db = SessionLocal()
    users = db.query(User).all()
    assert isinstance(users, list)
    db.close()


def test_seed_creates_data():
    db = SessionLocal()
    db.query(User).delete()
    db.query(Board).delete()
    db.query(ColumnModel).delete()
    db.query(Card).delete()
    db.commit()

    seed()

    user = db.query(User).first()
    board = db.query(Board).first()
    columns = db.query(ColumnModel).all()
    cards = db.query(Card).all()

    assert user is not None
    assert board is not None
    assert len(columns) == 5
    assert len(cards) == 8
    db.close()
