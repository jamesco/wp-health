import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { searchApi, subscriptionApi, type Search, type Subscription } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [searches, setSearches] = useState<Search[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLocation, setSearchLocation] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [subRes, searchesRes] = await Promise.all([
        subscriptionApi.getStatus(),
        searchApi.getAll(),
      ])

      setSubscription(subRes.data)
      setSearches(searchesRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartSearch = async () => {
    if (!searchQuery) {
      toast.error('Please enter a search query')
      return
    }

    if (!subscription || subscription.status !== 'active') {
      toast.error('Active subscription required')
      router.push('/pricing')
      return
    }

    setSearching(true)

    try {
      const response = await searchApi.create(searchQuery, searchCategory, searchLocation)
      toast.success('Search started! This may take a few minutes.')
      setSearchQuery('')
      setSearchCategory('')
      setSearchLocation('')

      // Reload searches
      setTimeout(() => {
        loadData()
      }, 2000)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start search')
    } finally {
      setSearching(false)
    }
  }

  const handleSubscribe = async () => {
    try {
      const response = await subscriptionApi.createCheckout()
      if (response.data.url) {
        window.location.href = response.data.url
      }
    } catch (error) {
      toast.error('Failed to start checkout')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const hasActiveSubscription = subscription && subscription.status === 'active'
  const remainingLeads = hasActiveSubscription
    ? subscription.leadsPerWeek - subscription.leadsUsedThisWeek
    : 0

  return (
    <>
      <Head>
        <title>Dashboard - WordPress Health Finder</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                WP Health Finder
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-gray-700">Welcome, {user?.name || user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Subscription Status */}
          {!hasActiveSubscription ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-yellow-900 mb-2">No Active Subscription</h2>
              <p className="text-yellow-800 mb-4">
                Subscribe now to start finding WordPress leads!
              </p>
              <button
                onClick={handleSubscribe}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Subscribe - $49/month
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Your Subscription</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold capitalize">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Leads Used This Week</p>
                  <p className="text-lg font-semibold">
                    {subscription.leadsUsedThisWeek} / {subscription.leadsPerWeek}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining Leads</p>
                  <p className="text-lg font-semibold text-blue-600">{remainingLeads}</p>
                </div>
              </div>
            </div>
          )}

          {/* New Search */}
          {hasActiveSubscription && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">Start New Search</h2>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search query (e.g., hair salons in NYC)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Category (optional)"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleStartSearch}
                disabled={searching || !searchQuery}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Start Search'}
              </button>
            </div>
          )}

          {/* Recent Searches */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Your Searches</h2>
            {searches.length === 0 ? (
              <p className="text-gray-600">No searches yet. Start one above!</p>
            ) : (
              <div className="space-y-4">
                {searches.map((search) => (
                  <div key={search.id} className="border rounded-lg p-4 hover:border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{search.query}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(search.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        search.status === 'completed' ? 'bg-green-100 text-green-800' :
                        search.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        search.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {search.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Total Sites: {search.totalSites}</span>
                      <span>WordPress Sites: {search.wpSitesFound}</span>
                    </div>
                    {search.status === 'completed' && (
                      <Link
                        href={`/search/${search.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 inline-block"
                      >
                        View Results →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
