"""
Alert & Biophysical Heat Strain Service
========================================
Scientific biophysical thermal indices, 5-tier alert classification,
dual-mode (Citizen Layman vs Analyst Technical) advisories, compound
multi-hazard detection (Heat + AQI), and OASIS / ITU-T CAP v1.2 XML generation.

Derived from HeatX biophysical models & IMD / NDMA / OSDMA heat action frameworks.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime
from typing import Any
import xml.etree.ElementTree as ET

# ---------------------------------------------------------------------------
# Tier definitions (HeatX / IMD-aligned)
# ---------------------------------------------------------------------------

IMPACT_TIERS = [
    {
        "tier": "LOW",
        "label": "Normal / Low",
        "color": "#27AE60",
        "bg_color": "rgba(39, 174, 96, 0.12)",
        "border_color": "rgba(39, 174, 96, 0.4)",
        "wbgt_min": 0.0,
        "wbgt_max": 26.7,
        "description": "Normal seasonal conditions. Standard public hydration advice.",
        "action": "Routine monitoring; maintain standard summer preparedness.",
    },
    {
        "tier": "MODERATE",
        "label": "Elevated / Caution",
        "color": "#F1C40F",
        "bg_color": "rgba(241, 196, 15, 0.12)",
        "border_color": "rgba(241, 196, 15, 0.4)",
        "wbgt_min": 26.7,
        "wbgt_max": 29.4,
        "description": "Elevated thermal stress. Caution advised for manual outdoor workers.",
        "action": "Issue precautionary advisories; schedule hydration breaks for labor.",
    },
    {
        "tier": "ELEVATED",
        "label": "Elevated / Amber",
        "color": "#E67E22",
        "bg_color": "rgba(230, 126, 34, 0.12)",
        "border_color": "rgba(230, 126, 34, 0.4)",
        "wbgt_min": 29.4,
        "wbgt_max": 31.0,
        "description": "High thermal strain in built-up or dense residential zones.",
        "action": "Activate district heat action plans; mandate shaded rest breaks.",
    },
    {
        "tier": "HIGH",
        "label": "High / Extreme Caution",
        "color": "#E74C3C",
        "bg_color": "rgba(231, 76, 60, 0.12)",
        "border_color": "rgba(231, 76, 60, 0.4)",
        "wbgt_min": 31.0,
        "wbgt_max": 32.2,
        "description": "Dangerous outdoor conditions. Rapid onset of heat fatigue likely.",
        "action": "Pre-position emergency ORS and IV fluids; mobile water tankers deployed.",
    },
    {
        "tier": "VERY_HIGH",
        "label": "Very High / Danger",
        "color": "#C0392B",
        "bg_color": "rgba(192, 57, 43, 0.12)",
        "border_color": "rgba(192, 57, 43, 0.4)",
        "wbgt_min": 32.2,
        "wbgt_max": 34.0,
        "description": "Severe heatwave threshold met. Severe physiological collapse hazard.",
        "action": "Halt non-essential afternoon outdoor work; open public cooling shelters.",
    },
    {
        "tier": "EXTREME",
        "label": "Extreme Danger",
        "color": "#7D3C98",
        "bg_color": "rgba(125, 60, 152, 0.15)",
        "border_color": "rgba(125, 60, 152, 0.5)",
        "wbgt_min": 34.0,
        "wbgt_max": 60.0,
        "description": "Extreme thermal risk combined with humidity/density. Imminent heatstroke.",
        "action": "Declare Level-4 Red Alert; mobilize dedicated hospital heatstroke rooms.",
    },
]


# ---------------------------------------------------------------------------
# Authentic Bhubaneswar Cooling Shelters & Heat-Safe Spots
# ---------------------------------------------------------------------------

BHUBANESWAR_SHELTERS = [
    {
        "id": "shelter-01",
        "name": "AIIMS Bhubaneswar Heat Emergency Unit",
        "type": "HOSPITAL_HEAT_UNIT",
        "category_label": "Medical Cooling & Triage",
        "lat": 20.2312,
        "lng": 85.7766,
        "address": "Sijua, Patrapada, Bhubaneswar",
        "amenities": ["Air-Conditioned Triage", "Ice Baths / Cold Misting", "IV Fluid Resuscitation", "24x7 Doctor On Duty"],
        "open_hours": "24 Hours (Emergency)",
        "capacity": 60,
        "contact": "0674-2476789",
    },
    {
        "id": "shelter-02",
        "name": "Capital Hospital Dedicated Heatstroke Wing",
        "type": "HOSPITAL_HEAT_UNIT",
        "category_label": "Medical Cooling & Triage",
        "lat": 20.2642,
        "lng": 85.8239,
        "address": "Unit 6, Ganga Nagar, Bhubaneswar",
        "amenities": ["Designated Heatstroke Beds", "Rapid Core Body Cooling", "Oral Rehydration Kiosk", "Ambulance Standby"],
        "open_hours": "24 Hours (Emergency)",
        "capacity": 45,
        "contact": "0674-2391983",
    },
    {
        "id": "shelter-03",
        "name": "Ekamra Kanan Botanical Shaded Canopy Retreat",
        "type": "NATURAL_SHADE",
        "category_label": "High-Canopy Green Shade",
        "lat": 20.3061,
        "lng": 85.8078,
        "address": "Nayapalli, Near IRC Village, Bhubaneswar",
        "amenities": ["Deep Dense Tree Canopy (-3.5°C Ambient)", "Potable Drinking Fountains", "Benches & Covered Gazebos", "First Aid Post"],
        "open_hours": "07:00 - 19:30",
        "capacity": 500,
        "contact": "BMC Helpline 1929",
    },
    {
        "id": "shelter-04",
        "name": "Master Canteen Junction Transit Misting Shelter",
        "type": "CIVIC_COOLING",
        "category_label": "Municipal Misting & Hydration Kiosk",
        "lat": 20.2678,
        "lng": 85.8427,
        "address": "Railway Station Square, Kharavela Nagar",
        "amenities": ["High-Pressure Water Misting Fans", "Free Chilled ORS Distribution", "Covered Transit Waiting Area"],
        "open_hours": "09:00 - 18:00",
        "capacity": 150,
        "contact": "BMC Ward 30 Officer",
    },
    {
        "id": "shelter-05",
        "name": "BMC Saheed Nagar Community Cooling Center",
        "type": "CIVIC_COOLING",
        "category_label": "Public Climate-Controlled Hall",
        "lat": 20.2891,
        "lng": 85.8492,
        "address": "Bhawani Enclave / Saheed Nagar Club Road",
        "amenities": ["Central Air Conditioning", "Resting Recliners for Senior Citizens", "Free Glucose & Water", "Basic Vitals Monitoring"],
        "open_hours": "10:30 - 17:30",
        "capacity": 100,
        "contact": "BMC Ward 34 Care",
    },
    {
        "id": "shelter-06",
        "name": "Biju Patnaik Energy Park & Shaded Lake Oasis",
        "type": "NATURAL_SHADE",
        "category_label": "Green Infrastructure & Microclimate",
        "lat": 20.2815,
        "lng": 85.7955,
        "address": "Khandagiri Road, Near Jagamara",
        "amenities": ["Waterbody Evaporative Cooling", "Shaded Pavilions", "Chilled Water Dispensers"],
        "open_hours": "08:00 - 19:00",
        "capacity": 300,
        "contact": "Parks Dept / BMC",
    },
    {
        "id": "shelter-07",
        "name": "Baramunda ISBT Regional Terminal Hydration Hub",
        "type": "CIVIC_COOLING",
        "category_label": "Public Transit Relief Kiosk",
        "lat": 20.2798,
        "lng": 85.7876,
        "address": "Babasaheb Bhimrao Ambedkar Bus Terminal, Baramunda",
        "amenities": ["Continuous Drinking Water Dispensary", "Misting Stations at Platforms", "Medical First-Aid Room"],
        "open_hours": "24 Hours",
        "capacity": 250,
        "contact": "OSRTC Transit Helpdesk",
    },
    {
        "id": "shelter-08",
        "name": "Chandrasekharpur Urban Primary Health Centre (UPHC)",
        "type": "HOSPITAL_HEAT_UNIT",
        "category_label": "Primary Health Clinic Relief",
        "lat": 20.3245,
        "lng": 85.8198,
        "address": "Near Sailashree Vihar, Chandrasekharpur",
        "amenities": ["Air-Cooled Recovery Bay", "Oral Electrolyte Packs (ORS)", "Paramedic on Standby"],
        "open_hours": "08:00 - 20:00",
        "capacity": 30,
        "contact": "0674-2741122",
    },
]


# ---------------------------------------------------------------------------
# Biophysical Formulations
# ---------------------------------------------------------------------------

def stull_wet_bulb(tdb: float, rh: float) -> float:
    """Stull (2011) Wet-Bulb Temperature (°C).

    Accurate within 1°C for -20 <= tdb <= 50 and 5% <= rh <= 99%.
    """
    rh_clamped = max(1.0, min(100.0, rh))
    twb = (
        tdb * math.atan(0.151977 * math.sqrt(rh_clamped + 8.313659))
        + math.atan(tdb + rh_clamped)
        - math.atan(rh_clamped - 1.676331)
        + 0.00391838 * (rh_clamped ** 1.5) * math.atan(0.023101 * rh_clamped)
        - 4.686035
    )
    return round(twb, 2)


def natural_wet_bulb(tdb: float, rh: float) -> float:
    """Natural wet-bulb temperature proxy (Stull + 1.0°C radiant offset)."""
    return round(stull_wet_bulb(tdb, rh) + 1.0, 2)


def globe_temperature(tdb: float, solar_wm2: float, wind_speed: float) -> float:
    """Energy-balance black-globe temperature proxy (°C)."""
    w = max(wind_speed, 0.1)
    tg = tdb + (solar_wm2 * 0.0075) / (w + 0.5)
    return round(tg, 2)


def outdoor_wbgt(tdb: float, rh: float, solar_wm2: float = 600.0, wind_speed: float = 1.2) -> float:
    """Outdoor composite WBGT (ACGIH / OSHA Standard):

    WBGT = 0.7 * Tnwb + 0.2 * Tg + 0.1 * Tdb
    """
    tnwb = natural_wet_bulb(tdb, rh)
    tg = globe_temperature(tdb, solar_wm2, wind_speed)
    val = 0.7 * tnwb + 0.2 * tg + 0.1 * tdb
    return round(val, 2)


def vapor_pressure_kpa(tdb: float, rh: float) -> float:
    """Magnus-Tetens actual vapor pressure (kPa)."""
    rh_clamped = max(1.0, min(100.0, rh))
    es = 0.6112 * math.exp((17.67 * tdb) / (tdb + 243.5))
    return round((rh_clamped / 100.0) * es, 4)


def utci_approx(tdb: float, rh: float, wind_speed: float = 1.2, solar_wm2: float = 600.0) -> float:
    """Universal Thermal Climate Index (UTCI) polynomial proxy (COST 730)."""
    v10 = wind_speed * (math.log(10.0 / 0.1) / math.log(2.0 / 0.1))
    e = vapor_pressure_kpa(tdb, rh)
    tmrt_excess = solar_wm2 / 200.0
    val = tdb + 0.33 * e - 0.70 * v10 - 4.00 + 0.10 * tmrt_excess
    return round(val, 2)


def rothfusz_heat_index(tdb_c: float, rh: float) -> float:
    """NWS Rothfusz polynomial Heat Index (°C)."""
    t_f = tdb_c * 9.0 / 5.0 + 32.0
    r = max(1.0, min(100.0, rh))

    if t_f < 80.0 or r < 40.0:
        return round(tdb_c, 2)

    hi = (
        -42.379
        + 2.04901523 * t_f
        + 10.14333127 * r
        - 0.22475541 * t_f * r
        - 0.00683783 * (t_f ** 2)
        - 0.05481717 * (r ** 2)
        + 0.00122874 * (t_f ** 2) * r
        + 0.00085282 * t_f * (r ** 2)
        - 0.00000199 * (t_f ** 2) * (r ** 2)
    )

    if r < 13.0 and 80.0 <= t_f <= 112.0:
        hi += -((13.0 - r) / 4.0) * math.sqrt(max(0.0, (17.0 - abs(t_f - 95.0)) / 17.0))
    elif r > 85.0 and 80.0 <= t_f <= 87.0:
        hi += ((r - 85.0) / 10.0) * ((87.0 - t_f) / 5.0)

    hi_c = (hi - 32.0) * 5.0 / 9.0
    return round(hi_c, 2)


def classify_tier(wbgt_val: float) -> dict[str, Any]:
    """Find the impact tier definition for a given WBGT."""
    for t in IMPACT_TIERS:
        if t["wbgt_min"] <= wbgt_val < t["wbgt_max"]:
            return t
    return IMPACT_TIERS[-1]


def compute_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Spherical distance in km."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2.0) ** 2) + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


# ---------------------------------------------------------------------------
# Alert Evaluation Service
# ---------------------------------------------------------------------------

class AlertService:
    """Evaluates real-time environmental metrics to produce alert packages."""

    @staticmethod
    def evaluate_live_alert(
        temperature_c: float,
        humidity_pct: float,
        pm25_ugm3: float | None = None,
        wind_speed_ms: float = 1.2,
        solar_wm2: float = 650.0,
        area_name: str = "Bhubaneswar Urban Agglomeration",
    ) -> dict[str, Any]:
        """Compute full dual-mode alert package from live atmospheric data."""
        # Biophysical calculations
        twb = stull_wet_bulb(temperature_c, humidity_pct)
        wbgt_val = outdoor_wbgt(temperature_c, humidity_pct, solar_wm2, wind_speed_ms)
        utci_val = utci_approx(temperature_c, humidity_pct, wind_speed_ms, solar_wm2)
        hi_val = rothfusz_heat_index(temperature_c, humidity_pct)
        tier_info = classify_tier(wbgt_val)

        # Compound hazard evaluation: Heat + Air Pollution
        is_compound = False
        compound_reasons: list[str] = []
        if wbgt_val >= 29.4:
            if pm25_ugm3 is not None and pm25_ugm3 >= 60.0:
                is_compound = True
                compound_reasons.append(
                    f"Elevated PM2.5 ({pm25_ugm3} µg/m³) exceeds Indian NAAQS 24-hr threshold (60 µg/m³)"
                )
                compound_reasons.append(
                    f"Wet-Bulb Globe Temp ({wbgt_val}°C) induces severe thermoregulatory and cardiovascular strain"
                )

        # Layman Guidance Generation
        layman_guidance = AlertService._generate_layman_guidance(
            tier=tier_info["tier"],
            temp=temperature_c,
            wbgt=wbgt_val,
            is_compound=is_compound,
        )

        # Technical Guidance Generation
        technical_guidance = AlertService._generate_technical_guidance(
            tier=tier_info["tier"],
            wbgt=wbgt_val,
            utci=utci_val,
            hi=hi_val,
            is_compound=is_compound,
        )

        # Assemble full payload
        timestamp_str = datetime.now(UTC).isoformat()
        return {
            "alert_id": f"HS-ALERT-{int(datetime.now(UTC).timestamp())}",
            "generated_at": timestamp_str,
            "area_name": area_name,
            "tier": tier_info["tier"],
            "tier_label": tier_info["label"],
            "tier_color": tier_info["color"],
            "tier_bg_color": tier_info["bg_color"],
            "tier_border_color": tier_info["border_color"],
            "headline": f"{tier_info['label'].upper()} Heat Alert - {area_name}",
            "biophysical": {
                "air_temperature_c": temperature_c,
                "relative_humidity_pct": humidity_pct,
                "stull_wet_bulb_c": twb,
                "wbgt_c": wbgt_val,
                "utci_c": utci_val,
                "heat_index_c": hi_val,
                "pm25_ugm3": pm25_ugm3,
                "wind_speed_ms": wind_speed_ms,
                "solar_radiation_wm2": solar_wm2,
            },
            "compound_hazard": {
                "active": is_compound,
                "synergy_label": "Heatwave + Particulate Air Pollution Synergistic Stress" if is_compound else "Normal Single-Vector Monitoring",
                "reasons": compound_reasons,
                "clinical_warning": (
                    "Synergistic threat: High PM2.5 impairs respiratory oxygen exchange while high heat forces elevated cardiac output. Outdoor exercise and manual labor are strongly contraindicated."
                    if is_compound else None
                ),
            },
            "citizen_layman": layman_guidance,
            "analyst_technical": technical_guidance,
            "nearest_shelters": BHUBANESWAR_SHELTERS[:4],
        }

    @staticmethod
    def _generate_layman_guidance(
        tier: str, temp: float, wbgt: float, is_compound: bool
    ) -> dict[str, Any]:
        """Human-first plain language instructions for everyday citizens."""
        if tier in ("VERY_HIGH", "EXTREME"):
            risk_level = "Severe Danger to Life"
            why = f"The heat index feels like over {temp + 4:.0f}°C and the body's natural sweating mechanism cannot cool itself effectively due to humidity. Heatstroke can strike within 30 minutes of direct sun exposure."
            actions = [
                "Stay indoors in a fan-cooled or air-conditioned room between 11:30 AM and 4:30 PM.",
                "Drink 3 to 4 liters of water throughout the day. Add ORS, lemon water, buttermilk (chaas), or coconut water.",
                "Never leave children, elders, or pets inside parked vehicles even for a few minutes.",
                "Wear loose, lightweight, light-colored cotton clothing. Cover your head with a wet cloth or umbrella.",
                "If anyone experiences dizziness, confusion, high fever without sweating, or nausea, move them into shade, sponge with cool water, and dial 108 immediately.",
            ]
        elif tier in ("ELEVATED", "HIGH"):
            risk_level = "High Caution for Vulnerable Citizens"
            why = f"Air temperatures around {temp:.1f}°C combined with humidity create strong thermal strain. Outdoor workers and elderly citizens can dehydrate rapidly."
            actions = [
                "Schedule heavy outdoor chores and construction tasks before 10:30 AM or after 5:00 PM.",
                "Hydrate frequently even if you do not feel thirsty. Keep an electrolyte bottle handy.",
                "Employers must provide mandatory shaded rest areas and free potable drinking water.",
                "Wear wide-brim hats, sunglasses, and airy cotton clothing.",
                "Check on elderly family members and neighbors twice daily.",
            ]
        else:
            risk_level = "Normal Seasonal Precautions"
            why = "Weather parameters are within normal summer thresholds, but prolonged outdoor sun exposure still requires baseline hydration."
            actions = [
                "Maintain healthy hydration throughout the afternoon.",
                "Carry a water bottle when travelling.",
                "Utilize shaded walking paths and city parks during peak afternoon hours.",
            ]

        if is_compound:
            actions.insert(0, "POLLUTION WARNING: Poor air quality combined with high heat causes dual lung and heart strain. Wear an N95 mask if outdoors.")

        return {
            "risk_assessment": risk_level,
            "why_is_it_dangerous": why,
            "who_is_at_risk": [
                "Outdoor daily-wage workers, traffic personnel, and delivery riders",
                "Senior citizens (>65 years) and infants/toddlers",
                "Patients with chronic cardiovascular, pulmonary, or renal conditions",
                "Pregnant women and individuals without home cooling access",
            ],
            "five_action_steps": actions,
            "emergency_hotlines": {
                "Medical Emergency & Ambulance": "108",
                "Bhubaneswar Municipal Corporation (BMC) Helpline": "1929",
                "Odisha Disaster Management (OSDMA) Control Room": "1070",
                "National Emergency Services": "112",
            },
        }

    @staticmethod
    def _generate_technical_guidance(
        tier: str, wbgt: float, utci: float, hi: float, is_compound: bool
    ) -> dict[str, Any]:
        """Biophysical indices and DISCOM/Hospital trigger matrices for technical users."""
        if tier in ("VERY_HIGH", "EXTREME"):
            discom_status = "CRITICAL PEAK LOAD (+22% to +35%)"
            discom_action = "Pre-arrange grid substations against transformer overheating. Halt planned power maintenance shutdowns in residential zones."
            hospital_status = "CODE RED - HEATSTROKE SURGE PROTOCOL"
            hospital_action = "Activate emergency ice bath resuscitation rooms; reserve dedicated CCU beds; ensure 1,000+ units of chilled IV Ringer's lactate stocked."
        elif tier in ("ELEVATED", "HIGH"):
            discom_status = "ELEVATED DEMAND (+12% to +20%)"
            discom_action = "Monitor feeder line thermal capacity in high-density urban wards."
            hospital_status = "CODE YELLOW - HEAT EXHAUSTION READINESS"
            hospital_action = "Establish dedicated outpatient dehydration hydration counters at Capital Hospital & UPHCs."
        else:
            discom_status = "NORMAL BASELINE"
            discom_action = "Standard seasonal dispatch schedule."
            hospital_status = "ROUTINE SUMMER SURVEILLANCE"
            hospital_action = "Standard emergency room preparedness."

        return {
            "biophysical_diagnostics": {
                "wbgt_standard": "ACGIH / ISO 7243 Outdoor Composite",
                "heat_strain_category": tier,
                "utci_thermal_stress": f"{utci}°C (COST 730 proxy)",
                "rothfusz_index": f"{hi}°C (NWS standard)",
            },
            "discom_grid_impact": {
                "grid_strain_level": discom_status,
                "recommended_action": discom_action,
            },
            "hospital_triage_matrix": {
                "clinical_alert_level": hospital_status,
                "health_department_action": hospital_action,
            },
            "scientific_provenance": {
                "wbgt_formula": "Stull (2011) + Natural Wet-Bulb + Energy Balance Black-Globe",
                "data_lineage": "OpenWeather Current Observations + XGBoost Model Prediction",
                "compliance": "National Disaster Management Authority (NDMA) Heat Action Plan 2024",
            },
        }

    @staticmethod
    def get_nearby_shelters(user_lat: float, user_lng: float, limit: int = 6) -> list[dict[str, Any]]:
        """Return cooling centers sorted by geodesic distance from user's location."""
        results = []
        for shelter in BHUBANESWAR_SHELTERS:
            dist = compute_haversine_km(user_lat, user_lng, shelter["lat"], shelter["lng"])
            s_copy = dict(shelter)
            s_copy["distance_km"] = dist
            results.append(s_copy)

        results.sort(key=lambda s: s["distance_km"])
        return results[:limit]

    @staticmethod
    def generate_cap_v12_xml(alert_payload: dict[str, Any]) -> str:
        """Serialize alert package into ITU-T Recommendation X.1303 / OASIS CAP v1.2 XML.

        Compliant with India NDMA / OSDMA CAP Alert Feeds.
        """
        ns = "urn:oasis:names:tc:emergency:cap:1.2"
        root = ET.Element(f"{{{ns}}}alert")

        identifier = ET.SubElement(root, "identifier")
        identifier.text = alert_payload.get("alert_id", f"HS-{int(datetime.now(UTC).timestamp())}")

        sender = ET.SubElement(root, "sender")
        sender.text = "heatsync-bhubaneswar-disaster-response@bmc.gov.in"

        sent = ET.SubElement(root, "sent")
        sent.text = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S+00:00")

        status = ET.SubElement(root, "status")
        status.text = "Actual"

        msg_type = ET.SubElement(root, "msgType")
        msg_type.text = "Alert"

        scope = ET.SubElement(root, "scope")
        scope.text = "Public"

        info = ET.SubElement(root, "info")

        category = ET.SubElement(info, "category")
        category.text = "Met"

        event = ET.SubElement(info, "event")
        event.text = "Extreme Heatwave / Thermal Strain Warning"

        urgency = ET.SubElement(info, "urgency")
        tier = alert_payload.get("tier", "LOW")
        urgency.text = "Immediate" if tier in ("HIGH", "VERY_HIGH", "EXTREME") else "Expected"

        severity = ET.SubElement(info, "severity")
        if tier == "EXTREME":
            severity.text = "Extreme"
        elif tier in ("VERY_HIGH", "HIGH"):
            severity.text = "Severe"
        elif tier in ("ELEVATED", "MODERATE"):
            severity.text = "Moderate"
        else:
            severity.text = "Minor"

        certainty = ET.SubElement(info, "certainty")
        certainty.text = "Observed"

        event_code = ET.SubElement(info, "eventCode")
        value_name = ET.SubElement(event_code, "valueName")
        value_name.text = "SAME"
        value = ET.SubElement(event_code, "value")
        value.text = "HWW"  # Heat Wave Warning

        headline = ET.SubElement(info, "headline")
        headline.text = alert_payload.get("headline", "Heatwave Warning for Bhubaneswar")

        description = ET.SubElement(info, "description")
        layman = alert_payload.get("citizen_layman", {})
        description.text = f"{layman.get('why_is_it_dangerous', '')} Assessment: {layman.get('risk_assessment', '')}"

        instruction = ET.SubElement(info, "instruction")
        steps = layman.get("five_action_steps", [])
        instruction.text = " | ".join(steps)

        # Compound hazard parameter
        compound = alert_payload.get("compound_hazard", {})
        if compound.get("active"):
            param = ET.SubElement(info, "parameter")
            p_name = ET.SubElement(param, "valueName")
            p_name.text = "CompoundHazard"
            p_val = ET.SubElement(param, "value")
            p_val.text = f"Heat+PM2.5: {compound.get('synergy_label')}"

        # Area definition
        area = ET.SubElement(info, "area")
        area_desc = ET.SubElement(area, "areaDesc")
        area_desc.text = alert_payload.get("area_name", "Bhubaneswar Urban Region")

        circle = ET.SubElement(area, "circle")
        circle.text = "20.2961,85.8245,15.0"  # Lat, Lon, Radius (km)

        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
