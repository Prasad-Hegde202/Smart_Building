import sqlite3

DB_NAME = "energy_data.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS energy_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        aggregate REAL,
        identified REAL,
        background REAL,
        cost REAL
    )
    """)

    conn.commit()
    conn.close()

def save_energy(timestamp, aggregate, identified, background, cost):

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO energy_history
    (timestamp, aggregate, identified, background, cost)
    VALUES (?, ?, ?, ?, ?)
    """, (timestamp, aggregate, identified, background, cost))

    conn.commit()
    conn.close()