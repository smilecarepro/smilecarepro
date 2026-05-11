from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import os

import os

# Persistent storage for limiter (Use Redis if available in production)
LIMITER_DB_URI = os.getenv("REDIS_URL", "memory://")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000 per day", "200 per hour"],
    storage_uri=LIMITER_DB_URI,
    strategy="fixed-window", # Recommended for production
)
