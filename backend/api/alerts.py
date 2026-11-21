"""
Alert Centre & Warning Dispatch API
====================================
Exposes active civil protection alerts, dual-mode citizen/technical advisories,
OASIS / ITU-T CAP v1.2 XML feeds, and nearest public cooling shelter locations.

Endpoints:
    GET /api/alerts/active    -> Full live alert payload with biophysical metrics & dual-mode actions
    GET /api/alerts/cap.xml   -> OASIS CAP v1.2 XML feed for disaster management authorities
    GET /api/alerts/shelters  -> Public cooling centres, hydration hubs & heatstroke triage units
    GET /api/alerts/summary   -> Compact summary for navbar / status bar indicators
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import JSONResponse

from backend.config.settings import Settings, get_settings
from backend.services.alerts import AlertService, BHUBANESWAR_SHELTERS
from backend.services.live_data_manager.snapshot import get_current_snapshot

log = logging.getLogger("backend.api.alerts")

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _extract_live_conditions(snapshot) -> tuple[float, float, float | None, float]:
    """Extract temperature, humidity, PM2.5 and wind speed from snapshot."""
    weather = snapshot.weather or {}
    curr_weather = weather.get("current", {}) if isinstance(weather, dict) else {}
    aqi = snapshot.air_quality or {}
    curr_aqi = aqi.get("current", {}) if isinstance(aqi, dict) else {}

    temp = curr_weather.get("temperature")
    if temp is None:
        temp = 32.5  # Realistic Bhubaneswar seasonal baseline fallback

    humidity = curr_weather.get("humidity")
    if humidity is None:
        humidity = 65.0

    wind_speed = curr_weather.get("wind_speed") or 1.5

    pm25 = curr_aqi.get("pm2_5") or curr_aqi.get("pm25")

    return float(temp), float(humidity), float(pm25) if pm25 is not None else None, float(wind_speed)


@router.get("/active")
def get_active_alert(
    lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
    lng: Annotated[float | None, Query(ge=-180, le=180)] = None,
    area_name: str = "Bhubaneswar Urban Region",
    force: bool = False,
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    """Get active heatwave alert package with dual-mode citizen and analyst guidance."""
    try:
        snapshot = get_current_snapshot(force_refresh=force)
        temp, hum, pm25, wind = _extract_live_conditions(snapshot)

        payload = AlertService.evaluate_live_alert(
            temperature_c=temp,
            humidity_pct=hum,
            pm25_ugm3=pm25,
            wind_speed_ms=wind,
            area_name=area_name,
        )

        # If user coordinates are provided, compute real distances to cooling shelters
        if lat is not None and lng is not None:
            payload["nearest_shelters"] = AlertService.get_nearby_shelters(lat, lng, limit=5)
        else:
            payload["nearest_shelters"] = BHUBANESWAR_SHELTERS[:5]

        payload["snapshot_id"] = snapshot.snapshot_id
        return JSONResponse(content={"success": True, "alert": payload})

    except Exception as exc:
        log.error("Failed to generate active alert: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(exc)},
        )


@router.get("/cap.xml")
def get_cap_xml_feed(
    area_name: str = "Bhubaneswar Urban Region",
    force: bool = False,
    settings: Settings = Depends(get_settings),
) -> Response:
    """OASIS / ITU-T CAP v1.2 XML Feed for NDMA / OSDMA integration."""
    try:
        snapshot = get_current_snapshot(force_refresh=force)
        temp, hum, pm25, wind = _extract_live_conditions(snapshot)

        payload = AlertService.evaluate_live_alert(
            temperature_c=temp,
            humidity_pct=hum,
            pm25_ugm3=pm25,
            wind_speed_ms=wind,
            area_name=area_name,
        )

        xml_string = AlertService.generate_cap_v12_xml(payload)

        return Response(
            content=xml_string,
            media_type="application/xml",
            headers={
                "Content-Disposition": 'inline; filename="heatsync_cap_v12_alert.xml"',
                "Cache-Control": "public, max-age=60",
            },
        )
    except Exception as exc:
        log.error("Failed to generate CAP XML: %s", exc)
        return Response(
            content=f"<error><message>{str(exc)}</message></error>",
            media_type="application/xml",
            status_code=500,
        )


@router.get("/shelters")
def get_cooling_shelters(
    lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
    lng: Annotated[float | None, Query(ge=-180, le=180)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 8,
) -> JSONResponse:
    """List designated cooling shelters, shaded parks, and heat emergency triage units."""
    if lat is not None and lng is not None:
        shelters = AlertService.get_nearby_shelters(lat, lng, limit=limit)
    else:
        shelters = BHUBANESWAR_SHELTERS[:limit]

    return JSONResponse(content={
        "success": True,
        "count": len(shelters),
        "shelters": shelters,
    })


@router.get("/summary")
def get_alert_summary(
    force: bool = False,
    settings: Settings = Depends(get_settings),
) -> JSONResponse:
    """Lightweight alert summary for top navbar, tickers, and status bars."""
    try:
        snapshot = get_current_snapshot(force_refresh=force)
        temp, hum, pm25, wind = _extract_live_conditions(snapshot)

        payload = AlertService.evaluate_live_alert(
            temperature_c=temp,
            humidity_pct=hum,
            pm25_ugm3=pm25,
            wind_speed_ms=wind,
        )

        return JSONResponse(content={
            "success": True,
            "tier": payload["tier"],
            "tier_label": payload["tier_label"],
            "tier_color": payload["tier_color"],
            "tier_bg_color": payload["tier_bg_color"],
            "headline": payload["headline"],
            "wbgt_c": payload["biophysical"]["wbgt_c"],
            "air_temp_c": payload["biophysical"]["air_temperature_c"],
            "compound_hazard": payload["compound_hazard"]["active"],
            "synergy_label": payload["compound_hazard"]["synergy_label"],
            "shelters_count": len(BHUBANESWAR_SHELTERS),
            "generated_at": payload["generated_at"],
        })
    except Exception as exc:
        log.warning("Alert summary calculation failed: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": str(exc)},
        )
