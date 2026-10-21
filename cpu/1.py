import sqlite3
import time
import random
import requests
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

DB_FILE = "cpu_database.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    create_sql = """
    CREATE TABLE IF NOT EXISTS cpu_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cpu_model TEXT UNIQUE NOT NULL,
        series TEXT,
        architecture TEXT,
        cores INTEGER,
        threads INTEGER,
        base_freq REAL,
        boost_freq REAL,
        tdp INTEGER,
        pcie_version TEXT,
        pcie_lanes INTEGER,
        cache_l3 REAL,
        memory_type TEXT,
        max_memory INTEGER,
        socket TEXT,
        chipset TEXT,
        release_year INTEGER,
        hyper_threading BOOLEAN,
        igpu TEXT,
        manufacturing INTEGER
    );
    """
    cur.execute(create_sql)
    # 给高频查询字段建立索引，加快筛选
    cur.execute("CREATE INDEX IF NOT EXISTS idx_socket ON cpu_info(socket);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_series ON cpu_info(series);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_architecture ON cpu_info(architecture);")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
