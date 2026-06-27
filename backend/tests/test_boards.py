import pytest
from fastapi.testclient import TestClient

from app.database import Base, User, Board, Column, Card, get_db
from app.main import app
from .conftest import TestingSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)


def _create_test_data(db):
    user = db.query(User).first()
    board = Board(user_id=user.id, created_at="2024-01-01T00:00:00Z", updated_at="2024-01-01T00:00:00Z")
    db.add(board)
    db.flush()
    col1 = Column(board_id=board.id, title="Backlog", sort_order=0)
    col2 = Column(board_id=board.id, title="In Progress", sort_order=1)
    db.add_all([col1, col2])
    db.flush()
    card1 = Card(column_id=col1.id, title="Card 1", details="Details 1", sort_order=0)
    card2 = Card(column_id=col1.id, title="Card 2", details="Details 2", sort_order=1)
    card3 = Card(column_id=col2.id, title="Card 3", details="Details 3", sort_order=0)
    db.add_all([card1, card2, card3])
    db.commit()
    return board


def test_get_board(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    db.close()

    r = client.get(f"/api/boards/{board_id}")
    assert r.status_code == 200
    data = r.json()
    assert len(data["columns"]) == 2
    assert data["columns"][0]["title"] == "Backlog"
    assert len(data["columns"][0]["cards"]) == 2


def test_get_board_not_found(client):
    r = client.get("/api/boards/999")
    assert r.status_code == 404


def test_add_column(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    db.close()

    r = client.post(f"/api/boards/{board_id}/columns", json={"title": "Done", "sort_order": 2})
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Done"
    assert data["sort_order"] == 2


def test_add_column_board_not_found(client):
    r = client.post("/api/boards/999/columns", json={"title": "Done", "sort_order": 2})
    assert r.status_code == 404


def test_update_column(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    col = db.query(Column).first()
    col_id = col.id
    db.close()

    r = client.put(f"/api/boards/{board_id}/columns/{col_id}", json={"title": "Todo", "sort_order": 0})
    assert r.status_code == 200
    assert r.json()["title"] == "Todo"


def test_update_column_not_found(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    db.close()

    r = client.put(f"/api/boards/{board_id}/columns/999", json={"title": "Todo", "sort_order": 0})
    assert r.status_code == 404


def test_delete_column(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    col = db.query(Column).first()
    col_id = col.id
    db.close()

    r = client.delete(f"/api/boards/{board_id}/columns/{col_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "deleted"


def test_delete_column_not_found(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    db.close()

    r = client.delete(f"/api/boards/{board_id}/columns/999")
    assert r.status_code == 404


def test_add_card(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    col = db.query(Column).filter(Column.title == "Backlog").first()
    col_id = col.id
    db.close()

    r = client.post(f"/api/boards/{board_id}/cards", json={"column_id": col_id, "title": "New Card"})
    assert r.status_code == 200
    assert r.json()["title"] == "New Card"


def test_add_card_board_not_found(client):
    r = client.post("/api/boards/999/cards", json={"column_id": 1, "title": "New Card"})
    assert r.status_code == 404


def test_update_card(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    card = db.query(Card).first()
    card_id = card.id
    db.close()

    r = client.put(f"/api/boards/{board_id}/cards/{card_id}", json={"title": "Updated", "details": "Updated details", "sort_order": 0})
    assert r.status_code == 200
    assert r.json()["title"] == "Updated"


def test_update_card_not_found(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    db.close()

    r = client.put(f"/api/boards/{board_id}/cards/999", json={"title": "Updated", "details": "Updated", "sort_order": 0})
    assert r.status_code == 404


def test_delete_card(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    card = db.query(Card).first()
    card_id = card.id
    db.close()

    r = client.delete(f"/api/boards/{board_id}/cards/{card_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "deleted"


def test_delete_card_not_found(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    db.close()

    r = client.delete(f"/api/boards/{board_id}/cards/999")
    assert r.status_code == 404


def test_reorder_card_same_column(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    card = db.query(Card).first()
    card_id = card.id
    db.close()

    r = client.post(f"/api/boards/{board_id}/reorder", json={"card_id": card_id, "to_column_id": None, "new_order": 1})
    assert r.status_code == 200
    assert r.json()["sort_order"] == 1


def test_reorder_card_different_column(client):
    db = TestingSessionLocal()
    board = _create_test_data(db)
    board_id = board.id
    col1 = db.query(Column).filter(Column.board_id == board.id, Column.title == "Backlog").first()
    col2 = db.query(Column).filter(Column.board_id == board.id, Column.title == "In Progress").first()
    card = db.query(Card).filter(Card.column_id == col1.id).first()
    card_id = card.id
    col2_id = col2.id
    db.close()

    r = client.post(f"/api/boards/{board_id}/reorder", json={"card_id": card_id, "to_column_id": col2_id, "new_order": 0})
    assert r.status_code == 200
    assert r.json()["column_id"] == col2_id
    assert r.json()["sort_order"] == 0


def test_reorder_card_not_found(client):
    r = client.post("/api/boards/1/reorder", json={"card_id": 999, "to_column_id": None, "new_order": 0})
    assert r.status_code == 404
