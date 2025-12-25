from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# ClickHouse connection
CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "139.144.16.45")
CLICKHOUSE_PORT = os.getenv("CLICKHOUSE_PORT", "9000")
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "Texaco2671!")
CLICKHOUSE_DATABASE = os.getenv("CLICKHOUSE_DATABASE", "analytics")

# Correct SQLAlchemy URL using native protocol
SQLALCHEMY_DATABASE_URL = (
    f"clickhouse+native://{CLICKHOUSE_USER}:{CLICKHOUSE_PASSWORD}@{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}/{CLICKHOUSE_DATABASE}"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()