import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import config
from app.routers import events, earthquakes, wildfires, volcanoes
from app.services import db
from app.services.usgs import fetch_earthquakes
from app.services.firms import fetch_wildfires
from app.services.volcanoes import fetch_volcanoes

async def sync_all_feeds():
    print("Background Sync: Starting data fetch from all feeds...")
    
    # 1. Earthquakes
    try:
        print("Background Sync: Fetching Earthquakes from USGS...")
        quakes = await fetch_earthquakes(days=30, limit=1000)
        db.save_events(quakes)
        print(f"Background Sync: Successfully synced {len(quakes)} earthquakes.")
    except Exception as e:
        print(f"Background Sync Error [Earthquakes]: {e}")
        
    # 2. Wildfires
    try:
        print("Background Sync: Fetching Wildfires from NASA FIRMS...")
        # Since NASA FIRMS world feed allows max 2 days:
        fires = await fetch_wildfires(days=2, limit=1000)
        db.save_events(fires)
        print(f"Background Sync: Successfully synced {len(fires)} wildfires.")
    except Exception as e:
        print(f"Background Sync Error [Wildfires]: {e}")

    # 3. Volcanoes
    try:
        print("Background Sync: Fetching Volcanoes from USGS Volcanoes...")
        volcs = await fetch_volcanoes()
        db.save_events(volcs)
        print(f"Background Sync: Successfully synced {len(volcs)} volcanoes.")
    except Exception as e:
        print(f"Background Sync Error [Volcanoes]: {e}")

async def background_sync_loop():
    # Immediate initial sync on startup
    await sync_all_feeds()
    
    while True:
        try:
            await asyncio.sleep(300)  # Wait 5 minutes (300 seconds)
            await sync_all_feeds()
        except asyncio.CancelledError:
            print("Background Sync: Stopping worker...")
            break
        except Exception as e:
            print(f"Background Sync Loop Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    db.init_db()
    
    # Start background task worker
    sync_task = asyncio.create_task(background_sync_loop())
    
    yield
    
    # Cancel task on shutdown
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="DisasterWatch API",
    description="Real-time disaster monitoring API with SQLite caching and background sync",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(earthquakes.router)
app.include_router(wildfires.router)
app.include_router(volcanoes.router)

@app.get("/")
async def root():
    return {"status": "online", "app": "DisasterWatch API with SQLite Cache"}