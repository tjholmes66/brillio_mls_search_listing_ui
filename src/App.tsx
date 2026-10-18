import { useEffect, useState } from 'react'
import {
  ApiRequestError,
  fetchCities,
  searchListings,
  type ApiError,
  type Listing,
  type SearchResponse,
} from './api'
import './App.css'

interface FormState {
  minPrice: string
  maxPrice: string
  minBedrooms: string
  city: string
  keyword: string
  targetBudget: string
  pageSize: string
}

const EMPTY_FORM: FormState = {
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  city: '',
  keyword: '',
  targetBudget: '',
  pageSize: '10',
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? undefined : parsed
}

function App() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [cities, setCities] = useState<string[]>([])
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCities()
      .then(setCities)
      .catch(() => setCities([]))
  }, [])

  async function runSearch(nextPage: number) {
    setLoading(true)
    setError(null)
    try {
      const result = await searchListings({
        minPrice: parseNumber(form.minPrice),
        maxPrice: parseNumber(form.maxPrice),
        minBedrooms: parseNumber(form.minBedrooms),
        city: form.city || undefined,
        keyword: form.keyword.trim() || undefined,
        targetBudget: parseNumber(form.targetBudget),
        page: nextPage,
        pageSize: Number(form.pageSize) || 10,
      })
      setResponse(result)
    } catch (err) {
      setResponse(null)
      if (err instanceof ApiRequestError) {
        setError(err.apiError)
      } else {
        setError({
          status: 0,
          error: 'Network Error',
          message: err instanceof Error ? err.message : 'Unable to reach the search service',
          details: [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void runSearch(1)
  }

  function handleReset() {
    setForm(EMPTY_FORM)
    setResponse(null)
    setError(null)
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>MLS Listing Search</h1>
        <p>Search property listings ranked by budget fit and recency</p>
      </header>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="city">City</label>
          <select
            id="city"
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
          >
            <option value="">Any city</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="keyword">Keyword</label>
          <input
            id="keyword"
            type="text"
            maxLength={200}
            placeholder="e.g. condo, kitchen"
            value={form.keyword}
            onChange={(e) => updateField('keyword', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="minPrice">Min price ($)</label>
          <input
            id="minPrice"
            type="number"
            min={0}
            placeholder="e.g. 400000"
            value={form.minPrice}
            onChange={(e) => updateField('minPrice', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="maxPrice">Max price ($)</label>
          <input
            id="maxPrice"
            type="number"
            min={0}
            placeholder="e.g. 550000"
            value={form.maxPrice}
            onChange={(e) => updateField('maxPrice', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="minBedrooms">Min bedrooms</label>
          <input
            id="minBedrooms"
            type="number"
            min={0}
            placeholder="e.g. 3"
            value={form.minBedrooms}
            onChange={(e) => updateField('minBedrooms', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="targetBudget">Target budget ($)</label>
          <input
            id="targetBudget"
            type="number"
            min={1}
            placeholder="rank by budget fit"
            value={form.targetBudget}
            onChange={(e) => updateField('targetBudget', e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="pageSize">Per page</label>
          <select
            id="pageSize"
            value={form.pageSize}
            onChange={(e) => updateField('pageSize', e.target.value)}
          >
            {[5, 10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
          <button type="button" className="btn" onClick={handleReset} disabled={loading}>
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="error-box" role="alert">
          <strong>
            {error.status} {error.error}
          </strong>
          <p>{error.message}</p>
          {error.details.length > 0 && (
            <ul>
              {error.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {response && (
        <>
          <div className="results-meta">
            <span>
              {response.totalResults} listing{response.totalResults === 1 ? '' : 's'} found
            </span>
            {response.totalPages > 1 && (
              <span>
                Page {response.page} of {response.totalPages}
              </span>
            )}
          </div>

          {response.results.length === 0 ? (
            <p className="empty">No listings matched your search.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>City</th>
                    <th>Price</th>
                    <th>Beds</th>
                    <th>Baths</th>
                    <th>Sqft</th>
                    <th>Listed</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {response.results.map((listing: Listing) => (
                    <tr key={listing.id}>
                      <td>
                        <div className="address">{listing.address}</div>
                        <div className="subtle">
                          {listing.zip} · {listing.source} · #{listing.id}
                        </div>
                      </td>
                      <td>
                        {listing.city}, {listing.state}
                      </td>
                      <td className="price">{currency.format(listing.price)}</td>
                      <td>{listing.bedrooms}</td>
                      <td>{listing.bathrooms}</td>
                      <td>{listing.sqft.toLocaleString()}</td>
                      <td>{listing.listedDate}</td>
                      <td>
                        <span className={`status ${listing.status.toLowerCase()}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td>
                        <div className="score">
                          <div className="score-bar">
                            <div
                              className="score-fill"
                              style={{ width: `${listing.relevanceScore}%` }}
                            />
                          </div>
                          <span>{listing.relevanceScore.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="description">{listing.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              className="btn"
              disabled={!response.hasPrevious || loading}
              onClick={() => void runSearch(response.page - 1)}
            >
              ← Previous
            </button>
            <span className="page-indicator">
              Page {response.page} / {Math.max(response.totalPages, 1)}
            </span>
            <button
              type="button"
              className="btn"
              disabled={!response.hasNext || loading}
              onClick={() => void runSearch(response.page + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}

      {!response && !error && (
        <p className="empty hint">Set your filters and press Search to query the MLS API.</p>
      )}
    </div>
  )
}

export default App
