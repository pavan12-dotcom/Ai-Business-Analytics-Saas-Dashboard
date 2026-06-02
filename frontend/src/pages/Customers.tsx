import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchCustomers } from '../services/api'
import type { Customer } from '../data/seed'
import './Customers.css'

const statusClass: Record<string, string> = {
  Active: 'badge-green', Pending: 'badge-amber', Churned: 'badge-red',
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>(SEED.customers)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('All')

  useEffect(() => {
    fetchCustomers()
      .then(data => {
        if (data) setCustomers(data)
      })
      .catch(err => console.error('Error fetching customers:', err))
  }, [])

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.email || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || c.status === filter
    return matchSearch && matchFilter
  })

  const total = customers.reduce((s, c) => s + c.mrr, 0)

  return (
    <div className="customers-page fade-in">
      {/* Stats row */}
      <div className="cust-stats">
        <div className="cust-stat">
          <div className="cust-stat-label">Total Customers</div>
          <div className="cust-stat-value">{customers.length}</div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-label">Active</div>
          <div className="cust-stat-value" style={{ color: 'var(--green)' }}>
            {customers.filter(c => c.status === 'Active').length}
          </div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-label">Total MRR</div>
          <div className="cust-stat-value">${total.toLocaleString()}</div>
        </div>
        <div className="cust-stat">
          <div className="cust-stat-label">Churned</div>
          <div className="cust-stat-value" style={{ color: 'var(--red)' }}>
            {customers.filter(c => c.status === 'Churned').length}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="cust-toolbar">
          <input
            className="cust-search"
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-tabs">
            {['All', 'Active', 'Pending', 'Churned'].map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Plan</th>
              <th>MRR</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: Customer) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.email}</td>
                <td>
                  <span className="plan-tag">{c.plan}</span>
                </td>
                <td className="mono">${c.mrr.toLocaleString()}</td>
                <td><span className={`badge ${statusClass[c.status]}`}>{c.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
