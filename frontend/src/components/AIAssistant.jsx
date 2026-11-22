import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Loader2, Sparkles, CheckCircle2, AlertTriangle,
  Database, BrainCircuit, ChevronDown, ChevronRight, Eye,
  BarChart3, Shield, ArrowRight, X, Maximize2, Minimize2
} from 'lucide-react';
import { askAI } from '../services/backendClient';
import { useLiveData } from '../context/LiveDataContext';
import {
  gatherFullContext, buildAIContextPayload,
  getContextualSuggestions, parseAIResponse
} from '../services/aiContextService';

/* -------------------------------------------------------------------------- */
/* Animation                                                                   */
/* -------------------------------------------------------------------------- */

const ANIM = {
  fadeUp:    { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } },
  fadeIn:    { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } },
  stagger:   { visible: { transition: { staggerChildren: 0.04 } } },
  child:     { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } },
};

/* -------------------------------------------------------------------------- */
/* Confidence badge                                                            */
/* -------------------------------------------------------------------------- */

function ConfidenceBadge({ level }) {
  const config = {
    high:   { color: 'var(--hs-success)', label: 'HIGH', icon: CheckCircle2 },
    medium: { color: 'var(--hs-warning)', label: 'MEDIUM', icon: Eye },
    low:    { color: 'var(--hs-heat)',    label: 'LOW', icon: AlertTriangle },
  };
  const c = config[level] || config.low;
  const Icon = c.icon;
  return (
    <span className="hs-ai-confidence" style={{ color: c.color, borderColor: c.color }}>
      <Icon size={10} />
      {c.label} CONFIDENCE
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Metric chip                                                                 */
/* -------------------------------------------------------------------------- */

function MetricChip({ metric }) {
  const icons = {
    temperature: () => <span style={{ color: 'var(--hs-heat)' }}>🌡</span>,
    percentage: () => <span style={{ color: 'var(--hs-vegetation)' }}>%</span>,
    default: () => <BarChart3 size={10} />,
  };
  const IconFn = icons[metric.type] || icons.default;
  return (
    <span className="hs-ai-metric-chip">
      <IconFn />
      <span>{metric.label}: {metric.value}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Evidence item                                                               */
/* -------------------------------------------------------------------------- */

function EvidenceItem({ item }) {
  return (
    <span className="hs-ai-evidence-chip">
      {item.type === 'data' ? <Database size={10} /> : <BrainCircuit size={10} />}
      {item.source}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation message                                                        */
/* ----------------------------------------------------------------─────────── */

function Message({ msg }) {
  const [expanded, setExpanded] = useState(false);

  if (msg.role === 'user') {
    return (
      <motion.div className="hs-ai-msg hs-ai-msg-user" variants={ANIM.child}>
        <div className="hs-ai-msg-bubble user">
          {msg.text}
        </div>
      </motion.div>
    );
  }

  // Assistant message
  const parsed = msg.parsed;
  return (
    <motion.div className="hs-ai-msg hs-ai-msg-assistant" variants={ANIM.child}>
      <div className="hs-ai-msg-icon">
        <Bot size={14} />
      </div>
      <div className="hs-ai-msg-content">
        {/* Answer */}
        <div className="hs-ai-answer-text">{parsed.answer}</div>

        {/* Confidence */}
        {parsed.confidence && (
          <div className="hs-ai-answer-confidence">
            <ConfidenceBadge level={parsed.confidence} />
          </div>
        )}

        {/* Metrics */}
        {parsed.metrics?.length > 0 && (
          <div className="hs-ai-metrics">
            {parsed.metrics.map((m, i) => (
              <MetricChip key={i} metric={m} />
            ))}
          </div>
        )}

        {/* Evidence (collapsible) */}
        {parsed.evidence?.length > 0 && (
          <div className="hs-ai-evidence">
            <button
              className="hs-ai-evidence-toggle"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              <span>{parsed.evidence.length} data source{parsed.evidence.length > 1 ? 's' : ''} used</span>
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  className="hs-ai-evidence-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {parsed.evidence.map((e, i) => (
                    <EvidenceItem key={i} item={e} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Recommended action */}
        {parsed.action && (
          <div className="hs-ai-action">
            <ArrowRight size={10} />
            <span>{parsed.action}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export const AIAssistant = ({
  aiStatus,
  selectedLocation,
  compact = false,
}) => {
  const { weather, prediction } = useLiveData();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [fullContext, setFullContext] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [contextError, setContextError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const configured = aiStatus?.status === 'configured';

  // Gather context on mount and when location changes
  useEffect(() => {
    let stale = false;
    setContextLoading(true);
    setContextError(null);

    gatherFullContext(selectedLocation)
      .then(ctx => {
        if (!stale) {
          setFullContext(ctx);
          setSuggestions(getContextualSuggestions(ctx));
        }
      })
      .catch(err => {
        if (!stale) {
          setContextError(err.message);
          setSuggestions([
            { question: 'Which areas are hottest?', category: 'analysis' },
            { question: 'What are the main heat drivers?', category: 'analysis' },
            { question: 'Which intervention gives the highest cooling?', category: 'compare' },
          ]);
        }
      })
      .finally(() => {
        if (!stale) setContextLoading(false);
      });

    return () => { stale = true; };
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ask question
  const handleAsk = useCallback(async (text) => {
    const q = (text ?? question).trim();
    if (!q || loading) return;

    // Add user message
    const userMsg = { role: 'user', text: q, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      // Build context payload
      const contextPayload = buildAIContextPayload(fullContext || {});

      // Add live data to context
      if (weather?.temperature != null) {
        contextPayload.weather = {
          temperature: weather.temperature,
          humidity: weather.humidity,
          wind_speed: weather.windSpeed,
        };
      }
      if (prediction) {
        contextPayload.prediction = contextPayload.prediction || {};
        contextPayload.prediction.available = true;
      }

      // Ask backend
      const res = await askAI(q, contextPayload);

      // Parse response
      const parsed = parseAIResponse(res);

      const assistantMsg = {
        role: 'assistant',
        text: res.answer,
        parsed,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg = {
        role: 'assistant',
        text: 'I could not process that question. The AI service may be temporarily unavailable.',
        parsed: {
          answer: 'The AI service is currently unavailable. This may be due to backend configuration (NEMOTRON_API_KEY) or service connectivity. The XGBoost model and scenario engine remain fully operational for direct queries.',
          evidence: [],
          metrics: [],
          confidence: 'low',
          action: 'Check AI configuration in .env or use Scenario Lab directly.',
        },
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [question, loading, fullContext, weather, prediction]);

  // Clear conversation
  const handleClear = useCallback(() => {
    setMessages([]);
    setQuestion('');
  }, []);

  // Handle suggested question click
  const handleSuggestion = useCallback((suggestion) => {
    setQuestion(suggestion.question);
    handleAsk(suggestion.question);
  }, [handleAsk]);

  return (
    <div className={`hs-ai-container ${compact ? 'compact' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Toggle bar (when compact) */}
      {compact && (
        <button className="hs-ai-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          <Bot size={14} />
          <span className="hs-ai-toggle-label">HEAT AI</span>
          {contextLoading && <Loader2 size={10} className="hs-ai-spin" />}
          {!contextLoading && fullContext && (
            <span className="hs-ai-context-badge">
              {fullContext.data_sources.length} sources
            </span>
          )}
          {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      )}

      {/* Main panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="hs-ai-panel"
            initial={compact ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="hs-ai-header">
              <div className="hs-ai-header-left">
                <Bot size={14} color="var(--hs-cyan)" />
                <span className="hs-ai-header-title">HEAT AI Assistant</span>
              </div>
              <div className="hs-ai-header-right">
                {configured ? (
                  <span className="hs-ai-status hs-ai-status-ok">
                    <CheckCircle2 size={10} /> Ready
                  </span>
                ) : (
                  <span className="hs-ai-status hs-ai-status-warn">
                    <AlertTriangle size={10} /> Config required
                  </span>
                )}
                {messages.length > 0 && (
                  <button className="hs-ai-header-btn" onClick={handleClear} title="Clear conversation">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Messages area */}
            <div className="hs-ai-messages">
              {messages.length === 0 && !loading && (
                <div className="hs-ai-welcome">
                  <div className="hs-ai-welcome-icon">
                    <Bot size={24} />
                  </div>
                  <p className="hs-ai-welcome-text">
                    Ask me about urban heat. I use real data from the XGBoost model,
                    satellite observations, and scenario engine.
                  </p>
                  {contextLoading && (
                    <div className="hs-ai-context-loading">
                      <Loader2 size={12} className="hs-ai-spin" />
                      Loading context...
                    </div>
                  )}
                  {!contextLoading && contextError && (
                    <div className="hs-ai-context-error">
                      <AlertTriangle size={10} /> Partial context loaded
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {messages.map((msg, i) => (
                  <Message key={msg.timestamp} msg={msg} isLast={i === messages.length - 1} />
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div className="hs-ai-msg hs-ai-msg-assistant" variants={ANIM.child}>
                  <div className="hs-ai-msg-icon">
                    <Bot size={14} />
                  </div>
                  <div className="hs-ai-typing">
                    <span className="hs-ai-typing-dot" />
                    <span className="hs-ai-typing-dot" />
                    <span className="hs-ai-typing-dot" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions */}
            {messages.length === 0 && suggestions.length > 0 && (
              <div className="hs-ai-suggestions">
                <div className="hs-ai-suggestions-label">
                  <Sparkles size={10} />
                  <span>Try asking</span>
                </div>
                <div className="hs-ai-suggestion-chips">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      className="hs-ai-suggestion-chip"
                      onClick={() => handleSuggestion(s)}
                      disabled={loading}
                    >
                      {s.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="hs-ai-input-area">
              <div className="hs-ai-input-row">
                <input
                  ref={inputRef}
                  className="hs-ai-input"
                  placeholder={
                    selectedLocation
                      ? `Ask about ${selectedLocation.name || 'this location'}...`
                      : 'Ask about urban heat...'
                  }
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
                  disabled={loading}
                />
                <button
                  className="hs-ai-send-btn"
                  onClick={() => handleAsk()}
                  disabled={loading || !question.trim()}
                >
                  {loading ? <Loader2 size={14} className="hs-ai-spin" /> : <Send size={14} />}
                </button>
              </div>
              <div className="hs-ai-input-footer">
                <span className="hs-ai-input-note">
                  <Shield size={9} />
                  AI explains real data only — never invents numbers
                </span>
                {fullContext && (
                  <span className="hs-ai-input-sources">
                    {fullContext.data_sources.length} sources loaded
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIAssistant;
