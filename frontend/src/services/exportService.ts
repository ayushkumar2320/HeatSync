/**
 * exportService.ts
 * Generates operational CSV and JSON datasets for Odisha SDMA and District Collectors
 */

export function exportBlocksToCSV(blocks: any[], date: string) {
  if (!blocks || blocks.length === 0) return;

  const headers = [
    'BLOCK_ID',
    'BLOCK_NAME',
    'DISTRICT_NAME',
    'DATE',
    'THERMAL_VALUE_DEGC',
    'STATUS_LEVEL',
    'WBGT_DEGC',
    'HEAT_INDEX_DEGC',
    'POPULATION_EXPOSED',
  ];

  const rows = blocks.map(b => [
    b.block_id,
    `"${b.block_name}"`,
    `"${b.district_name}"`,
    date,
    b.thermal_value ?? b.heat_index ?? 30.0,
    b.thermal_stress_level,
    b.wbgt,
    b.heat_index,
    b.population_exposed || 0,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `HeatX_Odisha_CD_Blocks_${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
