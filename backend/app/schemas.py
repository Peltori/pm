from pydantic import BaseModel


class ColumnCreate(BaseModel):
    title: str
    sort_order: int


class ColumnUpdate(BaseModel):
    title: str
    sort_order: int


class CardCreate(BaseModel):
    title: str
    details: str = ""
    sort_order: int


class CardUpdate(BaseModel):
    title: str | None = None
    details: str | None = None
    sort_order: int | None = None


class ReorderRequest(BaseModel):
    card_id: int
    to_column_id: int | None = None
    new_order: int | None = None
