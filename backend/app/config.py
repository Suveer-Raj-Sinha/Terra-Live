import os
from dotenv import load_dotenv

load_dotenv()

USGS_BASE_URL = os.getenv("USGS_BASE_URL", "https://earthquake.usgs.gov/fdsnws/event/1")
NASA_FIRMS_KEY = os.getenv("NASA_FIRMS_KEY", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
DEBUG = os.getenv("DEBUG", "True") == "True"