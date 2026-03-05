import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.urlopen('https://sellerverse-api.onrender.com/overview/debug-data', context=ctx)
data = json.loads(req.read())

with open('debug_out.txt', 'w', encoding='utf-8') as f:
    for u in data.get('user_summaries', []):
        f.write(f"User ID: {u['id']} | Email: {u['email']}\n")
        f.write(f"  Orders: {u['counts']['orders']}, Metrics: {u['counts']['metrics']}, Uploads: {u['counts']['uploads']}\n")
        for up in u.get('recent_uploads', []):
            f.write(f"    Upload {up['id']}: Status: {up['status']}, Rows: {up['rows']}, Err: {up['error']}\n")
        f.write("-" * 40 + "\n")
