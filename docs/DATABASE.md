# Database Schema

## Users

| Column       | Type      | Constraints              |
|--------------|-----------|--------------------------|
| id           | INTEGER   | PK, AUTOINCREMENT        |
| username     | TEXT      | UNIQUE, NOT NULL         |
| password_hash| TEXT      | NOT NULL                 |

## Boards

| Column       | Type      | Constraints              |
|--------------|-----------|--------------------------|
| id           | INTEGER   | PK, AUTOINCREMENT        |
| user_id      | INTEGER   | FK -> users.id, NOT NULL |
| created_at   | TEXT      | NOT NULL (ISO 8601)      |
| updated_at   | TEXT      | NOT NULL (ISO 8601)      |

## Columns

| Column       | Type      | Constraints              |
|--------------|-----------|--------------------------|
| id           | INTEGER   | PK, AUTOINCREMENT        |
| board_id     | INTEGER   | FK -> boards.id, NOT NULL |
| title        | TEXT      | NOT NULL                 |
| sort_order   | INTEGER   | NOT NULL                 |

## Cards

| Column       | Type      | Constraints              |
|--------------|-----------|--------------------------|
| id           | INTEGER   | PK, AUTOINCREMENT        |
| column_id    | INTEGER   | FK -> columns.id, NOT NULL |
| title        | TEXT      | NOT NULL                 |
| details      | TEXT      | NOT NULL (default: "")   |
| sort_order   | INTEGER   | NOT NULL                 |

## Notes

- For the MVP there is only 1 board per user. A `user_id` in boards supports multi-user later.
- `sort_order` is used to determine display order of columns and cards.
- All timestamps are stored as ISO 8601 strings.
