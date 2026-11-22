"""Pydantic request / response schemas for the Urban Digital Twin API."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------- #
# Health
# ---------------------------------------------------------------------- #
class HealthStatus(BaseModel):
    status: str
    version: str
    app: str


class ArtifactStatus(BaseModel):
    name: str
    path: str
    exists: bool


class Readiness(BaseModel):
    status: str
    model_ready: bool
    missing_artifacts: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------- #
# Data catalogue
# ---------------------------------------------------------------------- #
class LayerInfo(BaseModel):
    name: str
    title: str
    type: str
    category: str
    path: str
    url: str
    size_bytes: int | None = None
    modified_at: float | None = None


class LayerList(BaseModel):
    count: int
    categories: dict[str, int]
    layers: list[LayerInfo]


# ---------------------------------------------------------------------- #
# Prediction
# ---------------------------------------------------------------------- #
class PredictRequest(BaseModel):
    """One or more feature rows.

    ``features`` is a single row; ``batch`` is a list of rows. Both are
    optional but at least one must be supplied.
    """

    features: dict[str, float | int | str | bool] | None = None
    batch: list[dict[str, float | int | str | bool]] | None = None


class PredictionResult(BaseModel):
    predicted_lst_c: float = Field(description="Predicted land surface temperature in °C")
    grid_id: str | None = Field(default=None, description="Grid cell identifier (if supplied)")
    uhi_class: str | None = Field(
        default=None,
        description="Heat class label from the project's fixed breaks (visualization threshold)",
    )


class PredictResponse(BaseModel):
    count: int
    model: str
    predictions: list[PredictionResult]


class ModelInfo(BaseModel):
    model: str
    n_features: int
    features: list[str]


# ---------------------------------------------------------------------- #
# Simulation
# ---------------------------------------------------------------------- #
class SimulationRunRequest(BaseModel):
    """Run a named scenario, or supply a custom perturbation set.

    ``perturbations`` maps feature name -> [kind, value] where kind is one of
    ``add`` (feature += value), ``mul`` (feature *= value), ``min``
    (feature = min(feature, value)) or ``max`` (feature = max(feature, value)).

    ``area_mode`` selects the spatial extent of the intervention:
    - city: Apply to entire city (default, backwards-compatible)
    - polygon: User-drawn polygon (requires area_params.coords)
    - neighborhood: Predefined neighborhood (requires area_params.name)
    - radius: Circular area around a point (requires area_params.center_lon, center_lat, radius_m)
    - cells: Direct cell selection (requires area_params.cell_ids)
    """

    scenario: str | None = None
    perturbations: dict[str, list[str | float]] | None = None
    area_mode: str = "city"
    area_params: dict | None = None


class SimulationResult(BaseModel):
    scenario: str
    description: str = ""
    n_cells: int
    baseline_lst: float
    mean_predicted_lst: float
    mean_delta_lst: float
    min_delta: float
    max_delta: float
    pct_cells_cooler: float
    n_perturbed_features: int | None = None


class ScenarioInfo(BaseModel):
    name: str
    description: str
    perturbations: dict[str, list[str | float]]


# ---------------------------------------------------------------------- #
# Thermal Routing
# ---------------------------------------------------------------------- #
class RouteMetrics(BaseModel):
    """Metrics for a single route option."""

    distance_m: float = Field(description="Total distance in metres")
    distance_km: float = Field(description="Total distance in kilometres")
    time_min: float = Field(description="Estimated walking time in minutes")
    avg_lst_c: float | None = Field(
        default=None,
        description="Average predicted land surface temperature along route (°C)",
    )
    max_lst_c: float | None = Field(
        default=None,
        description="Maximum predicted LST along route (°C)",
    )
    thermal_exposure: float | None = Field(
        default=None,
        description="Estimated thermal exposure (avg LST along path, °C)",
    )
    shade: float | None = Field(
        default=None,
        description="Average tree density (shade proxy) along route",
    )
    vegetation: float | None = Field(
        default=None,
        description="Average NDVI (vegetation index) along route",
    )
    aqi: float | None = Field(
        default=None,
        description="Average air quality index along route",
    )
    n_cells: int = Field(description="Number of grid cells in the route path")
    geometry: dict = Field(description="GeoJSON LineString geometry")


class RouteWeights(BaseModel):
    """Configurable weights for the route cost formula."""

    distance: float = 1.0
    heat: float = 0.0
    aqi: float = 0.0
    shade: float = 0.0
    vegetation: float = 0.0


class RouteMethodology(BaseModel):
    """Transparent description of how routes are calculated."""

    formula: str
    weights_used: RouteWeights
    grid_resolution_m: int
    algorithm: str
    walking_speed_kmh: float
    departure_time_note: str
    limitations: list[str]


class ThermalRouteResponse(BaseModel):
    """Full response from the thermal routing endpoint."""

    available: bool
    fastest: RouteMetrics | None = None
    coolest: RouteMetrics | None = None
    balanced: RouteMetrics | None = None
    departure_time: str | None = None
    weights: RouteWeights | None = None
    methodology: RouteMethodology | None = None
    note: str | None = None
    speed_kmh: float | None = None
    message: str | None = None
