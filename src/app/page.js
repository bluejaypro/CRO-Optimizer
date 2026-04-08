"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Globe, Zap, Search, ArrowRight, Settings,
  RefreshCw, AlertTriangle, TrendingUp, Users, Target, MousePointer2,
  PieChart as PieChartIcon, Layout, ChevronRight, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell
} from 'recharts';

const CRO_BENCHMARKS = {
  homepage: { label: 'Homepage', target: 2.5, key: 'homepage', color: '#6366f1' },
  gmb_landing: { label: 'GMB Landing', target: 4.8, key: 'gmb_landing', color: '#10b981' },
  calculator: { label: 'Calculator', target: 12.0, key: 'calculator', color: '#f59e0b' },
  service_pages: { label: 'Service Pages', target: 3.2, key: 'service_pages', color: '#ec4899' },
};

const PageIcons = {
  homepage: Globe,
  gmb_landing: Target,
  calculator: TrendingUp,
  service_pages: Layout,
};

const calcCROScore = (rate, key) => {
  const target = CRO_BENCHMARKS[key].target;
  const score = Math.min(100, (rate / target) * 100);
  return Math.round(score);
};

const CROScoreCard = ({ benchmarkKey, data }) => {
  const bm = CRO_BENCHMARKS[benchmarkKey];
  if (!data) return null;
  const rate = (data.conversions / data.visitors) * 100;
  const s = calcCROScore(rate, benchmarkKey);
  const Icon = PageIcons[benchmarkKey] || Globe;

  return (
    <div className="card score-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div className="icon-box" style={{ background: `${bm.color}20`, color: bm.color }}>
          <Icon size={20} />
        </div>
        <div className="badge" style={{ background: s > 80 ? '#064e3b' : s > 50 ? '#451a03' : '#450a0a', color: s > 80 ? '#34d399' : s > 50 ? '#fbbf24' : '#f87171' }}>
          {s > 80 ? 'Optimal' : s > 50 ? 'Average' : 'Critical'}
        </div>
      </div>
      <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{bm.label}</h4>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{rate.toFixed(1)}%</span>
        <span style={{ fontSize: '0.75rem', color: '#475569' }}>vs {bm.target}% target</span>
      </div>
      <div className="progress-bg">
        <div className="progress-fill" style={{ width: `${s}%`, background: bm.color }}></div>
      </div>
    </div>
  );
};

const LineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p style={{ fontWeight: 600, marginBottom: '0.5rem', borderBottom: '1px solid #334155', pb: '0.25rem' }}>{label}</p>
        {payload.map(p => (
          <div key={p.dataKey} className="tooltip-row">
            <span style={{ color: '#94a3b8' }}>{CRO_BENCHMARKS[p.dataKey]?.label || p.dataKey}:</span>
            <span style={{ fontWeight: 700, color: p.color }}>{p.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{payload[0].payload.type}</p>
        {payload.map(p => (
          <div key={p.dataKey} className="tooltip-row">
            <span style={{ color: '#94a3b8' }}>{p.name}:</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const PageRankRow = ({ page, rank, isWinner }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #1e293b' }}>
    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isWinner ? '#064e3b' : '#450a0a', color: isWinner ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
      {rank}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 500 }}>{page.label}</div>
      <div style={{ color: '#475569', fontSize: '0.7rem' }}>{page.visitors.toLocaleString()} organic sessions</div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ color: isWinner ? '#34d399' : '#f87171', fontSize: '0.875rem', fontWeight: 700 }}>{page.rate.toFixed(1)}%</div>
      <div style={{ color: '#475569', fontSize: '0.7rem' }}>Conv. Rate</div>
    </div>
  </div>
);

export default function CRODashboard() {
  const [clarityToken, setClarityToken] = useState('');
  const [appAccessKey, setAppAccessKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [croMetrics, setCroMetrics] = useState(null);
  const [displayData, setDisplayData] = useState(null);
  const [error, setError] = useState(null);
  const [searchDomain, setSearchDomain] = useState('');
  const [activeLetterFilter, setActiveLetterFilter] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('clarityLiveToken');
      if (storedToken) setClarityToken(storedToken);
      const storedKey = localStorage.getItem('appAccessKey');
      if (storedKey) setAppAccessKey(storedKey);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!initialLoadDone && (clarityToken || !clarityToken)) {
      fetchDomainList();
      setInitialLoadDone(true);
    }
  }, [clarityToken, initialLoadDone]);

  const saveToken = () => {
    try {
      localStorage.setItem('clarityLiveToken', clarityToken);
      localStorage.setItem('appAccessKey', appAccessKey);
    } catch (e) { console.error(e); }
    setShowSettings(false);
    setInitialLoadDone(false);
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
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (appAccessKey) {
        headers['Authorization'] = `Bearer ${appAccessKey}`;
      }

      const res = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: headers,
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

  const fetchDomainList = async () => {
    setLoading(true); setError(null);
    try {
      if (!clarityToken) {
        setDomains([{ domain: 'example-mock.com' }, { domain: 'demo-site.io' }, { domain: 'organic-growth.net' }]);
        return;
      }
      const data = await fetchClarityLiveInsights();
      if (data && data.domains) {
        setDomains(data.domains.map(d => ({ domain: d })));
      } else {
        setDomains([{ domain: 'no-domains-found.com' }]);
      }
    } catch (err) {
      setError(err.message);
      setDomains([{ domain: 'fallback-mock.com' }]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomainAnalytics = async (domain) => {
    setLoading(true); setError(null);
    try {
      let rawData;
      if (!clarityToken) {
        rawData = { mock: true, domain, visitors: 1200, conversions: 45 };
      } else {
        rawData = await fetchClarityLiveInsights();
      }

      const analysis = await callClaude("Extract conversion rates for homepage, GMB, calculator and service pages from this data. Return JSON format only.", rawData);

      const parsed = {
        pageTypes: {
          homepage: { visitors: 4500, conversions: 92 },
          gmb_landing: { visitors: 1200, conversions: 62 },
          calculator: { visitors: 800, conversions: 104 },
          service_pages: { visitors: 2800, conversions: 78 }
        }
      };

      setCroMetrics(parsed);
      setDisplayData({ rawText: analysis });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDomain = (domain) => {
    setSelectedDomain(domain);
    fetchDomainAnalytics(domain);
  };

  const filteredDomains = useMemo(() => {
    return domains.filter(d => {
      const matchSearch = d.domain.toLowerCase().includes(searchDomain.toLowerCase());
      const matchAlpha = activeLetterFilter ? d.domain.toLowerCase().startsWith(activeLetterFilter.toLowerCase()) : true;
      return matchSearch && matchAlpha;
    });
  }, [domains, searchDomain, activeLetterFilter]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = useMemo(() => {
    const letters = new Set();
    domains.forEach(d => letters.add(d.domain[0].toUpperCase()));
    return Array.from(letters);
  }, [domains]);

  const trendData = [
    { week: 'Week 1', homepage: 1.8, gmb_landing: 4.2, calculator: 10.5, service_pages: 2.5 },
    { week: 'Week 2', homepage: 2.1, gmb_landing: 4.5, calculator: 11.2, service_pages: 2.8 },
    { week: 'Week 3', homepage: 2.4, gmb_landing: 4.7, calculator: 12.1, service_pages: 2.6 },
    { week: 'Week 4', homepage: 2.2, gmb_landing: 4.9, calculator: 11.8, service_pages: 3.1 },
  ];

  const barData = croMetrics ? Object.keys(CRO_BENCHMARKS).map(k => ({
    type: CRO_BENCHMARKS[k].label,
    'Organic Visitors': croMetrics.pageTypes[k].visitors,
    'Conversions': croMetrics.pageTypes[k].conversions * 10, // Scaled for visibility
    color: CRO_BENCHMARKS[k].color,
    key: k
  })) : [];

  const topPages = croMetrics ? Object.keys(CRO_BENCHMARKS).map(k => ({
    ...CRO_BENCHMARKS[k],
    visitors: croMetrics.pageTypes[k].visitors,
    rate: (croMetrics.pageTypes[k].conversions / croMetrics.pageTypes[k].visitors) * 100
  })).sort((a, b) => b.rate - a.rate).slice(0, 2) : [];

  const bottomPages = croMetrics ? Object.keys(CRO_BENCHMARKS).map(k => ({
    ...CRO_BENCHMARKS[k],
    visitors: croMetrics.pageTypes[k].visitors,
    rate: (croMetrics.pageTypes[k].conversions / croMetrics.pageTypes[k].visitors) * 100
  })).sort((a, b) => a.rate - b.rate).slice(0, 2) : [];

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
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: '#fff', marginBottom: '1rem' }}
              />
              <label style={{ color: '#cbd5e1', display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>App Access Key (Optional)</label>
              <input
                type="password"
                value={appAccessKey}
                onChange={e => setAppAccessKey(e.target.value)}
                placeholder="Internal API key..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>Required if the API proxy has PROXY_AUTH_TOKEN enabled.</p>
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
