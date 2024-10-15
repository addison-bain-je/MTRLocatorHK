from app import app
import os
from flask import send_from_directory

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
