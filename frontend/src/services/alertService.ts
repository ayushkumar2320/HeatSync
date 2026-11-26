/**
 * alertService.ts
 * Service for managing active civil protection alerts and generating CAP v1.2 XML
 */

export function generateCAPv12Xml(alert: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alert.id || alert.alert_id}</identifier>
  <sender>disaster-mgmt@heatx.odisha.gov.in</sender>
  <sent>${new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Met</category>
    <event>Extreme Heatwave &amp; Thermal Stress</event>
    <urgency>${alert.urgency || 'Immediate'}</urgency>
    <severity>${alert.severity || 'Extreme'}</severity>
    <certainty>${alert.certainty || 'Observed'}</certainty>
    <headline>${alert.headline || `Heat Warning for ${alert.block_name || alert.district}`}</headline>
    <description>${alert.instruction || alert.description || 'Activate District Heat Action Plans.'}</description>
    <instruction>${alert.instruction || 'Suspend outdoor work between 11:00-15:30. Hydrate frequently.'}</instruction>
    <area>
      <areaDesc>Odisha, ${alert.district_name || alert.district} (${alert.block_name || ''})</areaDesc>
    </area>
    <parameter>
      <valueName>HEATX_THERMAL_VALUE</valueName>
      <value>${alert.thermal_value || ''}</value>
    </parameter>
    <parameter>
      <valueName>HEATX_TIER</valueName>
      <value>${alert.status || alert.tier || ''}</value>
    </parameter>
  </info>
</alert>`;
}
