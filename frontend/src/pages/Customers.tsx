import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchCustomers } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import type { Customer } from '../data/seed'
import './Customers.css'

const statusClass: Record<string, string> = {
  Active: 'badge-green', Pending: 'badge-amber', Churned: 'badge-red',
}

export default function Customers() {
  const { activeSheet, activeDocument, getSpreadsheetCustomers } = useSpreadsheet()
  const [customers, setCustomers] = useState<Customer[]>(SEED.customers)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter])

  useEffect(() => {
    if (activeSheet || (activeDocument && activeDocument.parsedRows?.length > 0)) {
      setCustomers(getSpreadsheetCustomers())
    } else {
      fetchCustomers()
        .then(data => {
          if (data) setCustomers(data)
        })
        .catch(err => console.error('Error fetching customers:', err))
    }
  }, [activeSheet, activeDocument])

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.email || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || c.status === filter
    return matchSearch && matchFilter
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

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
              <th style={{ textAlign: 'right' }}>MRR</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((c: Customer) => {
              const getMRRClass = (val: number) => {
                if (val >= 3000) return 'val-high'
                if (val >= 800) return 'val-medium'
                return 'val-low'
              }
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.email}</td>
                  <td>
                    <span className="plan-tag">{c.plan}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`mono ${getMRRClass(c.mrr)}`}>
                      ${c.mrr.toLocaleString()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}><span className={`badge ${statusClass[c.status]}`}>{c.status}</span></td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No customers found</td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Page {currentPage} of {totalPages} ({filtered.length} total)
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              className="btn btn-secondary btn-xs"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button 
              className="btn btn-secondary btn-xs"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
