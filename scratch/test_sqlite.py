import sqlite3
conn = sqlite3.connect(':memory:')
conn.execute('CREATE TABLE t (a REAL)')
conn.execute('INSERT INTO t VALUES ("")')
print("Is '' > 0 ?", conn.execute('SELECT a > 0 FROM t').fetchone()[0])
