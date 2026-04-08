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
    }
  };

  const hasRealData = Object.values(pageTypes).some(p => p.visitors !== null);
  return { pageTypes, hasRealData };
};

const generateDemoData = (domain) => {
  const seed = domain.length;
  return {
    isDemo: true,
    pageTypes: {
      homepage: { visitors: 1200 + seed, conversions: 25 + seed, rate: 2.1 },
      gmb: { visitors: 450 + seed, conversions: 32 + seed, rate: 7.1 },
      calculator: { visitors: 300 + seed, conversions: 18 + seed, rate: 6.0 },
      service: { visitors: 800 + seed, conversions: 35 + seed, rate: 4.4 },
    }
  };
};

// --- Components ---
const CROScoreCard = ({ benchmarkKey, data }) => {
  const bm = CRO_BENCHMARKS[benchmarkKey];
  const score = calcCROScore(data?.rate, benchmarkKey);

  return (
    <div className="card score-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{bm.label}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' }}>{data?.rate || 0}% <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#475569' }}>CVR</span></div>
        </div>
        <div style={{ padding: '0.35rem 0.65rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, background: scoreColor(score) + '20', color: scoreColor(score), border: `1px solid ${scoreColor(score)}40` }}>
          {scoreLabel(score)}
        </div>
      </div>

      <div style={{ height: '6px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: '10px', transition: 'width 1s ease-out' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="mini-stat">
          <Users size={12} /> <span>{data?.visitors?.toLocaleString() || 0} Sessions</span>
        </div>
        <div className="mini-stat">
          <Target size={12} /> <span>{data?.conversions?.toLocaleString() || 0} Leads</span>
        </div>
      </div>
    </div>
  );
};

const PageRankRow = ({ page, rank, isWinner }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #1e293b' }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: isWinner ? '#065f46' : '#7f1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: isWinner ? '#34d399' : '#f87171' }}>
      {rank}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>{CRO_BENCHMARKS[page.key].label}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Score: {page.score}/100</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      {isWinner ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="#ef4444" />}
    </div>
  </div>
);

const LineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>{label}</p>
        {payload.map((entry, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: entry.color, fontSize: '0.8125rem', fontWeight: 500 }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
            <span>{entry.name}: {entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '0.75rem', borderRadius: '0.5rem' }}>
        <p style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>{data.type}</p>
        <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Visitors: {data['Organic Visitors'].toLocaleString()}</p>
        <p style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>Conversions: {data.Conversions.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [clarityToken, setClarityToken] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [domainList, setDomainList] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [gbpData, setGbpData] = useState(null);
  const [croMetrics, setCroMetrics] = useState(null);
  const [rawDashboardData, setRawDashboardData] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [searchDomain, setSearchDomain] = useState('');
  const [activeLetterFilter, setActiveLetterFilter] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('clarity_token');
    if (saved) setClarityToken(saved);
  }, []);

  useEffect(() => {
    if (!initialLoadDone) fetchDomainList();
  }, [initialLoadDone]);

  const saveToken = () => {
    localStorage.setItem('clarity_token', clarityToken);
    setShowSettings(false);
    fetchDomainList();
  };

  const fetchClarityLiveInsights = async () => {
    if (!clarityToken) throw new Error("Microsoft Clarity Token is missing.");
    const res = await fetch('/clarity-proxy/export-data/api/v1/project-live-insights', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${clarityToken}`
      }
    });
    if (!res.ok) throw new Error(`Clarity API error: ${res.status}`);
    return await res.json();
  };

  const callClaude = async (query, rawData, retries = 2) => {
    const dataStr = typeof rawData === "string" ? rawData : JSON.stringify(rawData);
    try {
      const res = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Analyze the following Clarity raw data. Query: ${query}\nData: ${dataStr}` }],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error: ${res.status}`);
      }
      const data = await res.json();
      return data.content.filter(i => i.type === 'text').map(i => i.text).join('\n');
    } catch (err) {
      if (retries > 0) { await new Promise(r => setTimeout(r, 1000)); return callClaude(query, dataStr, retries - 1); }
      throw err;
    }
  };

  const fetchDomainList = async () => {
    setLoading(true); setError(null);
    try {
      let domains = [];
      if (clarityToken) {
        const rawData = await fetchClarityLiveInsights();
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
          rawData = await fetchClarityLiveInsights();
          setRawDashboardData(rawData);
        }

        const serializedData = JSON.stringify(rawData);
        const [metricsResult, gbpResult, entryResult, croResult] = await Promise.all([
          callClaude(`For ${domain} last 30 days: Find total organic sessions, unique users, bounce rate, page views. Dead clicks, rage clicks by device. CTA button clicks and form submissions (ContactUs, SubmitForm).`, serializedData),
          callClaude(`For ${domain}: Find Sessions from utm_source=GBP or source containing "GBP". Return text containing exactly "gbp sessions: X" and "gbp conversions: Y".`, serializedData),
          callClaude(`For ${domain}: Categorize entry pages. Return explicitly "homepage sessions: X", "homepage conversions: Y", "calculator sessions: X", "calculator conversions: Y", "service sessions: X", "service conversions: Y"`, serializedData),
          callClaude(`For ${domain}: Pages with highest dead click counts. Pages with CLS scores above 0.1 and their form interaction rates.`, serializedData),
        ]);

        setAnalyticsData({ raw: { metrics: { textResponses: metricsResult }, entry: { toolResults: entryResult }, cro: { toolResults: croResult } }, domain, timestamp: new Date().toISOString() });
        setGbpData({ raw: { textResponses: gbpResult }, domain });

        const parsed = parseCROMetrics(metricsResult, entryResult, gbpResult);
        if (parsed.hasRealData) {
          const pt = parsed.pageTypes;
          Object.keys(pt).forEach(k => {
            if (pt[k].visitors && pt[k].conversions)
              pt[k].rate = parseFloat(((pt[k].conversions / pt[k].visitors) * 100).toFixed(1));
          });
          setCroMetrics({ pageTypes: pt, isDemo: false });
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
  }, []);

  const filteredDomains = useMemo(() => {
    return domainList
      .filter(d => d.domain.toLowerCase().includes(searchDomain.toLowerCase()))
      .filter(d => !activeLetterFilter || d.domain.toLowerCase().startsWith(activeLetterFilter.toLowerCase()))
      .sort((a, b) => b.sessions - a.sessions);
  }, [domainList, searchDomain, activeLetterFilter]);

  const availableLetters = useMemo(() => {
    return [...new Set(domainList.map(d => d.domain[0].toUpperCase()))].sort();
  }, [domainList]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const trendData = useMemo(() => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return weeks.map(w => ({
      week: w,
      homepage: Math.floor(Math.random() * 20) + 70,
      gmb: Math.floor(Math.random() * 20) + 60,
      calculator: Math.floor(Math.random() * 20) + 50,
      service: Math.floor(Math.random() * 20) + 65,
    }));
  }, []);

  const barData = useMemo(() => {
    if (!croMetrics) return [];
    return Object.keys(CRO_BENCHMARKS).map(k => ({
      type: CRO_BENCHMARKS[k].label,
      'Organic Visitors': croMetrics.pageTypes[k].visitors || 0,
      'Conversions': croMetrics.pageTypes[k].conversions || 0,
      color: CRO_BENCHMARKS[k].color,
    }));
  }, [croMetrics]);

  const rankedPages = useMemo(() => {
    if (!croMetrics) return [];
    return Object.keys(CRO_BENCHMARKS).map(k => ({
      key: k,
      score: calcCROScore(croMetrics.pageTypes[k].rate, k)
    })).sort((a, b) => b.score - a.score);
  }, [croMetrics]);

  const topPages = rankedPages.slice(0, 2);
  const bottomPages = rankedPages.slice(-2).reverse();

  const displayData = analyticsData?.raw?.metrics?.textResponses || analyticsData?.raw?.entry?.toolResults || analyticsData?.raw?.cro?.toolResults;

  return (
    <div className="dashboard-container">
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
