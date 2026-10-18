const BASE_URL = '/api/listings'

export interface Listing {
  id: string
  source: string
  address: string
  city: string
  state: string
  zip: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  listedDate: string
  status: string
  description: string
  relevanceScore: number
}

export interface SearchResponse {
  results: Listing[]
  page: number
  pageSize: number
  totalResults: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface SearchFilters {
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  city?: string
  keyword?: string
  targetBudget?: number
  page: number
  pageSize: number
}

export interface ApiError {
  timestamp?: string
  status: number
  error: string
  message: string
  path?: string
  details: string[]
}

export class ApiRequestError extends Error {
  readonly apiError: ApiError

  constructor(apiError: ApiError) {
    super(apiError.message)
    this.name = 'ApiRequestError'
    this.apiError = apiError
  }
}

export async function searchListings(filters: SearchFilters): Promise<SearchResponse> {
  const params = new URLSearchParams()
  if (filters.minPrice != null) params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice != null) params.set('maxPrice', String(filters.maxPrice))
  if (filters.minBedrooms != null) params.set('minBedrooms', String(filters.minBedrooms))
  if (filters.city) params.set('city', filters.city)
  if (filters.keyword) params.set('keyword', filters.keyword)
  if (filters.targetBudget != null) params.set('targetBudget', String(filters.targetBudget))
  params.set('page', String(filters.page))
  params.set('pageSize', String(filters.pageSize))

  const res = await fetch(`${BASE_URL}/search?${params.toString()}`)
  if (!res.ok) {
    throw new ApiRequestError(await toApiError(res))
  }
  return res.json()
}

export async function fetchCities(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/cities`)
  if (!res.ok) {
    throw new ApiRequestError(await toApiError(res))
  }
  return res.json()
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json()
    return {
      status: res.status,
      error: body.error ?? res.statusText,
      message: body.message ?? `Request failed with status ${res.status}`,
      details: Array.isArray(body.details) ? body.details : [],
      ...body,
    }
  } catch {
    return {
      status: res.status,
      error: res.statusText,
      message: `Request failed with status ${res.status}`,
      details: [],
    }
  }
}
