import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>WordPress Health Finder - Find Outdated WordPress Sites</title>
        <meta name="description" content="Discover WordPress sites that need updates and maintenance" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-blue-600">
              WP Health Finder
            </div>
            <div className="space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-blue-600">
                Login
              </Link>
              <Link href="/register" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                Sign Up
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Find WordPress Sites That Need Updates
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Discover qualified leads by identifying WordPress sites with outdated plugins, themes, and core versions.
              Perfect for agencies, developers, and maintenance service providers.
            </p>
            <div className="space-x-4">
              <Link href="/register" className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 inline-block">
                Get Started - 50 Leads/Week
              </Link>
              <Link href="#features" className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 inline-block">
                Learn More
              </Link>
            </div>
          </div>

          {/* Features */}
          <div id="features" className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-bold mb-2">Smart Detection</h3>
              <p className="text-gray-600">
                Automatically detects WordPress sites and identifies outdated versions of core, plugins, and themes.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">Targeted Search</h3>
              <p className="text-gray-600">
                Search by industry, location, or business type to find the most relevant leads for your services.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Detailed Reports</h3>
              <p className="text-gray-600">
                Get comprehensive reports showing exactly what needs updating, with priority scores for each lead.
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold mb-8">Simple, Transparent Pricing</h2>
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md mx-auto">
              <div className="text-4xl font-bold text-blue-600 mb-2">$49/month</div>
              <p className="text-gray-600 mb-6">Everything you need to find quality leads</p>
              <ul className="text-left space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  50 qualified leads per week
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited searches
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Detailed WordPress health reports
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Plugin & theme version detection
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  WooCommerce site identification
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Export to CSV
                </li>
              </ul>
              <Link href="/register" className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 inline-block">
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">1</div>
                <h4 className="font-bold mb-2">Choose Your Target</h4>
                <p className="text-sm text-gray-600">Select industry and location (e.g., "hair salons in NYC")</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">2</div>
                <h4 className="font-bold mb-2">We Scan Sites</h4>
                <p className="text-sm text-gray-600">Our system finds and analyzes websites automatically</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">3</div>
                <h4 className="font-bold mb-2">Get Results</h4>
                <p className="text-sm text-gray-600">View detailed reports on WordPress health and updates needed</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-blue-600">4</div>
                <h4 className="font-bold mb-2">Reach Out</h4>
                <p className="text-sm text-gray-600">Contact businesses with your maintenance services</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-20 py-8">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>&copy; 2024 WordPress Health Finder. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  )
}
