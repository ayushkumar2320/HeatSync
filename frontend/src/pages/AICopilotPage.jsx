import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Shield, Database, BrainCircuit, Sparkles } from 'lucide-react';
import { AIAssistant } from '../components/AIAssistant';

const CAPABILITIES = [
  {
    icon: Database,
    title: 'Real Data Only',
    desc: 'Answers derived from XGBoost model predictions, satellite observations, and scenario engine results',
  },
  {
    icon: BrainCircuit,
    title: 'Contextual Awareness',
    desc: 'Understands current map state, selected locations, available scenarios, and model results',
  },
  {
    icon: Shield,
    title: 'Never Fabricates',
    desc: 'When data is unavailable, the AI clearly states what cannot be answered',
  },
  {
    icon: Sparkles,
    title: 'Decision Support',
    desc: 'Relevant metrics, evidence, confidence levels, and recommended next actions',
  },
];

export function AICopilotPage(_props) {
  const { modelInfo, aiStatus, selectedLocation } = _props;
  return (
    <div className="hs-page-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <motion.div className="hs-page-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Bot size={20} color="var(--hs-cyan)" />
        <div>
          <h1 className="hs-display" style={{ fontSize: 'var(--hs-text-2xl)' }}>HEAT AI</h1>
          <p className="hs-body" style={{ fontSize: 'var(--hs-text-sm)' }}>
            Contextual urban heat intelligence &amp; decision-support assistant
          </p>
        </div>
      </motion.div>

      <div className="hs-ai-copilot-layout">
        {/* Main assistant */}
        <div className="hs-ai-copilot-main">
          <AIAssistant
            modelInfo={modelInfo}
            aiStatus={aiStatus}
            selectedLocation={selectedLocation}
          />
        </div>

        {/* Side: capabilities */}
        <div className="hs-ai-copilot-sidebar">
          <div className="hs-ai-capabilities">
            <h3 className="hs-ai-cap-title">How it works</h3>
            <div className="hs-ai-cap-list">
              {CAPABILITIES.map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <motion.div
                    key={i}
                    className="hs-ai-cap-item"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Icon size={14} color="var(--hs-cyan)" />
                    <div>
                      <span className="hs-ai-cap-label">{cap.title}</span>
                      <span className="hs-ai-cap-desc">{cap.desc}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="hs-ai-architecture">
            <h3 className="hs-ai-cap-title">Architecture</h3>
            <div className="hs-ai-arch-diagram">
              <div className="hs-ai-arch-box">User Query</div>
              <div className="hs-ai-arch-arrow">↓</div>
              <div className="hs-ai-arch-box">Context Gatherer</div>
              <div className="hs-ai-arch-arrow">↓</div>
              <div className="hs-ai-arch-box">HEAT AI LLM</div>
              <div className="hs-ai-arch-arrow">↓</div>
              <div className="hs-ai-arch-box">Structured Response</div>
            </div>
            <p className="hs-ai-arch-note">
              The AI is an interface over the digital twin.
              It is NOT the digital twin itself.
              XGBoost remains the numerical prediction engine.
            </p>
          </div>

          <div className="hs-ai-example-queries">
            <h3 className="hs-ai-cap-title">Example queries</h3>
            <ul className="hs-ai-example-list">
              <li>"Why is this area hot?"</li>
              <li>"What happens if I remove 500 trees?"</li>
              <li>"Which intervention gives the highest cooling?"</li>
              <li>"Why is this route cooler?"</li>
              <li>"Compare these two scenarios"</li>
              <li>"How does this area compare to the city average?"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AICopilotPage;
