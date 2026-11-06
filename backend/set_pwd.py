import psycopg2

try:
    conn = psycopg2.connect(host='localhost', port=5432, user='postgres', dbname='postgres', connect_timeout=3)
    print("SUCCESS_CONNECTED")
    cur = conn.cursor()
    cur.execute("ALTER USER postgres WITH PASSWORD 'root';")
    conn.commit()
    print("PASSWORD_SET_TO_ROOT_SUCCESS")
    cur.close()
    conn.close()
except Exception as e:
    print("ERROR:", e)
