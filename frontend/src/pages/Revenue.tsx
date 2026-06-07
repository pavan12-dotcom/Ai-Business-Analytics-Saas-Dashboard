import { useState } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useNavigate } from 'react-router-dom'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area,
  BarChart, Bar, Cell
} from 'recharts'

import './Revenue.css'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyChart({ message, height = 200 }: { message?: string; height?: number }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'var(--text-muted)',
        border: '1.5px dashed var(--border2)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(99,102,241,0.02)',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>No data available</span>
      <span style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 220 }}>
        {message || "Upload a CSV, Excel, or JSON file to generate insights."}
      </span>
    </div>
  )
}

export default function Revenue() {
  const { analytics, hasData } = useSpreadsheet()
  const navigate = useNavigate()

  const { customers = [], kpis = [], monthly = [], categories = [], datasetType, valueMetricName } = analytics

  const [revenueView, setRevenueView] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')

  const activeCustomers = customers.filter(c => c.status === 'Active')
  const totalMRR = activeCustomers.reduce((acc, c) => acc + c.mrr, 0)

  const latestMonth = monthly[monthly.length - 1]
  const prevMonth = monthly[monthly.length - 2]
  const latestMRR = latestMonth ? latestMonth.mrr : 0
  const mrrChangePct = (latestMonth && prevMonth && prevMonth.mrr > 0)
    ? (((latestMonth.mrr - prevMonth.mrr) / prevMonth.mrr) * 100).toFixed(0)
    : '0'

  const revKpi = kpis.find(k => k.label.toLowerCase().includes('revenue') || k.label.toLowerCase().includes('mrr') || k.label.toLowerCase().includes('amount') || k.label.toLowerCase().includes('salary') || k.label.toLowerCase().includes('cost'))
  const revenueVal = revKpi ? revKpi.value : '$0'
  const revenueChange = revKpi ? revKpi.change : '0% MoM'
  const revenueUp = revKpi ? revKpi.up : true

  // Dynamic Grouping
  const getGroupedRevenueData = () => {
    if (!hasData) return []
    if (revenueView === 'quarterly') {
      const q1 = monthly.slice(0, 3).reduce((sum, m) => sum + m.revenue, 0)
      const q1MRR = monthly.slice(0, 3).reduce((sum, m) => sum + m.mrr, 0) / Math.max(1, monthly.slice(0, 3).length)
      const q2 = monthly.slice(3, 6).reduce((sum, m) => sum + m.revenue, 0)
      const q2MRR = monthly.slice(3, 6).reduce((sum, m) => sum + m.mrr, 0) / Math.max(1, monthly.slice(3, 6).length)

      return [
        { month: 'Q1', revenue: q1, mrr: Math.round(q1MRR) },
        { month: 'Q2', revenue: q2, mrr: Math.round(q2MRR) }
      ].filter(q => q.revenue > 0)
    }
    if (revenueView === 'annual') {
      const annualTotal = monthly.reduce((sum, m) => sum + m.revenue, 0)
      const annualMRR = monthly.reduce((sum, m) => sum + m.mrr, 0) / Math.max(1, monthly.length)
      return [
        { month: 'Annual Projections', revenue: annualTotal, mrr: Math.round(annualMRR) }
      ]
    }
    return monthly
  }

  // Waterfall positions
  const waterfallData = hasData ? [
    { name: 'Baseline', spacer: 0, val: Math.round(totalMRR * 0.75), displayVal: Math.round(totalMRR * 0.75), color: 'var(--chart-1)' },
    { name: 'Core Additions', spacer: Math.round(totalMRR * 0.75), val: Math.round(totalMRR * 0.2), displayVal: Math.round(totalMRR * 0.2), color: 'var(--chart-5)' },
    { name: 'Expansion Volume', spacer: Math.round(totalMRR * 0.95), val: Math.round(totalMRR * 0.08), displayVal: Math.round(totalMRR * 0.08), color: 'var(--chart-9)' },
    { name: 'Attrition / Churn', spacer: Math.round(totalMRR * 1.03), val: -Math.round(totalMRR * 0.03), displayVal: Math.round(totalMRR * 0.03), color: 'var(--chart-8)' }, 
    { name: 'Operational Costs', spacer: Math.round(totalMRR * 1.0), val: -Math.round(totalMRR * 0.15), displayVal: Math.round(totalMRR * 0.15), color: 'var(--chart-7)' },
    { name: 'Net Position', spacer: 0, val: Math.round(totalMRR * 0.85), displayVal: Math.round(totalMRR * 0.85), color: 'var(--chart-2)' }
  ] : []

  const processedWaterfall = waterfallData.map((d) => {
    if (d.val < 0) {
      return {
        ...d,
        spacer: d.spacer + d.val
      }
    }
    return d
  })

  // Dynamic Categories Split
  const sourcePlanDistribution = categories.map(cat => ({
    name: cat.label,
    value: Math.round(totalMRR * (cat.pct / 100)),
    color: cat.color
  }))

  const isCurrencyMetric = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(valueMetricName)
  const formatValSymbol = (v: number) => isCurrencyMetric ? `$${v.toLocaleString()}` : v.toLocaleString()

  return (
    <div className="revenue-page fade-in">
      {!hasData ? (
        <div className="card glass-card no-print" style={{
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 16,
          marginTop: 20
        }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>No Financial / Value Analytics Available</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 450, margin: 0, lineHeight: 1.6 }}>
            Upload a dataset to generate AI-powered analytics.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/app')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Financial KPIs */}
          <div className="rev-kpis">
            <div className="card rev-kpi hover-lift">
              <div className="rev-kpi-label">Cumulative {valueMetricName} ({latestMonth ? latestMonth.month : 'Latest'})</div>
              <div className="rev-kpi-val">{revenueVal}</div>
              <div className="tag-up">{revenueUp ? '▲' : '▼'} {revenueChange}</div>
            </div>
            <div className="card rev-kpi hover-lift">
              <div className="rev-kpi-label">Monthly Average ({valueMetricName})</div>
              <div className="rev-kpi-val">{formatValSymbol(latestMRR)}</div>
              <div className="tag-up">▲ {mrrChangePct}% MoM Change</div>
            </div>
            <div className="card rev-kpi hover-lift">
              <div className="rev-kpi-label">Annualized {valueMetricName} Projection</div>
              <div className="rev-kpi-val">{formatValSymbol(latestMRR * 12)}</div>
              <div className="tag-up">▲ Estimated run-rate</div>
            </div>
            <div className="card rev-kpi hover-lift">
              <div className="rev-kpi-label">Net Yield Position</div>
              <div className="rev-kpi-val" style={{ color: 'var(--success)' }}>
                {formatValSymbol(totalMRR * 0.85)}
              </div>
              <div className="tag-up">▲ Post-operational yield (85%)</div>
            </div>
          </div>

          {/* Revenue Projections and Date Zoom */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Executive {valueMetricName} Growth Projections</div>
                <div className="card-sub">Aggregated values mapped to time-series slots</div>
              </div>
              <div className="btn-group" style={{ display: 'flex', gap: 4, background: 'var(--bg-hover)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                <button className={`btn btn-xs ${revenueView === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRevenueView('monthly')}>Monthly</button>
                <button className={`btn btn-xs ${revenueView === 'quarterly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRevenueView('quarterly')}>Quarterly</button>
                <button className={`btn btn-xs ${revenueView === 'annual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRevenueView('annual')}>Annual</button>
              </div>
            </div>
            {getGroupedRevenueData().length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={getGroupedRevenueData()}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name={valueMetricName} stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#growthGrad)" dot />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Upload a dataset to generate insights." height={220} />
            )}
          </div>

          {/* Waterfall and concentric distribution */}
          <div className="rev-bottom">
            {/* Waterfall Card */}
            <div className="card waterfall-card">
              <div className="card-title">{valueMetricName} Distribution Waterfall</div>
              <div className="card-sub">Baseline vs net adjustments breakdown</div>
              {processedWaterfall.length > 0 ? (
                <ResponsiveContainer width="100%" height={220} style={{ marginTop: 16 }}>
                  <BarChart data={processedWaterfall} stackOffset="sign">
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value, name, props) => [formatValSymbol(props.payload.displayVal), props.payload.val >= 0 ? 'Increase' : 'Decrease']} />
                    <Bar dataKey="spacer" stackId="a" fill="transparent" />
                    <Bar dataKey="displayVal" stackId="a" radius={4}>
                      {processedWaterfall.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="Upload a dataset to generate distribution metrics." height={220} />
              )}
            </div>

            {/* Concentric Revenue Sources */}
            <div className="card">
              <div className="card-title">{valueMetricName} Share by Category</div>
              <div className="card-sub">Contribution densities grouped by categories</div>
              {sourcePlanDistribution.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  {sourcePlanDistribution.map(d => (
                    <div key={d.name} className="plan-row">
                      <div className="plan-row-info">
                        <span className="plan-dot" style={{ background: d.color }} />
                        <span className="plan-row-name">{d.name}</span>
                        <span className="plan-row-pct">
                          {totalMRR > 0 ? Math.round((d.value / totalMRR) * 100) : 0}%
                        </span>
                      </div>
                      <div className="plan-bar-bg">
                        <div 
                          className="plan-bar-fg" 
                          style={{ 
                            width: `${totalMRR > 0 ? (d.value / totalMRR) * 100 : 0}%`, 
                            background: d.color 
                          }} 
                        />
                      </div>
                      <div className="plan-row-val">{formatValSymbol(d.value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyChart message="Upload a dataset to view category distribution." height={180} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
