'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-veridex-primary to-veridex-secondary bg-clip-text text-transparent">
          Veridex
        </h1>
        <p className="text-xl md:text-2xl text-worldcoin-gray-300 mb-8">
          Decentralized trust for verified humans. Build portable reputation, stake WLD on integrity, spawn accountable AI agents.
        </p>

        {/* Problem Statement */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="text-lg font-semibold mb-2">Identity is Fake</h3>
            <p className="text-worldcoin-gray-400 text-sm">
              Bots and sybils poison every platform. World ID fixes this.
            </p>
          </div>
          <div className="card">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold mb-2">Reputation is Trapped</h3>
            <p className="text-worldcoin-gray-400 text-sm">
              You rebuild credibility from zero on every new service. We make it portable.
            </p>
          </div>
          <div className="card">
            <div className="text-3xl mb-3">🤷</div>
            <h3 className="text-lg font-semibold mb-2">AI is Unaccountable</h3>
            <p className="text-worldcoin-gray-400 text-sm">
              No one knows who&apos;s behind the bot. Agent identity changes that.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/verify" className="btn-primary text-lg px-8 py-3">
            Verify with World ID
          </Link>
          <Link href="/browse" className="btn-secondary text-lg px-8 py-3">
            Browse Workers
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-24 w-full max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-veridex-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-veridex-primary">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Verify</h3>
            <p className="text-worldcoin-gray-400">
              Prove you&apos;re human with World ID. Connect GitHub or other platforms.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-veridex-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-veridex-primary">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Build Trust</h3>
            <p className="text-worldcoin-gray-400">
              Get staked reviews from clients. Your trust score grows organically.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-veridex-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-veridex-primary">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Hired</h3>
            <p className="text-worldcoin-gray-400">
              Clients evaluate you via AI chatbot grounded in real data. No more fake resumes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
