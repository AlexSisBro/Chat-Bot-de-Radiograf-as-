from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def run_sqlite_migrations() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    statements = []
    tables = inspector.get_table_names()

    if "radiography_analyses" in tables:
        columns = {col["name"] for col in inspector.get_columns("radiography_analyses")}
        if "urgency" not in columns:
            statements.append(
                "ALTER TABLE radiography_analyses ADD COLUMN urgency VARCHAR(20) DEFAULT 'baja'"
            )
        if "structured_data" not in columns:
            statements.append("ALTER TABLE radiography_analyses ADD COLUMN structured_data TEXT")
        if "hidden" not in columns:
            # SQLite does not have a native boolean type; use INTEGER/BOOLEAN with default 0 (False)
            statements.append("ALTER TABLE radiography_analyses ADD COLUMN hidden BOOLEAN DEFAULT 0")

    if "chat_sessions" in tables:
        chat_columns = {col["name"] for col in inspector.get_columns("chat_sessions")}
        if "analysis_id" not in chat_columns:
            statements.append(
                "ALTER TABLE chat_sessions ADD COLUMN analysis_id INTEGER REFERENCES radiography_analyses(id)"
            )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
