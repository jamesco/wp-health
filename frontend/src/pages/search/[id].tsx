import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { searchApi, type Lead } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SearchResults() {
  const router = useRouter()
  const { id } = router.query
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  useEffect(() => {
    if (id) {
      loadLeads()
    }
  }, [id])

  const loadLeads = async () => {
    try {
      const response = await searchApi.getLeads(id as string)
      setLeads(response.data)
    } catch (error) {
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Business Name', 'URL', 'WordPress Version', 'Outdated', 'Plugins', 'WooCommerce', 'Score']
    const rows = leads.map(lead => [
      lead.businessName || 'N/A',
      lead.url,
      lead.wpVersion || 'Unknown',
      lead.wpOutdated ? 'Yes' : 'No',
      lead.plugins?.length || 0,
      lead.woocommerce?.detected ? 'Yes' : 'No',
      lead.score || 0
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wordpress-leads-${id}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Search Results - WordPress Health Finder</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                ← Back to Dashboard
              </Link>
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Export to CSV
              </button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Search Results</h1>
          <p className="text-gray-600 mb-8">Found {leads.length} WordPress sites</p>

          {leads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No WordPress sites found in this search.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg cursor-pointer transition-shadow"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg">{lead.businessName || 'Unknown'}</h3>
                    <span className={`px-2 py-1 rounded text-sm font-semibold ${
                      (lead.score || 0) >= 70 ? 'bg-red-100 text-red-800' :
                      (lead.score || 0) >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      Score: {lead.score || 0}
                    </span>
                  </div>

                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm mb-4 block truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.url}
                  </a>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">WordPress:</span>
                      <span className="font-semibold">{lead.wpVersion || 'Unknown'}</span>
                    </div>

                    {lead.wpOutdated && (
                      <div className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs">
                        Outdated Version
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-600">Plugins:</span>
                      <span className="font-semibold">{lead.plugins?.length || 0}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Themes:</span>
                      <span className="font-semibold">{lead.themes?.length || 0}</span>
                    </div>

                    {lead.woocommerce?.detected && (
                      <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                        WooCommerce Detected
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedLead(null)}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">{selectedLead.businessName || 'Unknown Business'}</h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Website</h3>
                  <a
                    href={selectedLead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {selectedLead.url}
                  </a>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">WordPress Information</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p><strong>Version:</strong> {selectedLead.wpVersion || 'Unknown'}</p>
                    <p><strong>Outdated:</strong> {selectedLead.wpOutdated ? 'Yes' : 'No'}</p>
                    <p><strong>Health Score:</strong> {selectedLead.score || 0}/100</p>
                  </div>
                </div>

                {selectedLead.plugins && selectedLead.plugins.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Plugins ({selectedLead.plugins.length})</h3>
                    <div className="bg-gray-50 p-4 rounded max-h-40 overflow-y-auto">
                      <ul className="space-y-1">
                        {selectedLead.plugins.map((plugin: any, i: number) => (
                          <li key={i} className="text-sm">
                            {plugin.name} {plugin.version && `(v${plugin.version})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedLead.themes && selectedLead.themes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Themes</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      <ul className="space-y-1">
                        {selectedLead.themes.map((theme: any, i: number) => (
                          <li key={i} className="text-sm">
                            {theme.name} {theme.version && `(v${theme.version})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedLead.woocommerce?.detected && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">WooCommerce</h3>
                    <div className="bg-purple-50 p-4 rounded">
                      <p><strong>Detected:</strong> Yes</p>
                      {selectedLead.woocommerce.version && (
                        <p><strong>Version:</strong> {selectedLead.woocommerce.version}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-700 mb-2">Opportunity</h3>
                  <p className="text-sm text-gray-600">
                    This site {selectedLead.wpOutdated ? 'has outdated WordPress' : 'could benefit from maintenance'}.
                    {selectedLead.plugins && selectedLead.plugins.length > 10 && ' Multiple plugins may need updates.'}
                    {selectedLead.woocommerce?.detected && ' WooCommerce site - potential for e-commerce optimization.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
