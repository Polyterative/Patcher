#!/usr/bin/env python3
"""Print every GRANT / REVOKE / ALTER DEFAULT PRIVILEGES / ALTER ... OWNER TO statement
from supabase/migrations, in migration order, as one SQL script on stdout.

Drill-only: a schema-only dump carries no grants, so scratch-clusters.sh layers this on
the "hosted-like" cluster to approximate hosted's real privilege posture (the api_v1
lockdown), which the grants replay audit requires. Statements for objects later dropped
fail harmlessly (the harness runs it without ON_ERROR_STOP)."""
import glob
import os
import re

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'supabase', 'migrations')
PRIV = re.compile(r'(?i)(grant|revoke|alter default privileges|alter (view|table|function|sequence|schema) \S+.* owner to)\b')
for path in sorted(glob.glob(os.path.join(root, '*.sql'))):
    sql = re.sub(r'--[^\n]*', '', open(path, encoding='utf-8').read())
    sql = re.sub(r'\$(\w*)\$.*?\$\1\$', '', sql, flags=re.S)  # drop function bodies
    for stmt in sql.split(';'):
        flat = ' '.join(stmt.split())
        if PRIV.match(flat):
            print(f'-- {os.path.basename(path)}\n{flat};')
