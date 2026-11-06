import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys
import os

DB_HOST = os.getenv("PG_HOST", "localhost")
DB_PORT = int(os.getenv("PG_PORT", "5432"))
DB_USER = os.getenv("PG_USER", "postgres")
DB_PASSWORD = os.getenv("PG_PASSWORD", "postgres")
TARGET_DB = "milk_distributor_db"

def init_postgres(password=None):
    pwd = password or DB_PASSWORD
    print(f"Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} as user '{DB_USER}'...")
    
    # 1. Connect to default postgres DB to ensure TARGET_DB exists
    try:
        conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=pwd, dbname="postgres")
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (TARGET_DB,))
        exists = cur.fetchone()
        if not exists:
            print(f"Creating database '{TARGET_DB}'...")
            cur.execute(f"CREATE DATABASE {TARGET_DB};")
        else:
            print(f"Database '{TARGET_DB}' already exists.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Failed to connect to default database: {e}")
        return False

    # 2. Connect to TARGET_DB and apply schema
    try:
        conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=pwd, dbname=TARGET_DB)
        cur = conn.cursor()
        
        # Read schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), "..", "supabase", "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()
            
        # Strip out Supabase specific commands if any
        clean_lines = []
        for line in sql_script.splitlines():
            if "ALTER PUBLICATION supabase_realtime" in line:
                continue
            clean_lines.append(line)
        cleaned_sql = "\n".join(clean_lines)

        print("Executing schema script...")
        cur.execute(cleaned_sql)
        conn.commit()
        cur.close()
        conn.close()
        print("Schema successfully applied to local PostgreSQL!")
        return True
    except Exception as e:
        print(f"Error applying schema: {e}")
        return False

if __name__ == "__main__":
    pwd = sys.argv[1] if len(sys.argv) > 1 else None
    success = init_postgres(pwd)
    sys.exit(0 if success else 1)
