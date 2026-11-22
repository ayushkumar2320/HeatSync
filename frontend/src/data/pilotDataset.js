// Pilot Dataset for HeatSync: Khandagiri & ITER Campus Area, Bhubaneswar, Odisha
// Grid Resolution: ~100m x 100m (~196 grid cells)
// Bounding Box: 20.2420° N to 20.2620° N, 85.7760° E to 85.8000° E

export const PILOT_METADATA = {
  cityName: "Bhubaneswar Pilot Zone",
  region: "Khandagiri, ITER Campus, Jagamara, SUM Hospital Corridor & Baramunda",
  totalAreaKm2: 11.5,
  gridResolutionMeters: 100,
  totalGridCells: 196,
  satelliteSources: ["Landsat-9 TIRS (LST)", "Sentinel-2 (NDVI/Albedo)", "Sentinel-5P (NO2/AOD)"],
  groundStations: [
    { id: "stn-1", name: "CPCB ITER Campus CAAQMS Station", lat: 20.2525, lng: 85.7890, type: "Regulatory AQI Monitor" },
    { id: "stn-2", name: "IMD Bhubaneswar Khandagiri Node", lat: 20.2580, lng: 85.7810, type: "Reference Weather Station" },
    { id: "stn-3", name: "Khandagiri Heritage Reserve Station", lat: 20.2470, lng: 85.7840, type: "Urban Heat Island Sensor" },
    { id: "stn-4", name: "SUM Hospital / SOA Green Node", lat: 20.2510, lng: 85.7940, type: "Traffic & Hospital Buffer Monitor" }
  ],
  lastUpdated: "2026-08-14T11:00:00Z"
};

// Generate spatial grid cells across the 14x14 grid polygon for Khandagiri & ITER Campus
const generateGridCells = () => {
  const cells = [];
  const minLat = 20.2420;
  const maxLat = 20.2620;
  const minLng = 85.7760;
  const maxLng = 85.8000;
  
  const rows = 14;
  const cols = 14;
  
  const dLat = (maxLat - minLat) / rows;
  const dLng = (maxLng - minLng) / cols;

  const streetNames = [
    "ITER Campus Academic Corridor", "SOA University Stadium Road", "Jagamara Main Road",
    "Khandagiri Caves Heritage Zone", "Udayagiri Hill Foothill Road", "Khandagiri Square Commercial Junction",
    "Baramunda Bus Stand Approach", "SUM Hospital Corridor", "Ghatikia Institutional Sector",
    "Kalinga Nagar Ward 14", "Dharma Vihar Lane", "Gandamunda Square", "Bhubaneswar NH-16 Service Road"
  ];

  let idCounter = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellLatMin = minLat + r * dLat;
      const cellLatMax = cellLatMin + dLat;
      const cellLngMin = minLng + c * dLng;
      const cellLngMax = cellLngMin + dLng;

      const centerLat = (cellLatMin + cellLatMax) / 2;
      const centerLng = (cellLngMin + cellLngMax) / 2;

      // Microclimate spatial zones in Khandagiri & ITER Area
      const isIterCampus = (r >= 6 && r <= 9 && c >= 6 && c <= 9); // ITER campus center
      const isHeritageHill = (r <= 3 && c <= 4); // Khandagiri & Udayagiri forested hills
      const isCommercialJunction = (r >= 10 && c >= 8); // Khandagiri Square & NH-16 commercial traffic
      const isHospitalZone = (r >= 4 && r <= 6 && c >= 10); // SUM Hospital corridor
      const isInformalSettlement = (r <= 2 && c >= 10) || (r >= 11 && c <= 3); // Foothill informal clusters

      let baselineLST = 35.8 + (isCommercialJunction ? 6.8 : 0) + (isInformalSettlement ? 5.2 : 0) - (isHeritageHill ? 4.8 : 0) - (isIterCampus ? 2.2 : 0);
      baselineLST += (Math.random() * 1.4 - 0.7);
      baselineLST = Math.round(baselineLST * 10) / 10;

      let baselineAQI = 175 + (isCommercialJunction ? 95 : 0) + (isInformalSettlement ? 55 : 0) - (isHeritageHill ? 45 : 0);
      baselineAQI += Math.round(Math.random() * 18 - 9);

      const treeCanopyPct = isHeritageHill ? Math.round(45 + Math.random() * 20) : (isIterCampus ? Math.round(25 + Math.random() * 15) : Math.round(6 + Math.random() * 14));
      const coolRoofPct = isIterCampus ? Math.round(18 + Math.random() * 12) : Math.round(3 + Math.random() * 10);
      const buildingDensity = isCommercialJunction ? 0.90 : (isInformalSettlement ? 0.88 : (isHeritageHill ? 0.15 : 0.55));
      const ndvi = isHeritageHill ? 0.64 : (isIterCampus ? 0.42 : 0.18);
      const svf = Math.round((0.88 - buildingDensity * 0.42) * 100) / 100; // Sky View Factor

      // Vulnerability Scoring
      let vulnerabilityScore = 32;
      let vulnerabilityType = "Moderate Urban Exposure";

      if (isInformalSettlement) {
        vulnerabilityScore = Math.round(85 + Math.random() * 12);
        vulnerabilityType = "Informal Foothill Settlement / High Pop Density";
      } else if (isCommercialJunction) {
        vulnerabilityScore = Math.round(78 + Math.random() * 14);
        vulnerabilityType = "Khandagiri Square Outdoor Workers & Bus Terminal";
      } else if (isHospitalZone) {
        vulnerabilityScore = Math.round(90 + Math.random() * 6);
        vulnerabilityType = "SUM Hospital Sensitive Receptors";
      } else if (isIterCampus) {
        vulnerabilityScore = Math.round(35 + Math.random() * 10);
        vulnerabilityType = "ITER Campus / Student Density Corridor";
      } else if (isHeritageHill) {
        vulnerabilityScore = Math.round(18 + Math.random() * 12);
        vulnerabilityType = "Forest & Heritage Reserve";
      } else {
        vulnerabilityScore = Math.round(48 + Math.random() * 18);
      }

      // Distance to nearest CPCB ground station
      const distToStation = Math.round(250 + Math.random() * 1200); // meters
      const uncertaintyScore = Math.round(Math.min(88, Math.max(10, (distToStation / 22) + (isInformalSettlement ? 22 : 8))));

      const streetName = streetNames[(r + c) % streetNames.length] + ` (Sector ${r+1}-${String.fromCharCode(65+c)})`;

      cells.push({
        id: `cell-${String(idCounter).padStart(3, '0')}`,
        code: `BHR-KH-${r+1}${String.fromCharCode(65+c)}`,
        streetName,
        row: r,
        col: c,
        bounds: [
          [cellLatMin, cellLngMin],
          [cellLatMax, cellLngMax]
        ],
        center: [centerLat, centerLng],
        baselineLST,         // °C Surface Temp
        baselineAQI,         // PM2.5 / AQI index
        ndvi,                // Vegetation index
        treeCanopyPct,       // % existing canopy
        coolRoofPct,         // % existing cool roof
        shadePct: isHeritageHill ? 40 : (isIterCampus ? 20 : 5),
        trafficDensity: isCommercialJunction ? 0.95 : 0.45,
        buildingDensity,
        svf,
        vulnerabilityScore,
        vulnerabilityType,
        uncertaintyScore,
        distanceToStation: distToStation,
        nearestStation: PILOT_METADATA.groundStations[r % PILOT_METADATA.groundStations.length].name,
        popDensityKm2: isInformalSettlement ? 24500 : (isCommercialJunction ? 18500 : 9200),
        outdoorWorkerCount: isCommercialJunction ? 1450 : (isInformalSettlement ? 820 : 410)
      });

      idCounter++;
    }
  }

  return cells;
};

export const PILOT_GRID_CELLS = generateGridCells();
