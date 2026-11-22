# 🌆 Urban Digital Twin 

An AI-powered **Urban Digital Twin** for monitoring, predicting and simulating
**Urban Heat Island (UHI)** effects in Bhubaneswar, Odisha, India — from raw
satellite imagery to an interactive web dashboard.

## 🎥 Project Demo

[![HeatSync | SOA Ideathon 2026 | Prototype Video](https://img.youtube.com/vi/-UzBcTqjUp8/maxresdefault.jpg)](https://youtu.be/-UzBcTqjUp8)

This monorepo merges the **HeatSync** frontend (React + Vite) with
the **Urban Digital Twin** AI / GIS / ML / data pipeline (FastAPI + Python):

| Stage | Component | Output |
|-------|-----------|--------|
| **Data ingestion** | `gis-engine/` — Sentinel-2, Landsat 8/9, SRTM/Copernicus DEM, NASA POWER weather, air quality (Sentinel-5P / OpenAQ / CPCB), OSM vector layers | `data/raw/` |
| **Data processing** | `gis-engine/` — clip, NDVI, green cover, vegetation density, land cover, LST + heat classes, terrain derivatives, AQI interpolation, weather stats | `data/processed/` |
| **Feature engineering** | `gis-engine/feature_engineering/` — 100 m grid with ~90 engineered features per cell | `data/feature_engineering/training_dataset.csv` (53 802 cells) |
| **AI engine** | `ai-engine/` — leakage detection, 5-fold CV, 6-model comparison, Optuna tuning, XGBoost, ONNX export, SHAP, sensitivity analysis | `models/best_model.pkl/.onnx`, `data/outputs/` reports, `data/predictions/` maps |
| **Simulation** | `scenario-engine/` — tree planting, cool roofs, green corridors, 7 canonical scenarios | live scenario stats |
| **Backend API** | `backend/` — FastAPI serving model predictions, layers, simulations, metrics | `http://localhost:8000` |
| **Frontend dashboard** | `frontend/` — HeatSync React (Vite) dashboard: Leaflet GIS map, Chart.js analytics, intervention simulator, priority matrix | `http://localhost:5173` |
| **Database (optional)** | `database/` — PostgreSQL/PostGIS schema, migrations, artifact loader | `grid_cells`, `predictions`, `simulations` |

## 🏗️ Project structure

```
urban-digital-twin/
├── frontend/                  # HeatSync React 19 + Vite dashboard
│   ├── src/components/        #   map, charts, simulator panels, modals
│   ├── src/services/          #   live API connectors & audit engine
│   ├── src/engine/            #   physics-informed microclimate simulator
│   ├── src/data/              #   pilot dataset (Khandagiri & ITER campus)
│   └── package.json           #   npm run dev | build
├── backend/                   # FastAPI service (artifact-first)
│   ├── main.py                #   application factory
│   └── api/ schemas/ services/ middleware/ utils/ config/
├── ai-engine/                 # UHI ML pipeline (train, explain, export)
│   └── main.py                #   end-to-end training pipeline
├── gis-engine/                # Unified data pipeline (download + process)
│   ├── main.py                #   orchestrator (all datasets)
│   ├── config.py              #   all pipeline settings (env-overridable)
│   ├── extract_osm_layers.py  #   OSM layer extraction
│   ├── feature_engineering/   #   100 m grid → ML training dataset
│   └── download_* / process_* #   per-dataset stages
├── scenario-engine/           # Intervention simulation library
│   ├── engine.py
│   └── tree/ cool_roof/ green_corridor/ comparison/
├── data/
│   ├── raw/                   #   downloaded imagery + OSM layers
│   │   └── osm/ sentinel/ landsat/ dem/ weather/ aqi/
│   ├── processed/             #   NDVI, LST, terrain, AQI, weather outputs
│   ├── feature_engineering/   #   training dataset + quality reports
│   ├── intermediate/          #   staging outputs of the feature grid
│   ├── predictions/           #   predictions.csv, Predicted_LST.*, serving/
│   ├── outputs/               #   AI-engine metrics, plots, reports, logs
│   └── external/ statistics/ plots/
├── models/                    # best_model.pkl, best_model.onnx (trained)
├── database/                  # PostGIS schema, migrations, seed loader
├── deployment/                  # docker/, nginx/, env/, deploy.sh
├── docs/                      # Setup, API, workflow, deployment, HeatSync guides
├── tests/                     # pytest suite
└── scripts/                   # (reserved) one-off utility scripts
```

## 🚀 Quick start

### 1. Python side (pipeline + API)

Prerequisites: Python **3.11+**, PostgreSQL with PostGIS *(optional)*, Docker *(optional)*.

```bash
python -m venv --system-site-packages .venv          # or: make setup
source .venv/bin/activate                            # Windows: .venv\Scripts\activate
pip install -r requirements.txt                      # runtime deps
pip install -r requirements-dev.txt                  # tests / lint (optional)
cp .env.example .env                                 # adjust as needed
```

> **GDAL note (Windows):** if `rasterio`/`geopandas` fail to install, use the
> [conda-forge](https://conda-forge.org/) channel (`conda install gdal rasterio geopandas`)
> — see [docs/setup.md](docs/setup.md).

Run the pipeline (in order — each stage is resumable, `--force` to redo):

```bash
cd gis-engine && python main.py                       # download + process all data
cd gis-engine/feature_engineering && python main.py   # build the 100 m feature grid
cd ../.. && cd ai-engine && python main.py            # train, explain, export, predict
```

Start the FastAPI backend:

```bash
uvicorn backend.main:app --reload      # or: python -m backend.run
# Swagger UI:  http://localhost:8000/docs
# Health:      http://localhost:8000/api/health
```

Try it:

```bash
# Model metadata + feature schema
curl http://localhost:8000/api/prediction/model
# Predict LST for a feature row
curl -X POST http://localhost:8000/api/prediction/predict \
     -H 'Content-Type: application/json' \
     -d '{"features": {"GreenCover": 25.0, "MeanNDVI": 0.4, "TreeCount": 50}}'
# Run a scenario
curl -X POST http://localhost:8000/api/simulation/run \
     -H 'Content-Type: application/json' \
     -d '{"scenario": "increase_green_10"}'
```

### 2. Frontend side (HeatSync dashboard)

Prerequisites: Node.js **v18+**, npm **v9+**.

```bash
cd frontend
npm install
cp .env.example .env                 # VITE_* API keys (optional)

npm run dev                          # Vite dashboard  → http://localhost:5173
npm run build                        # production build → frontend/dist
```

### 3. (Optional) PostgreSQL / PostGIS

```bash
export DATABASE_URL=postgresql://admin:password@localhost:5432/urban_digital_twin
python database/migrate.py                    # apply schema
python database/seed/load_artifacts.py        # load grid + predictions + simulations
UDT_DATABASE_URL=$DATABASE_URL uvicorn backend.main:app
```

### 4. Docker

```bash
docker compose up -d --build   # backend + optional PostGIS (docker-compose.yml at repo root)
```

## 🔌 API overview

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` · `/api/health/ready` | liveness / readiness probes |
| `GET /api/data/layers` | catalogue of every produced layer (raster/vector/CSV/plot) |
| `GET /api/data/layers/{name}` | download a layer (GeoTIFF / GeoJSON / PNG / CSV) |
| `GET /api/prediction/model` · `/features` | deployed model + feature schema |
| `POST /api/prediction/predict` | live LST prediction (single row or batch) |
| `GET /api/prediction/metrics` · `/predictions` | training metrics, test predictions |
| `GET /api/prediction/heat[ /raster /preview]` | full-grid predicted LST (GeoJSON/TIF/PNG) |
| `GET /api/simulation/scenarios` | the 7 canonical intervention scenarios |
| `POST /api/simulation/run` | run a named or custom scenario live |
| `GET /api/explainability/importance` | global SHAP importance |
| `GET /api/dashboard/summary` | aggregated dashboard payload |
| `GET /api/alerts/active` | live heatwave warning payload with dual-mode citizen & analyst guidance |
| `GET /api/alerts/cap.xml` | OASIS / ITU-T CAP v1.2 XML emergency feed for NDMA / OSDMA |
| `GET /api/alerts/shelters` | verified public cooling shelters, misting stations & hospital triage units |
| `GET /api/alerts/summary` | compact alert tier, WBGT, and compound hazard status for UI headers |

Full reference: [docs/api.md](docs/api.md).

## 🧮 Key methods

- **NDVI** = (NIR − Red) / (NIR + Red)
- **LST** = (K2 / ln(K1/T_thermal + 1)) − 273.15 (Landsat Collection-2 ST_B10)
- **Slope** = arctan(√((dz/dx)² + (dz/dy)²)) (Horn 1981)
- **Indian AQI** sub-index breakpoints (CPCB) for PM2.5/PM10/NO₂/SO₂/CO/O₃
- **HeatSync microclimate** — tree canopy cooling (0.16 °C / 10%), cool roofs
  (0.28 °C / 10%), shade canopies, traffic rerouting (up to −85 AQI points),
  Demographic Equity scoring and 95% Kriging uncertainty bounds.

## 🚨 Civil Protection Alert Centre & Early Warnings (HeatX Integration)

A real-time civil protection and biophysical thermal early-warning system integrated into HeatSync, bridging raw satellite predictions with emergency action plans:

- **Biophysical Thermal Strain Indices**:
  - **Stull (2011) Wet-Bulb Temperature ($T_{\text{wb}}$)** and Natural Wet-Bulb ($T_{\text{nwb}}$)
  - **Outdoor Composite WBGT** (ACGIH / ISO 7243 energy-balance black-globe model)
  - **NWS Rothfusz Heat Index** (Apparent 'feels-like' temperature)
  - **COST 730 Simplified UTCI Proxy** (Universal Thermal Climate Index)
- **5-Tier Heat Impact Warning Tiers**: Aligned with IMD / NDMA heatwave frameworks:
  - 🟢 **Normal / Low** (`#27AE60`) — Routine monitoring; maintain baseline public hydration.
  - 🟡 **Elevated / Caution** (`#F1C40F`) — Caution advised for manual outdoor workers; hydration breaks.
  - 🟠 **High / Amber** (`#E67E22`) — District Heat Action Plan activation; mandatory shaded breaks.
  - 🔴 **Very High / Danger** (`#C0392B`) — Severe heatwave; halt non-essential afternoon outdoor work.
  - 🟣 **Extreme Danger** (`#7D3C98`) — Red alert; hospital heatstroke room mobilization.
- **Compound Multi-Hazard Engine**: Automatically flags compound heatwave + particulate pollution crises when $\text{WBGT} \ge 29.4^\circ\text{C}$ and $\text{PM}_{2.5} \ge 60\,\mu\text{g/m}^3$ (synergistic cardiovascular & respiratory collapse hazard).
- **Dual-Mode Citizen vs. Analyst Guidance**:
  - **Citizen Layman View**: Plain-language danger assessment, 5 actionable protection guidelines, vulnerable demographics, and emergency medical hotlines (108, BMC 1929, OSDMA 1070).
  - **Analyst Technical View**: Full biophysical diagnostic matrix, DISCOM electricity grid surge load %, hospital surge triage protocols (Code Green/Yellow/Orange/Red), and NDMA 2024 compliance metadata.
- **OASIS / ITU-T CAP v1.2 Protocol Feed**: Live XML feed compliant with ITU-T Recommendation X.1303 for automated syndication to NDMA Sachak, OSDMA, and IMD early warning networks (`/api/alerts/cap.xml`).
- **Cooling Shelters & Heat-Safe Spots Directory**: Geospatial database of 8 verified Bhubaneswar cooling shelters, misting transit hubs, and hospital heatstroke triage units (`/api/alerts/shelters`).
- **2D / 3D "Lite" Performance Mode Toggle**: Instant performance switch to run on lightweight 2D Leaflet rendering on memory-constrained (8 GB RAM) machines while keeping 3D WebGL optional.

## 📚 Documentation

- [Setup guide](docs/setup.md)
- [API reference](docs/api.md)
- [Pipeline workflow](docs/workflow.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Project structure](PROJECT_STRUCTURE.md)
- [Contributing](CONTRIBUTING.md)

## 🧪 Development

```bash
make test       # or: pytest tests/ -v
make lint       # or: ruff check backend scenario-engine tests
make ingest process features train serve migrate seed docker-build docker-up docker-down
```

## 📄 License

MIT (see LICENSE).
