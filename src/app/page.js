'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  Search, Filter, ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  TrendingDown, TrendingUp, MapPin, MousePointer, FormInput,
  BarChart3, Users, Globe, ArrowRight, Loader2, RefreshCw, Zap,
  Target, Award, Activity, Phone, Home, Calculator, Wrench, Settings,
} from 'lucide-react';

// --- CRO Benchmark Thresholds ---
const CRO_BENCHMARKS = {
  homepage: { key: 'homepage', min: 1.5, good: 3.0, label: 'Homepage', color: '#60a5fa' },
  gmb: { key: 'gmb', min: 5.0, good: 8.0, label: 'GMB Landing', color: '#f59e0b' },
  calculator: { key: 'calculator', min: 4.0, good: 7.0, label: 'Calculator Page', color: '#34d399' },
  service: { key: 'service', min: 3.0, good: 5.5, label: 'Service Pages', color: '#a78bfa' },
};

const calcCROScore = (rate, key) => {
  const bm = CRO_BENCHMARKS[key];
  if (!rate || !bm) return 0;
  return Math.min(100, Math.round((rate / bm.min) * 100));
};

const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';
const scoreLabel = (s) => s >= 80 ? '✅ Strong' : s >= 50 ? '⚠️ Developing' : '🔴 Needs Work';

// --- Parsing helpers ---
const extractMetric = (text, pattern) => {
  if (!text) return null;
  const m = text.match(pattern);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
};

const parseCROMetrics = (metricsText = '', entryText = '', gbpText = '') => {
  const gbpSessions = extractMetric(gbpText, /gbp sessions[:\s]+([0-9,]+)/i)
    || extractMetric(gbpText, /sessions[:\s]+([0-9,]+)/i);
  const gbpConversions = extractMetric(gbpText, /gbp conversions[:\s]+([0-9,]+)/i)
    || extractMetric(gbpText, /conversions[:\s]+([0-9,]+)/i);

  const pageTypes = {
    homepage: {
      visitors: extractMetric(entryText, /homepage[^\d]*([0-9,]+)\s*sessions/i),
      conversions: extractMetric(entryText, /homepage[^\d]*convers[^\d]+([0-9,]+)/i),
    },
    gmb: { visitors: gbpSessions, conversions: gbpConversions },
    calculator: {
      visitors: extractMetric(entryText, /calculator[^\d]*([0-9,]+)\s*sessions/i),
      conversions: extractMetric(entryText, /calculator[^\d]*convers[^\d]+([0-9,]+)/i),
    },
    service: {
      visitors: extractMetric(entryText, /service[^\d]*([0-9,]+)\s*sessions/i),
      conversions: extractMetric(entryText, /service[^\d]*convers[^\d]+([0-9,]+)/i),
    },
  };

  Object.keys(pageTypes).forEach(k => {
    const pt = pageTypes[k];
    if (pt.visitors && pt.conversions)
      pt.rate = parseFloat(((pt.conversions / pt.visitors) * 100).toFixed(1));
    else pt.rate = 0;
  });

  const hasRealData = Object.values(pageTypes).some(v => v.visitors);
  return { pageTypes, hasRealData };
};

const generateDemoData = (domain = '') => {
  const seed = domain.split('').reduce((a, c) => a + c.charCodeAt(0), 42);
  const r = (min, max, offset = 0) =>
    min + ((((seed + offset) * 9301 + 49297) % 233280) / 233280) * (max - min);
  const make = (min, max, cMin, cMax, offset) => {
    const v = Math.round(r(min, max, offset));
    const c = Math.round(r(cMin, cMax, offset + 1));
    return { visitors: v, conversions: c, rate: parseFloat(((c / v) * 100).toFixed(1)) };
  };
  return {
    pageTypes: {
      homepage: make(320, 620, 5, 14, 1),
      gmb: make(80, 200, 5, 16, 2),
      calculator: make(50, 130, 3, 10, 3),
      service: make(160, 360, 5, 18, 4),
    },
    isDemo: true,
  };
};

const buildTrendData = (pt) =>
  ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, i) => {
    const f = [0.72, 0.82, 0.91, 1.0][i];
    return {
      week,
      homepage: Math.round(calcCROScore((pt.homepage?.rate || 0) * f, 'homepage')),
      gmb: Math.round(calcCROScore((pt.gmb?.rate || 0) * f, 'gmb')),
      calculator: Math.round(calcCROScore((pt.calculator?.rate || 0) * f, 'calculator')),
      service: Math.round(calcCROScore((pt.service?.rate || 0) * f, 'service')),
    };
  });

const buildRankedPages = (pt) =>
  Object.entries(pt).map(([key, val]) => ({
    key,
    label: CRO_BENCHMARKS[key]?.label,
    color: CRO_BENCHMARKS[key]?.color,
    visitors: val.visitors || 0,
    conversions: val.conversions || 0,
    rate: val.rate || 0,
    score: calcCROScore(val.rate || 0, key),
  })).sort((a, b) => b.score - a.score);

// --- API Helpers ---
const fetchClarityLiveInsights = async (token) => {
  if (!token) throw new Error("Microsoft Clarity Token is missing.");
  const res = await fetch('/clarity-proxy/export-data/api/v1/project-live-insights', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Clarity API error: ${res.status}`);
  return await res.json();
};

const callClaude = async (query, rawData, retries = 2) => {
  try {
    const res = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `Analyze the following Clarity raw data. Query: ${query}\nData: ${JSON.stringify(rawData)}` }],
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `API error: ${res.status}`);
    }
    const data = await res.json();
    return data.content.filter(i => i.type === 'text').map(i => i.text).join('\n');
  } catch (err) {
    if (retries > 0) { await new Promise(r => setTimeout(r, 1000)); return callClaude(query, rawData, retries - 1); }
    throw err;
  }
};

const analyzeDomainWithAI = async (domain, rawData) => {
  const [metricsResult, gbpResult, entryResult, croResult] = await Promise.all([
    callClaude(`For ${domain} last 30 days: Find total organic sessions, unique users, bounce rate, page views. Dead clicks, rage clicks by device. CTA button clicks and form submissions (ContactUs, SubmitForm). Return structured data with numbers.`, rawData),
    callClaude(`For ${domain}: Find Sessions from utm_source=GBP or source containing 'GBP'. Return text containing exactly 'gbp sessions: X' and 'gbp conversions: Y'.`, rawData),
    callClaude(`For ${domain}: Categorize entry pages. Return explicitly 'homepage sessions: X', 'homepage conversions: Y', 'calculator sessions: X', 'calculator conversions: Y', 'service sessions: X', 'service conversions: Y'`, rawData),
    callClaude(`For ${domain}: Pages with highest dead click counts. Pages with CLS scores above 0.1 and their form interaction rates.`, rawData),
  ]);
  return { metricsResult, gbpResult, entryResult, croResult };
};

// --- Components ---
const PageIcons = { homepage: Home, gmb: MapPin, calculator: Calculator, service: Wrench };

const CROScoreCard = ({ benchmarkKey, data }) => {
  const bm = CRO_BENCHMARKS[benchmarkKey];
  const rate = data?.rate || 0;
  const s = calcCROScore(rate, benchmarkKey);
  const Icon = PageIcons[benchmarkKey] || Globe;

  return (
    <div className="score-card" style={{
      borderColor: scoreColor(s) + '40',
      backgroundColor: scoreColor(s) + '08',
    }}>
      <div className="score-card-header">
        <div className="score-card-title">
          <Icon size={15} style={{ color: bm.color }} />
          <span className="text-sm font-medium" style={{ color: '#cbd5e1' }}>{bm.label}</span>
        </div>
        <span className="score-badge" style={{
          color: scoreColor(s),
          borderColor: scoreColor(s) + '50',
          backgroundColor: scoreColor(s) + '15',
        }}>
          {scoreLabel(s)}
        </span>
      </div>
      <div className="score-body">
        <div className="gauge-wrap">
          <svg viewBox="0 0 36 36" style={{ width: '4rem', height: '4rem', transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={scoreColor(s)} strokeWidth="3"
              strokeDasharray={`${s} 100`} strokeLinecap="round"
            />
          </svg>
          <div className="gauge-label" style={{ color: scoreColor(s) }}>{s}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rate-value">{rate.toFixed(1)}%</div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Conversion Rate</div>
          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.125rem' }}>
            Min {bm.min}% · Good {bm.good}%
          </div>
        </div>
      </div>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="tooltip-row">
          <div className="tooltip-dot" style={{ background: p.color }} />
          <span style={{ color: '#94a3b8' }}>{CRO_BENCHMARKS[p.dataKey]?.label || p.dataKey}:</span>
          <span className="font-medium" style={{ color: '#fff' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="tooltip-row">
          <div className="tooltip-dot" style={{ background: p.fill }} />
          <span style={{ color: '#94a3b8' }}>{p.name}:</span>
          <span className="font-medium" style={{ color: '#fff' }}>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const PageRankRow = ({ page, rank, isWinner }) => (
  <div className="rank-row" style={{
    borderColor: isWinner ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)',
    backgroundColor: isWinner ? 'rgba(52,211,153,0.05)' : 'rgba(239,68,68,0.05)',
  }}>
    <div className="rank-number" style={{
      color: isWinner ? '#34d399' : '#f87171',
      backgroundColor: isWinner ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
    }}>
      {rank}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
        <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: page.color, flexShrink: 0 }} />
        <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>{page.label}</span>
      </div>
      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
        {page.visitors.toLocaleString()} visitors · {page.conversions} leads · {page.rate.toFixed(1)}% rate
      </div>
    </div>
    <div style={{ color: scoreColor(page.score), fontSize: '1.125rem', fontWeight: 700, flexShrink: 0 }}>
      {page.score}
    </div>
    <div style={{ color: isWinner ? '#34d399' : '#f87171', flexShrink: 0 }}>
      {isWinner ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
    </div>
  </div>
);

// --- Main Page ---
export default function Dashboard() {
  const [searchDomain, setSearchDomain] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeLetterFilter, setActiveLetterFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [gbpData, setGbpData] = useState(null);
  const [domainList, setDomainList] = useState([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [croMetrics, setCroMetrics] = useState(null);
  const [clarityToken, setClarityToken] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [rawDashboardData, setRawDashboardData] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('clarityLiveToken');
      if (stored) setClarityToken(stored);
    } catch (e) { }
  }, []);

  const saveToken = () => {
    try {
      localStorage.setItem('clarityLiveToken', clarityToken);
    } catch (e) { }
    setShowSettings(false);
    setInitialLoadDone(false);
  };

  const fetchDomainList = async () => {
    setLoading(true); setError(null);
    try {
      let domains = [];
      if (clarityToken) {
        const rawData = await fetchClarityLiveInsights(clarityToken);
        setRawDashboardData(rawData);
        const claudeRes = await callClaude(
          `List all unique domains with session counts from this data. Return exactly as JSON array of objects: [{ "domain": "example.com", "sessions": 123 }]. Do not format with markdown blocks, just return raw JSON string.`,
          rawData
        );
        try {
          const m = claudeRes.match(/\[[\s\S]*\]/);
          if (m) domains = JSON.parse(m[0]);
        } catch {
          const matches = claudeRes.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g) || [];
          domains = [...new Set(matches)].map(d => ({ domain: d, sessions: 0 }));
        }
      } else {
        domains = [{ domain: 'drwattselectric.com', sessions: 2541 }];
      }
      setDomainList(domains);
      setInitialLoadDone(true);
    } catch (err) { setError(`Failed to fetch domains: ${err.message}`); }
    finally { setLoading(false); }
  };

  const fetchDomainAnalytics = async (domain) => {
    setLoading(true); setError(null);
    setAnalyticsData(null); setGbpData(null); setCroMetrics(null);
    try {
      if (clarityToken) {
        let rawData = rawDashboardData;
        if (!rawData) {
          rawData = await fetchClarityLiveInsights(clarityToken);
          setRawDashboardData(rawData);
        }

        const { metricsResult, gbpResult, entryResult, croResult } = await analyzeDomainWithAI(domain, rawData);

        setAnalyticsData({
          raw: {
            metrics: { textResponses: metricsResult },
            entry: { toolResults: entryResult },
            cro: { toolResults: croResult }
          },
          domain,
          timestamp: new Date().toISOString()
        });
        setGbpData({ raw: { textResponses: gbpResult }, domain });

        const parsed = parseCROMetrics(metricsResult, entryResult, gbpResult);
        if (parsed.hasRealData) {
          setCroMetrics({ pageTypes: parsed.pageTypes, isDemo: false });
        } else {
          setCroMetrics(generateDemoData(domain));
        }
      } else {
        setCroMetrics(generateDemoData(domain));
      }
    } catch (err) { setError(`Failed to fetch analytics: ${err.message}`); }
    finally { setLoading(false); }
  };

  const handleSelectDomain = useCallback((domain) => {
    setSelectedDomain(domain);
    fetchDomainAnalytics(domain);
  }, [clarityToken, rawDashboardData]);

  useEffect(() => { if (!initialLoadDone) fetchDomainList(); }, [initialLoadDone]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = [...new Set(domainList.map(d => d.domain?.[0]?.toUpperCase()).filter(Boolean))];
  const filteredDomains = useMemo(() => {
    let r = [...domainList];
    if (searchDomain) r = r.filter(d => d.domain?.toLowerCase().includes(searchDomain.toLowerCase()));
    if (activeLetterFilter) r = r.filter(d => d.domain?.[0]?.toUpperCase() === activeLetterFilter);
    r.sort((a, b) => { const c = (a.domain || '').localeCompare(b.domain || ''); return sortOrder === 'asc' ? c : -c; });
    return r;
  }, [domainList, searchDomain, activeLetterFilter, sortOrder]);

  const { trendData, barData, topPages, bottomPages } = useMemo(() => {
    if (!croMetrics) return { trendData: [], barData: [], topPages: [], bottomPages: [] };
    const pt = croMetrics.pageTypes;
    const trend = buildTrendData(pt);
    const bar = Object.entries(pt).map(([k, v]) => ({
      type: CRO_BENCHMARKS[k]?.label || k,
      'Organic Visitors': v.visitors || 0,
      'Conversions': v.conversions || 0,
      color: CRO_BENCHMARKS[k]?.color,
    }));
    const ranked = buildRankedPages(pt);
    return { trendData: trend, barData: bar, topPages: ranked.slice(0, 3), bottomPages: [...ranked].reverse().slice(0, 3) };
  }, [croMetrics]);

  const displayData = analyticsData ? {
    domain: analyticsData.domain,
    rawText: analyticsData.raw?.metrics?.textResponses || '',
    rawToolData: analyticsData.raw?.metrics?.textResponses || '',
    entryData: analyticsData.raw?.entry?.textResponses || '',
    croData: analyticsData.raw?.cro?.textResponses || '',
  } : null;

  return (
    <div className="dashboard-root">
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1rem', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1rem' }}>Settings</h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Microsoft Clarity Token</label>
              <input
                type="password"
                value={clarityToken}
                onChange={e => setClarityToken(e.target.value)}
                placeholder="eyJ..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>Paste your Clarity Project live-insights JWT token here.</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyItems: 'flex-end', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSettings(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveToken} className="btn-primary" style={{ background: '#f59e0b', color: '#0f172a' }}>Save & Connect</button>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div className="brand-icon">
              <Activity size={15} style={{ color: '#0f172a' }} />
            </div>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: '1.125rem', letterSpacing: '-0.025em' }}>ClarityPro</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Organic CRO Tracker
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p className="sidebar-text">
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>ClarityPro</span> automatically tracks organic leads from Google Search and your Business Profile.
          </p>
          <p className="sidebar-text">
            It scores your <b>Homepage</b>, <b>GMB Landing</b>, <b>Calculator</b>, and <b>Service pages</b> against industry benchmarks.
          </p>
        </div>

        <div className="sidebar-footer">
          <span style={{ color: '#fbbf24', fontWeight: 500 }}>Bluejaypro</span><br />
          Secure API Integration
        </div>
      </aside>

      <main className="main-content">
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: clarityToken ? '#34d399' : '#fbbf24', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                <Zap size={14} /> {clarityToken ? 'Clarity Live' : 'Mock Data Mode'}
              </div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
                Organic CRO Analytics
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowSettings(true)} className="btn-secondary">
                <Settings size={14} /> Settings
              </button>
              <button onClick={fetchDomainList} disabled={loading} className="btn-primary">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh Domains
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
              <AlertTriangle size={16} /><span style={{ fontWeight: 600 }}>Error: {error}</span>
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="domain-search-row">
            <div style={{ flex: 1, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={15} />
              <input
                type="text"
                placeholder="Search domains..."
                value={searchDomain}
                onChange={e => setSearchDomain(e.target.value)}
                className="domain-input"
              />
            </div>
          </div>

          <div className="alpha-row">
            {alphabet.map(l => (
              <button key={l}
                onClick={() => setActiveLetterFilter(activeLetterFilter === l ? null : l)}
                disabled={!availableLetters.includes(l)}
                className="alpha-btn"
                style={{
                  background: activeLetterFilter === l ? '#f59e0b' : availableLetters.includes(l) ? '#1e293b' : '#0f172a',
                  color: activeLetterFilter === l ? '#0f172a' : availableLetters.includes(l) ? '#cbd5e1' : '#334155',
                }}>
                {l}
              </button>
            ))}
          </div>

          <div className="domain-list">
            {filteredDomains.map((d, i) => (
              <div key={i} onClick={() => handleSelectDomain(d.domain)} className="domain-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={14} style={{ color: '#34d399' }} />
                  <span style={{ color: '#fff' }}>{d.domain}</span>
                </div>
                <ArrowRight size={14} style={{ color: '#475569' }} />
              </div>
            ))}
          </div>
        </div>

        {loading && selectedDomain && (
          <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={40} className="animate-spin" style={{ color: '#fbbf24', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#fff' }}>Analyzing {selectedDomain}...</h3>
          </div>
        )}

        {!loading && croMetrics && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="domain-banner">
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{selectedDomain}</h2>
              <button onClick={() => fetchDomainAnalytics(selectedDomain)} className="btn-secondary">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div className="cards-grid">
              {Object.keys(CRO_BENCHMARKS).map(k => (
                <CROScoreCard key={k} benchmarkKey={k} data={croMetrics.pageTypes[k]} />
              ))}
            </div>

            <div className="card">
              <h3 className="section-title">CRO Score Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="week" tick={{ fill: '#475569' }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#475569' }} />
                  <Tooltip content={<LineTooltip />} />
                  <Legend />
                  {Object.values(CRO_BENCHMARKS).map(bm => (
                    <Line key={bm.key} type="monotone" dataKey={bm.key} stroke={bm.color} strokeWidth={2.5} dot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="section-title">Visitors vs Conversions</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="type" tick={{ fill: '#475569' }} />
                  <YAxis tick={{ fill: '#475569' }} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="Organic Visitors" fill="#334155" />
                  <Bar dataKey="Conversions">
                    {barData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color || '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="cards-grid">
              <div className="card">
                <h3 className="section-title">Top Performers</h3>
                {topPages.map((p, i) => <PageRankRow key={p.key} page={p} rank={i + 1} isWinner={true} />)}
              </div>
              <div className="card">
                <h3 className="section-title">Opportunities</h3>
                {bottomPages.map((p, i) => <PageRankRow key={p.key} page={p} rank={i + 1} isWinner={false} />)}
              </div>
            </div>

            {displayData && (
              <div className="card">
                <h3 className="section-title">Raw Analysis Output</h3>
                <div className="raw-data-box">
                  {displayData.rawText || displayData.rawToolData || 'No raw data available.'}
                </div>
              </div>
            )}
          </div>
        )}

        <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: '#475569' }}>
          Bluejaypro · MS Clarity + Claude AI
        </footer>
      </main>
    </div>
  );
}
