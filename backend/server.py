from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
import uvicorn
from datetime import date, datetime

app = FastAPI(title="Nikhil Milk Dairy ERP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_HOST = os.getenv("PG_HOST", "localhost")
DB_PORT = int(os.getenv("PG_PORT", "5432"))
DB_USER = os.getenv("PG_USER", "postgres")
DB_PASSWORD = os.getenv("PG_PASSWORD", "root")
DB_NAME = "milk_distributor_db"

def get_db():
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME,
        cursor_factory=RealDictCursor
    )
    return conn

# Health check
@app.get("/api/health")
def health_check():
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT count(*) as ret_count FROM retailers;")
        ret_count = cur.fetchone()["ret_count"]
        cur.close()
        conn.close()
        return {"status": "connected", "database": DB_NAME, "retailers_count": ret_count}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# Save entire ERP State to PostgreSQL (Dual Persistence)
@app.post("/api/sync")
async def sync_erp_state(req: Request):
    data = await req.json()
    if not data:
        raise HTTPException(status_code=400, detail="Empty data")
    
    conn = get_db()
    cur = conn.cursor()
    try:
        # Save products if present
        if "prod" in data:
            for p in data["prod"]:
                cur.execute("""
                    INSERT INTO products (id, brand, name, name_mr, pack_size, rate, pouches_per_crate)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET rate = EXCLUDED.rate, pouches_per_crate = EXCLUDED.pouches_per_crate, updated_at = NOW();
                """, (p["id"], p["brand"], p["name"], p.get("mr", p["name"]), p.get("packSize", "500ml"), p["rate"], p.get("cap", 12)))

        # Save retailers if present
        if "ret" in data:
            for r in data["ret"]:
                cur.execute("""
                    INSERT INTO retailers (id, name, shop_name, phone, route, opening_balance)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, opening_balance = EXCLUDED.opening_balance, updated_at = NOW();
                """, (r["id"], r["name"], r.get("shopName", r["name"]), r.get("mob", "9822000000"), r.get("route", "Pune"), r.get("prevOut", 0)))

        # Save settings
        if "cfg" in data:
            cfg = data["cfg"]
            cur.execute("""
                INSERT INTO system_settings (id, distributor_name, cut_off_time)
                VALUES ('global', %s, %s)
                ON CONFLICT (id) DO UPDATE SET distributor_name = EXCLUDED.distributor_name, cut_off_time = EXCLUDED.cut_off_time, updated_at = NOW();
            """, (cfg.get("biz", "Nikhil Milk Dairy"), cfg.get("cut", "16:00") + ":00" if len(cfg.get("cut", "16:00")) == 5 else cfg.get("cut", "16:00:00")))

        conn.commit()
        cur.close()
        conn.close()
        return {"status": "synced_successfully", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=str(e))

# Full Database Backup Download
@app.get("/api/backup")
def get_full_backup():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products ORDER BY display_order ASC;")
    prod = cur.fetchall()
    cur.execute("SELECT * FROM retailers ORDER BY id ASC;")
    ret = cur.fetchall()
    cur.execute("SELECT * FROM system_settings WHERE id = 'global';")
    cfg = cur.fetchone()
    cur.close()
    conn.close()

    def serialize_helper(obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return float(obj)

    backup_payload = {
        "version": "v2_postgresql",
        "exported_at": datetime.now().isoformat(),
        "database": DB_NAME,
        "products": prod,
        "retailers": ret,
        "settings": cfg
    }
    return JSONResponse(content=json.loads(json.dumps(backup_payload, default=serialize_helper)))

# Serve Frontend static directory directly on http://localhost:8000
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
