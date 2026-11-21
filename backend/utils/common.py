"""
Shared utility functions
========================
Single source of truth for heat classification, AQI categories, and
geodesic calculations used across multiple backend modules.

Centralises the duplicated implementations in:
  - backend/api/prediction.py  (uhi_class)
  - backend/services/city_data.py  (heat_class, aqi_category, _haversine_m)
  - backend/api/environment.py  (_haversine, _ring_length)

The gis-engine HeatClassConfig.fixed_breaks_c values are the canonical
thresholds; this module hard-codes them once rather than importing from
the gis-engine (which has a hyphenated directory name).
"""

from __future__ import annotations

import math

import numpy as np

EARTH_RADIUS_M = 6_371_000.0

# ---------------------------------------------------------------------------
# Heat classification (gis-engine HeatClassConfig.fixed_breaks_c)
# Used ONLY for labelling / visualization — not a scientific threshold.
# ---------------------------------------------------------------------------

HEAT_CLASS_BREAKS: list[tuple[str, float]] = [
    ("Very Cool", 20.0),
    ("Cool", 25.0),
    ("Moderate", 30.0),
    ("Warm", 35.0),
    ("Hot", 40.0),
]


def heat_class(celsius: float | None) -> str | None:
    """Classify a temperature into the project's fixed heat classes.

    Returns ``None`` for ``None`` / non-finite values.
    """
    if celsius is None or not math.isfinite(celsius):
        return None
    for label, threshold in HEAT_CLASS_BREAKS:
        if celsius < threshold:
            return label
    return "Very Hot"


# ---------------------------------------------------------------------------
# AQI categories (gis-engine config AQI_CATEGORIES)
# Indian CPCB breakpoints — used for labelling only.
# ---------------------------------------------------------------------------

AQI_CATEGORIES: list[tuple[str, int]] = [
    ("Good", 50),
    ("Satisfactory", 100),
    ("Moderate", 200),
    ("Poor", 300),
    ("Very Poor", 400),
]


def aqi_category(aqi: float | None) -> str | None:
    """Map a numeric AQI value to its CPCB category label.

    Returns ``None`` for ``None`` / non-finite values.
    """
    if aqi is None or not math.isfinite(aqi):
        return None
    for label, threshold in AQI_CATEGORIES:
        if aqi <= threshold:
            return label
    return "Severe"


# ---------------------------------------------------------------------------
# Geodesic calculations
# ---------------------------------------------------------------------------

def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres between two WGS-84 points."""
    a = (
        math.sin(math.radians(lat2 - lat1) / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(min(1.0, math.sqrt(a)))


def vec_haversine_m(
    lat1: float | np.ndarray,
    lng1: float | np.ndarray,
    lat2: float | np.ndarray,
    lng2: float | np.ndarray,
) -> np.ndarray:
    """Vectorised haversine for nearest-cell lookups (numpy arrays)."""
    lat1, lng1, lat2, lng2 = map(np.asarray, (lat1, lng1, lat2, lng2))
    a = (
        np.sin(np.radians(lat2 - lat1) / 2) ** 2
        + np.cos(np.radians(lat1))
        * np.cos(np.radians(lat2))
        * np.sin(np.radians(lng2 - lng1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * np.arcsin(np.minimum(1.0, np.sqrt(a)))
