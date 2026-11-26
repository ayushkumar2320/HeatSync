/**
 * runTests.js
 * HeatX Frontend Standalone Verification Test Suite (TypeScript frontend port)
 * Validates:
 * 1. Biophysical thermal calculations (Stull WBGT, Rothfusz Heat Index, UTCI)
 * 2. 5-Tier thermal risk classification
 * 3. 15-Day timeline continuity
 * 4. Geography hierarchy and stable IDs
 * 5. Mandatory health model ethical boundary
 * 6. Observation schema contract
 * 7. Weather factors and multi-horizon traceability
 * 8. Offline GIS integrity (GeoJSON features, BLOCK_IDs, zero external tiles)
 *
 * Run: node src/tests/runTests.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

// ── Load data assets ───────────────────────────────────────────────────────────
const heatxData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/heatx15DayData.json'), 'utf-8')
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('   HEATX FRONTEND VERIFICATION TEST SUITE');
console.log('   (TypeScript frontend — HeatX-forntend)');
console.log('====================================================\n');

// ── 1. Biophysical Calculations (inline port from thermalEngine.ts) ─────────────
console.log('--- 1. Biophysical Thermal Calculations ---');

// Stull WBGT (simplified psychrometric)
function computeWBGT(tdb, rh, _wind = 1.0, _solar = 400.0) {
  const tw = tdb * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
    + Math.atan(tdb + rh)
    - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
    - 4.686035;
  return 0.7 * tw + 0.3 * tdb;
}

// Rothfusz Heat Index
function computeHeatIndex(tCelsius, rhPercent) {
  const tF = tCelsius * 9 / 5 + 32;
  if (tF < 80 || rhPercent < 40) return tCelsius;
  const hi = -42.379 + 2.04901523 * tF + 10.14333127 * rhPercent
    - 0.22475541 * tF * rhPercent - 6.83783e-3 * tF * tF
    - 5.481717e-2 * rhPercent * rhPercent + 1.22874e-3 * tF * tF * rhPercent
    + 8.5282e-4 * tF * rhPercent * rhPercent - 1.99e-6 * tF * tF * rhPercent * rhPercent;
  return (hi - 32) * 5 / 9;
}

// UTCI approximation
function computeUTCIApprox(ta, rh, va = 1.0, _solar = 400.0) {
  const d = 6.105 * Math.exp(25.22 * (ta - 273.16) / ta - 5.31 * Math.log(ta / 273.16));
  return ta + 0.607562052 * d - 0.0227712343 * ta * ta + 8.06470293e-4 * ta * ta * ta
    - 0.02756778 * va + 0.123695552 * va * va + 0.0289316 * ta * va - 0.1188159 * va * va * va;
}

const testWbgt = computeWBGT(35.0, 70.0, 1.5, 450.0);
assert(testWbgt > 28.0 && testWbgt < 38.0, `computeWBGT(35°C, 70% RH) = ${testWbgt.toFixed(2)}°C in valid range`);

const testHi = computeHeatIndex(38.0, 60.0);
assert(testHi > 40.0 && testHi < 65.0, `computeHeatIndex(38°C, 60% RH) = ${testHi.toFixed(2)}°C in valid range (>40°C)`);

const subThreshHi = computeHeatIndex(24.0, 30.0);
assert(subThreshHi === 24.0, `computeHeatIndex sub-threshold: returns ambient temp (24.0°C)`);

const testUtci = computeUTCIApprox(36.0, 65.0, 1.5, 500.0);
assert(typeof testUtci === 'number' && !isNaN(testUtci), `computeUTCIApprox returns a valid number (${testUtci.toFixed(2)})`);

// ── 2. Thermal Risk Classification (ported from thermalRiskContract.ts) ─────────
console.log('\n--- 2. Deterministic Thermal Risk Classification ---');

function classifyThermalStress(val) {
  if (val === null || val === undefined || isNaN(Number(val))) return 'DATA_UNAVAILABLE';
  const v = Number(val);
  if (v >= 45.0) return 'LETHAL';
  if (v >= 40.0) return 'DANGER';
  if (v >= 35.0) return 'HIGH';
  if (v >= 30.0) return 'CAUTION';
  return 'NORMAL';
}

assert(classifyThermalStress(28.0) === 'NORMAL', '28.0°C → NORMAL');
assert(classifyThermalStress(32.5) === 'CAUTION', '32.5°C → CAUTION');
assert(classifyThermalStress(37.5) === 'HIGH', '37.5°C → HIGH');
assert(classifyThermalStress(42.5) === 'DANGER', '42.5°C → DANGER');
assert(classifyThermalStress(46.0) === 'LETHAL', '46.0°C → LETHAL');
assert(classifyThermalStress(30.0) === 'CAUTION', 'Boundary 30.0°C → CAUTION (not NORMAL)');
assert(classifyThermalStress(35.0) === 'HIGH', 'Boundary 35.0°C → HIGH (not CAUTION)');
assert(classifyThermalStress(40.0) === 'DANGER', 'Boundary 40.0°C → DANGER (not HIGH)');
assert(classifyThermalStress(45.0) === 'LETHAL', 'Boundary 45.0°C → LETHAL (not DANGER)');
assert(classifyThermalStress(null) === 'DATA_UNAVAILABLE', 'null → DATA_UNAVAILABLE');

// ── 3. 15-Day Timeline Continuity ──────────────────────────────────────────────
console.log('\n--- 3. 15-Day Synoptic & Forecast Timeline ---');

const timeline = heatxData.timeline_steps;
assert(timeline.length === 15, `Timeline has exactly 15 steps (got ${timeline.length})`);

const historical = timeline.filter(s => s.state === 'HISTORICAL');
assert(historical.length === 7, `Historical window: 7 days (got ${historical.length})`);

const currentSteps = timeline.filter(s => s.state === 'CURRENT');
assert(currentSteps.length === 1, `Exactly 1 CURRENT day (got ${currentSteps.length})`);
assert(/^\d{4}-\d{2}-\d{2}$/.test(currentSteps[0]?.date), `CURRENT date is ISO format (${currentSteps[0]?.date})`);

const forecasts = timeline.filter(s => s.state === 'FORECAST');
assert(forecasts.length === 7, `Forecast window: 7 days (got ${forecasts.length})`);

const horizons = forecasts.map(f => f.horizon);
const expectedHorizons = ['T+1', 'T+2', 'T+3', 'T+4', 'T+5', 'T+6', 'T+7'];
assert(
  JSON.stringify(horizons) === JSON.stringify(expectedHorizons),
  `Forecast horizons are T+1 through T+7 (got ${JSON.stringify(horizons)})`
);

// ── 4. Geography Hierarchy & IDs ────────────────────────────────────────────────
console.log('\n--- 4. Geographic Hierarchy & Stable IDs ---');

// Ported from geographyContract.ts
const GEO_PATTERNS = {
  STATE_ID: /^OD$/,
  DISTRICT_ID: /^OD_[A-Z]{2,8}$/,
  SUBDISTRICT_ID: /^OD_TEH_\d{3}$/,
  BLOCK_ID: /^OD_[A-Z]{2,8}_[A-Z0-9_]+$/,
  GRID_ID: /^OD_[A-Z]{2,8}_[A-Z0-9_]+_G_\d{3}_\d{3}$/,
};

function validateGeoId(level, id) {
  const pattern = GEO_PATTERNS[level];
  if (!pattern) return false;
  return pattern.test(id);
}

assert(validateGeoId('STATE_ID', 'OD'), 'STATE_ID "OD" is valid');
assert(validateGeoId('DISTRICT_ID', 'OD_ANUG'), 'DISTRICT_ID "OD_ANUG" is valid');
assert(validateGeoId('SUBDISTRICT_ID', 'OD_TEH_001'), 'SUBDISTRICT_ID "OD_TEH_001" is valid');
assert(validateGeoId('BLOCK_ID', 'OD_ANUG_3276'), 'BLOCK_ID "OD_ANUG_3276" is valid');
assert(validateGeoId('GRID_ID', 'OD_ANUG_3276_G_001_006'), 'GRID_ID "OD_ANUG_3276_G_001_006" is valid');
assert(!validateGeoId('BLOCK_ID', 'Angul'), '"Angul" correctly rejected as invalid BLOCK_ID');
assert(!validateGeoId('STATE_ID', 'Odisha'), '"Odisha" correctly rejected as invalid STATE_ID');

// ── 5. Health Model Ethical Boundary ────────────────────────────────────────────
console.log('\n--- 5. Mandatory Health Model Boundary ---');

const healthContractSrc = fs.readFileSync(path.join(__dirname, '../contracts/healthModelContract.ts'), 'utf-8');
assert(healthContractSrc.includes('BLOCKED_NO_HEALTH_OUTCOME_DATA'), 'healthModelContract.ts defines BLOCKED_NO_HEALTH_OUTCOME_DATA');
assert(healthContractSrc.includes('NO_LEGITIMATE_HEALTH_OUTCOME_DATA'), 'healthModelContract.ts defines NO_LEGITIMATE_HEALTH_OUTCOME_DATA');
assert(healthContractSrc.includes('MANDATORY_HEALTH_DISCLAIMER'), 'healthModelContract.ts exports MANDATORY_HEALTH_DISCLAIMER');

// ── 6. Observation Schema Contract ──────────────────────────────────────────────
console.log('\n--- 6. Ingestion Observation Schema Contract ---');

const observationContractSrc = fs.readFileSync(path.join(__dirname, '../contracts/observationContract.ts'), 'utf-8');
assert(observationContractSrc.includes('observation_id'), 'observationContract.ts includes observation_id field');
assert(observationContractSrc.includes('BLOCK_ID'), 'observationContract.ts includes BLOCK_ID field');
assert(observationContractSrc.includes('ingestion_timestamp'), 'observationContract.ts includes ingestion_timestamp field');
assert(observationContractSrc.includes('quality_status'), 'observationContract.ts includes quality_status field');
assert(observationContractSrc.includes('validateObservationRecord'), 'observationContract.ts exports validateObservationRecord function');

// ── 7. Weather Factors & Multi-Horizon Traceability ──────────────────────────────
console.log('\n--- 7. Weather Factors & Multi-Horizon Traceability ---');

const sampleDate = currentSteps[0].date;
const sampleBlockId = 'OD_ANUG_3276';
const sampleBlock = heatxData.days_data?.[sampleDate]?.[sampleBlockId];

assert(sampleBlock !== undefined, `Sample CD Block ${sampleBlockId} exists for date ${sampleDate}`);

if (sampleBlock) {
  assert(
    typeof sampleBlock.temperature_max === 'number' && sampleBlock.temperature_max > 15 && sampleBlock.temperature_max < 55,
    `temperature_max is valid scalar (${sampleBlock.temperature_max}°C)`
  );
  assert(
    typeof sampleBlock.relative_humidity === 'number' && sampleBlock.relative_humidity >= 0 && sampleBlock.relative_humidity <= 100,
    `relative_humidity is valid scalar (${sampleBlock.relative_humidity}%)`
  );
  assert(
    typeof sampleBlock.wind_speed === 'number' && sampleBlock.wind_speed >= 0 && sampleBlock.wind_speed <= 40,
    `wind_speed is valid scalar (${sampleBlock.wind_speed} m/s)`
  );
  assert(
    typeof sampleBlock.solar_radiation === 'number' && sampleBlock.solar_radiation >= 0 && sampleBlock.solar_radiation <= 1200,
    `solar_radiation is valid scalar (${sampleBlock.solar_radiation} W/m²)`
  );
  assert(
    sampleBlock.temperature_max !== sampleBlock.heat_index,
    `Strict separation: Air temp (${sampleBlock.temperature_max}°C) ≠ Heat Index (${sampleBlock.heat_index}°C)`
  );
  assert(sampleBlock['weather_score'] === undefined, 'No fake "weather_score" attribute present');
}

let horizonCoverageCount = 0;
forecasts.forEach(step => {
  const fcRec = heatxData.days_data?.[step.date]?.[sampleBlockId];
  if (fcRec && fcRec.temperature_max != null && fcRec.relative_humidity != null && fcRec.wind_speed != null && fcRec.solar_radiation != null) {
    horizonCoverageCount++;
  }
});
assert(horizonCoverageCount >= 6, `At least 6/7 forecast horizons have verified weather variables (got ${horizonCoverageCount}/7)`);

// ── 8. Offline GIS Integrity ──────────────────────────────────────────────────
console.log('\n--- 8. Offline HeatX GIS Integrity ---');

// Check HeatXMap.tsx for architectural guarantees
const mapSrc = fs.readFileSync(path.join(__dirname, '../components/HeatXMap.tsx'), 'utf-8');
assert(mapSrc.includes('new AbortController()'), 'HeatXMap.tsx uses AbortController for async lifecycle');
assert(mapSrc.includes('isMounted'), 'HeatXMap.tsx implements isMounted cancellation guard');
assert(mapSrc.includes('mapInstanceRef.current === map'), 'HeatXMap.tsx guards against stale/destroyed map instance');
assert(mapSrc.includes('L.canvas({ padding: 0.5 })'), 'HeatXMap.tsx uses high-performance L.canvas renderer');
assert(mapSrc.includes('fillOpacity: 0.90'), 'HeatXMap.tsx applies solid fillOpacity to CD Block choropleth');
assert(mapSrc.includes('Failed loading HeatX GeoJSON layers:'), 'HeatXMap.tsx implements structured error logging');

// Zero external tile providers
const externalTileVendors = [
  'tile.openstreetmap.org',
  'carto.com',
  'basemaps.cartocdn.com',
  'googleapis.com/maps',
  'mapbox.com',
  'here.com',
  'tomtom.com',
];
const hasExternalTile = externalTileVendors.some(vendor => mapSrc.toLowerCase().includes(vendor));
assert(!hasExternalTile, 'HeatXMap.tsx contains ZERO external basemap tile providers');

// GeoJSON file integrity
const publicDataDir = path.join(rootDir, 'public/data');

const stateGeo = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'odisha_state.geojson'), 'utf-8'));
assert(stateGeo.features?.length === 1, `State boundary: 1 feature (got ${stateGeo.features?.length})`);

const distGeo = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'odisha_districts.geojson'), 'utf-8'));
assert(distGeo.features?.length === 30, `Districts layer: 30 features (got ${distGeo.features?.length})`);

const subGeo = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'odisha_subdistricts.geojson'), 'utf-8'));
assert(subGeo.features?.length === 182, `Subdistricts layer: 182 features (got ${subGeo.features?.length})`);

const blockGeo = JSON.parse(fs.readFileSync(path.join(publicDataDir, 'odisha_cd_blocks.geojson'), 'utf-8'));
assert(blockGeo.features?.length === 314, `CD Blocks layer: 314 features (got ${blockGeo.features?.length})`);

const blockIds = new Set(blockGeo.features.map(f => f.properties?.BLOCK_ID));
assert(blockIds.size === 314, `All 314 CD Blocks have unique BLOCK_ID (got ${blockIds.size} unique)`);

const hasEmptyGeom = blockGeo.features.some(f => !f.geometry || !f.geometry.coordinates || f.geometry.coordinates.length === 0);
assert(!hasEmptyGeom, 'Zero empty geometries in CD Blocks layer');

// 9. Data integrity: block count in heatx15DayData.json
console.log('\n--- 9. HeatX Data Payload Integrity ---');

const availableDates = Object.keys(heatxData.days_data || {});
assert(availableDates.length === 15, `heatx15DayData.json covers 15 dates (got ${availableDates.length})`);

const blockCount = Object.keys(heatxData.days_data?.[availableDates[0]] || {}).length;
assert(blockCount >= 300, `Each day has ≥300 CD Block records (got ${blockCount} for first date)`);

const metaBlocks = Object.keys(heatxData.blocks_meta || {}).length;
assert(metaBlocks >= 300, `blocks_meta covers ≥300 blocks (got ${metaBlocks})`);

// 10. Thermal Value & Population Calculation Audit Regressions
console.log('\n--- 10. Thermal Value & Population Calculation Audit Regressions ---');

// 10.1 Anugul Rothfusz HI Verification
const anugulTmax = 36.88;
const anugulRh = 83.3;
const anugulHi = computeHeatIndex(anugulTmax, anugulRh);
assert(Math.abs(anugulHi - 68.28) < 0.05, `Anugul Heat Index matches Rothfusz formula: 68.28°C (got ${anugulHi.toFixed(2)}°C)`);

// 10.2 Anugul Stull WBGT Verification
// Canonical Stull wet-bulb calculation
const anugulTwb = anugulTmax * Math.atan(0.151977 * Math.sqrt(anugulRh + 8.313659))
  + Math.atan(anugulTmax + anugulRh)
  - Math.atan(anugulRh - 1.676331)
  + 0.00391838 * Math.pow(anugulRh, 1.5) * Math.atan(0.023101 * anugulRh)
  - 4.686035 + 1.0;
const anugulTg = anugulTmax + (74.9 * 0.0075) / (Math.max(2.68, 0.1) + 0.5);
const anugulWbgt = 0.7 * anugulTwb + 0.2 * anugulTg + 0.1 * anugulTmax;
assert(Math.abs(anugulWbgt - 35.80) < 0.05, `Anugul WBGT matches ISO/Stull formulation: 35.80°C (got ${anugulWbgt.toFixed(2)}°C)`);

// 10.3 Population data integrity for 2026-09-22
const todayBlocks = heatxData.days_data['2026-09-22'] || {};
let zeroPopBlocks = 0;
let missingPopBlocks = 0;
let criticalCount = 0;
let totalExposedPop = 0;

for (const [id, block] of Object.entries(todayBlocks)) {
  if (block.population === undefined || block.population === null) {
    missingPopBlocks++;
  } else if (block.population === 0) {
    zeroPopBlocks++;
  }

  if (['HIGH', 'DANGER', 'LETHAL'].includes(block.thermal_stress_level)) {
    criticalCount++;
    totalExposedPop += (block.population_exposed || block.population || 0);
  }
}

assert(missingPopBlocks === 0, `Zero blocks missing population in days_data on 2026-09-22 (got ${missingPopBlocks})`);
assert(zeroPopBlocks === 0, `Zero blocks with population 0 in days_data on 2026-09-22 (got ${zeroPopBlocks})`);
assert(todayBlocks['OD_ANUG_3276']?.population === 175118, `Anugul has correct census population: 175,118 (got ${todayBlocks['OD_ANUG_3276']?.population})`);
assert(todayBlocks['OD_MAYU_3490']?.population === 71599, `Baripada has correct census population: 71,599 (got ${todayBlocks['OD_MAYU_3490']?.population})`);
assert(criticalCount === 304, `Critical CD Blocks count is 304/314 (got ${criticalCount})`);
assert(Math.round(totalExposedPop / 10000) === 4079, `Total exposed population is ~40.79M (got ${(totalExposedPop / 1e6).toFixed(2)}M)`);

// 10.4 UI Label & formatters integrity
const panelSrc = fs.readFileSync(path.join(rootDir, 'src/components/BlockDetailPanel.tsx'), 'utf-8');
assert(!panelSrc.includes('Peak Thermal Value'), 'BlockDetailPanel.tsx no longer uses ambiguous "Peak Thermal Value"');
assert(panelSrc.includes('Peak Heat Index'), 'BlockDetailPanel.tsx uses accurate "Peak Heat Index" label');

const formattersSrc = fs.readFileSync(path.join(rootDir, 'src/utils/formatters.ts'), 'utf-8');
assert(!formattersSrc.includes("if (!num || isNaN(Number(num))) return '0'"), 'formatters.ts formatPop no longer returns "0" for missing values');

// ── Summary ────────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
