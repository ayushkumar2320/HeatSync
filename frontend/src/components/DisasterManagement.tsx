import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar, glassBase } from './Sidebar';
import { BauhausBackground } from './ExploreOdisha';
import { DataSourceBanner, DataSourceBadge } from './DataSourceBanner';
import { getStateSummary, getBlocksForDate, getDistrictsList, getTimelineSteps } from '../adapters/dataAdapter';
import { getThermalTierColor, THERMAL_RISK_TIERS } from '../contracts/thermalRiskContract';
import { generateCAPv12Xml } from '../services/alertService';
import type { CDBlockRecord } from '../types/heatx';

const glassCard: React.CSSProperties = {
  ...glassBase,
  borderRadius: '16px',
  padding: '16px',
};

// Standard Operating Procedures
const SOPs = [
  {
    tier: 'HIGH',
    color: '#f97316',
    title: 'Orange Alert SOP',
    actions: [
      'Activate district heatwave monitoring cells',
      'Issue heat health advisory to PHCs and CHCs',
      'Ensure availability of ORS at all health facilities',
      'Install water kiosks in labour-intensive work sites',
      'Alert ASHA workers to identify vulnerable populations',
    ],
  },
  {
    tier: 'DANGER',
    color: '#ef4444',
    title: 'Red Alert SOP',
    actions: [
      'Suspend outdoor labour between 11:00–15:30 IST',
      'Open cooling centers in all CD Block headquarters',
      'Declare District Heat Emergency through DM offices',
      'Deploy mobile health units (MHU) to high-risk blocks',
      'Mandatory 30-minute work-rest cycle for field workers',
      'Activate heat helpline (108, 1800-XXX-XXXX)',
    ],
  },
  {
    tier: 'LETHAL',
    color: '#a855f7',
    title: 'Lethal Emergency SOP',
    actions: [
      'Immediate suspension of all outdoor activity',
      'Emergency evacuation of outdoor labour to shelters',
      'All cooling centers at maximum capacity — open 24 h',
      'District Collector to issue emergency health order',
      'Coordinate with OSDMA for aerial medical support',
      'Real-time monitoring every 2 hours by surveillance',
    ],
  },
];

export default function DisasterManagement() {
  const timelineSteps = useMemo(() => getTimelineSteps(), []);
  const todayStep = useMemo(
    () => timelineSteps.find(s => s.state === 'CURRENT') || timelineSteps[7],
    [timelineSteps],
  );
  const activeDate = todayStep?.date || new Date().toISOString().slice(0, 10);

  const stateSummary = useMemo(() => getStateSummary(activeDate), [activeDate]);
  const blocksData = useMemo(() => getBlocksForDate(activeDate), [activeDate]);
  const districtsList = useMemo(() => getDistrictsList(), []);

  const [districtFilter, setDistrictFilter] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<CDBlockRecord | null>(null);
  const [capXmlVisible, setCapXmlVisible] = useState(false);
  const [activeSOP, setActiveSOP] = useState<string | null>(null);

  // Active alerts: blocks at HIGH, DANGER, or LETHAL
  const activeAlerts = useMemo(() => {
    return Object.values(blocksData)
      .filter(b => {
        const tier = b.thermal_stress_level;
        const districtMatch = !districtFilter || b.district_name === districtFilter;
        return districtMatch && (tier === 'HIGH' || tier === 'DANGER' || tier === 'LETHAL');
      })
      .sort((a, b) => Number(b.thermal_value ?? 0) - Number(a.thermal_value ?? 0));
  }, [blocksData, districtFilter]);

  // District-wise alert counts
  const districtAlertCounts = useMemo(() => {
    const counts: Record<string, { HIGH: number; DANGER: number; LETHAL: number; maxVal: number }> = {};
    Object.values(blocksData).forEach(b => {
      const dist = b.district_name;
      const tier = b.thermal_stress_level;
      if (!counts[dist]) counts[dist] = { HIGH: 0, DANGER: 0, LETHAL: 0, maxVal: 0 };
      if (tier === 'HIGH') counts[dist].HIGH++;
      else if (tier === 'DANGER') counts[dist].DANGER++;
      else if (tier === 'LETHAL') counts[dist].LETHAL++;
      const v = b.thermal_value ?? 0;
      if (v > counts[dist].maxVal) counts[dist].maxVal = v;
    });
    return Object.entries(counts)
      .filter(([, c]) => c.HIGH + c.DANGER + c.LETHAL > 0)
      .sort(([, a], [, b]) => (b.LETHAL * 3 + b.DANGER * 2 + b.HIGH) - (a.LETHAL * 3 + a.DANGER * 2 + a.HIGH));
  }, [blocksData]);

  const capXml = useMemo(() => {
    if (!selectedAlert) return '';
    return generateCAPv12Xml({
      id: `HEATX-${selectedAlert.block_id}-${activeDate}`,
      block_name: selectedAlert.block_name,
      district_name: selectedAlert.district_name,
      thermal_value: selectedAlert.thermal_value,
      tier: selectedAlert.thermal_stress_level,
      urgency: selectedAlert.thermal_stress_level === 'LETHAL' ? 'Immediate' : 'Expected',
      severity: selectedAlert.thermal_stress_level === 'LETHAL' ? 'Extreme' : 'Severe',
      certainty: 'Observed',
      headline: `${selectedAlert.thermal_stress_level} Heat Alert — ${selectedAlert.block_name}, ${selectedAlert.district_name}`,
    });
  }, [selectedAlert, activeDate]);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(3,47,12,0.65)',
    border: '1px solid rgba(234,155,122,0.3)',
    borderRadius: '10px',
    color: '#f5ead8',
    padding: '8px 12px',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
  };

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
      overflow: 'hidden',
    }}>
      <BauhausBackground />
      <DataSourceBanner />
      <Sidebar currentPath="/disaster-management" />

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          top: '12px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20, textAlign: 'center',
          pointerEvents: 'none', userSelect: 'none',
        }}
      >
        <div style={{
          fontWeight: 800, fontSize: 'clamp(16px, 2.4vw, 24px)',
          letterSpacing: '0.14em', color: '#ea9b7a', textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(3,47,12,0.60)',
        }}>
          Civil Defence · Early Warning Centre
        </div>
        <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', color: 'rgba(234,155,122,0.65)', textTransform: 'uppercase', marginTop: '2px' }}>
          Active Thermal Alerts · CAP v1.2 · District-wise Summary · Standard Operating Procedures
        </div>
      </motion.div>

      {/* Main layout */}
      <div style={{
        position: 'absolute', inset: 0, top: '60px', bottom: '12px',
        display: 'flex', flexDirection: 'row', alignItems: 'stretch',
        padding: '0 16px', gap: '12px', zIndex: 10,
      }}>
        {/* Sidebar space */}
        <div style={{ width: '60px', flexShrink: 0 }} />

        {/* Left: Summary + District Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto' }}
        >
          {/* Statewide Summary */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Statewide Alert Summary — {activeDate} <DataSourceBadge />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Active Alerts', value: activeAlerts.length, color: '#ef4444' },
                { label: 'Critical Blocks', value: stateSummary.criticalCount, color: '#f97316' },
                { label: 'Peak Heat Index', value: stateSummary.maxThermalVal > 0 ? `${stateSummary.maxThermalVal.toFixed(1)}°C` : '—', color: '#a855f7' },
                { label: 'Peak WBGT', value: stateSummary.maxWbgt > 0 ? `${stateSummary.maxWbgt.toFixed(1)}°C` : '—', color: '#f59e0b' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 10px',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(245,234,216,0.55)', marginTop: '2px' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* District Filter */}
          <div style={{ ...glassBase, borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(245,234,216,0.6)', flexShrink: 0 }}>District:</span>
            <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              <option value="">All Districts</option>
              {districtsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* District-wise Alert Summary */}
          <div style={{ ...glassCard, flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              District Summary
            </div>
            {districtAlertCounts.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'rgba(245,234,216,0.4)', textAlign: 'center', padding: '20px 0' }}>
                No active alerts
              </div>
            ) : (
              districtAlertCounts.map(([distName, counts]) => (
                <div
                  key={distName}
                  onClick={() => setDistrictFilter(districtFilter === distName ? '' : distName)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px',
                    cursor: 'pointer', padding: '6px 8px', borderRadius: '8px',
                    background: districtFilter === distName ? 'rgba(234,155,122,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${districtFilter === distName ? 'rgba(234,155,122,0.35)' : 'transparent'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#f5ead8' }}>{distName}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(245,234,216,0.5)', marginTop: 2 }}>
                      Max: {counts.maxVal.toFixed(1)}°C
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {counts.HIGH > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: '#f97316', borderRadius: '5px', padding: '1px 5px' }}>{counts.HIGH}H</span>}
                    {counts.DANGER > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: '#ef4444', borderRadius: '5px', padding: '1px 5px' }}>{counts.DANGER}D</span>}
                    {counts.LETHAL > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', background: '#a855f7', borderRadius: '5px', padding: '1px 5px' }}>{counts.LETHAL}L</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Centre: Active Alert List */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <div style={{ ...glassCard, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: '#ea9b7a',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{
                display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                background: '#ef4444', animation: 'pulse 1.4s ease-in-out infinite',
              }} />
              Active Thermal Alerts ({activeAlerts.length})
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }`}</style>

            {activeAlerts.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '2.5rem' }}>✅</div>
                <div style={{ fontSize: '14px', color: 'rgba(245,234,216,0.6)' }}>No active HIGH/DANGER/LETHAL alerts</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeAlerts.map((alert, i) => {
                  const tierColor = getThermalTierColor(alert.thermal_stress_level);
                  const isSelected = selectedAlert?.block_id === alert.block_id;
                  return (
                    <motion.div
                      key={alert.block_id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => { setSelectedAlert(isSelected ? null : alert); setCapXmlVisible(false); }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${isSelected ? tierColor : 'rgba(255,255,255,0.08)'}`,
                        background: isSelected ? `${tierColor}22` : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: tierColor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f5ead8' }}>
                            {alert.block_name}
                            <span style={{ fontSize: '10px', color: 'rgba(245,234,216,0.55)', fontWeight: 400, marginLeft: 6 }}>
                              {alert.district_name}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(245,234,216,0.55)', marginTop: '2px' }}>
                            ID: {alert.block_id} · {alert.data_status || 'OBSERVED'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: tierColor }}>
                            {alert.thermal_value !== null && alert.thermal_value !== undefined ? `${Number(alert.thermal_value).toFixed(1)}°C` : '—'}
                          </div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: tierColor, textTransform: 'uppercase' }}>
                            {alert.thermal_stress_level}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                            {[
                              { label: 'Air Temp', value: alert.temperature_max != null ? `${Number(alert.temperature_max).toFixed(1)}°C` : '—' },
                              { label: 'Heat Index', value: alert.heat_index != null ? `${Number(alert.heat_index).toFixed(1)}°C` : '—' },
                              { label: 'WBGT', value: alert.wbgt != null ? `${Number(alert.wbgt).toFixed(1)}°C` : '—' },
                            ].map(m => (
                              <div key={m.label} style={{
                                background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
                                padding: '6px 8px', textAlign: 'center',
                              }}>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f5ead8' }}>{m.value}</div>
                                <div style={{ fontSize: '9px', color: 'rgba(245,234,216,0.5)' }}>{m.label}</div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); setCapXmlVisible(!capXmlVisible); }}
                            style={{
                              ...glassBase,
                              border: '1px solid rgba(234,155,122,0.4)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#ea9b7a',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'center',
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {capXmlVisible ? 'Hide' : 'View'} CAP v1.2 XML
                          </button>
                          <AnimatePresence>
                            {capXmlVisible && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                  marginTop: '8px',
                                  background: 'rgba(0,0,0,0.4)',
                                  borderRadius: '8px',
                                  padding: '10px',
                                  fontFamily: 'monospace',
                                  fontSize: '9px',
                                  color: '#22c55e',
                                  overflowX: 'auto',
                                  whiteSpace: 'pre',
                                }}
                              >
                                {capXml}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right: SOPs */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'auto' }}
        >
          <div style={{ ...glassCard, flexShrink: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Standard Operating Procedures
            </div>
            {SOPs.map(sop => (
              <div key={sop.tier} style={{ marginBottom: '10px' }}>
                <button
                  onClick={() => setActiveSOP(activeSOP === sop.tier ? null : sop.tier)}
                  style={{
                    width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '8px', padding: '8px 10px',
                    borderRadius: '10px', border: `1px solid ${sop.color}55`,
                    background: activeSOP === sop.tier ? `${sop.color}22` : 'rgba(255,255,255,0.04)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: sop.color }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: sop.color }}>{sop.title}</span>
                  </div>
                  <span style={{ fontSize: '14px', color: 'rgba(245,234,216,0.5)' }}>{activeSOP === sop.tier ? '▲' : '▼'}</span>
                </button>
                <AnimatePresence>
                  {activeSOP === sop.tier && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        overflow: 'hidden',
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: '0 0 10px 10px',
                        padding: '8px 12px',
                      }}
                    >
                      {sop.actions.map((action, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '5px',
                        }}>
                          <span style={{ color: sop.color, fontSize: '10px', marginTop: '1px', flexShrink: 0 }}>▸</span>
                          <span style={{ fontSize: '11px', color: 'rgba(245,234,216,0.8)', lineHeight: 1.4 }}>{action}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Tier badges */}
          <div style={glassCard}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ea9b7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Thermal Risk Reference
            </div>
            {Object.values(THERMAL_RISK_TIERS).map(tier => (
              <div key={tier.tier} style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px',
              }}>
                <div style={{
                  width: '32px', height: '20px', borderRadius: '6px', background: tier.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {tier.tier.slice(0, 3)}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5ead8' }}>
                    {tier.label} <span style={{ color: 'rgba(245,234,216,0.5)', fontWeight: 400, fontSize: '10px' }}>{tier.threshold}</span>
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(245,234,216,0.5)', lineHeight: 1.4 }}>{tier.description}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
