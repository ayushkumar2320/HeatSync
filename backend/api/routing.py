"""
Thermal routing endpoints
==========================
Grid-level heat-aware routing on the real 100 m model lattice.

    GET /api/routing/heat-safe?start_lat=&start_lng=&end_lat=&end_lng=

Returns FASTEST, COOLEST and BALANCED routes with distance, walking-time
estimate, thermal exposure, shade, vegetation, AQI and route geometry.

Deliberately labelled as estimates, never medical/safety claims.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from backend.api.deps import get_city_data
from backend.services.city_data import CityDataService

router = APIRouter(prefix="/api/routing", tags=["routing"])


@router.get("/heat-safe")
def heat_safe_route(
    start_lat: Annotated[float, Query(ge=-90, le=90)],
    start_lng: Annotated[float, Query(ge=-180, le=180)],
    end_lat: Annotated[float, Query(ge=-90, le=90)],
    end_lng: Annotated[float, Query(ge=-180, le=180)],
    departure_time: Annotated[str | None, Query()] = None,
    weight_distance: Annotated[float, Query(ge=0, le=10)] = 1.0,
    weight_heat: Annotated[float, Query(ge=0, le=10)] = 0.0,
    weight_aqi: Annotated[float, Query(ge=0, le=10)] = 0.0,
    weight_shade: Annotated[float, Query(ge=0, le=10)] = 0.0,
    weight_vegetation: Annotated[float, Query(ge=0, le=10)] = 0.0,
    city: CityDataService = Depends(get_city_data),
) -> JSONResponse:
    """Fastest vs cooler vs balanced route between two points.

    The *departure_time* parameter is accepted for forward compatibility
    but does not yet influence the thermal model.  Route weights follow
    the formula::

        route_cost = distance_weight × distance
                   + heat_weight × thermal_exposure
                   + aqi_weight × pollution
                   - shade_weight × shade
                   - vegetation_weight × vegetation
    """
    weights = {
        "distance": weight_distance,
        "heat": weight_heat,
        "aqi": weight_aqi,
        "shade": weight_shade,
        "vegetation": weight_vegetation,
    }
    try:
        return JSONResponse(content=city.route(
            start_lat, start_lng, end_lat, end_lng,
            departure_time=departure_time,
            weights=weights,
        ))
    except (FileNotFoundError, RuntimeError) as exc:
        return JSONResponse(
            status_code=503,
            content={"available": False, "message": str(exc)},
        )
