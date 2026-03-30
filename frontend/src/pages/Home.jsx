import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Home = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-scene-dashboard relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-16 w-[32rem] h-[32rem] rounded-full blur-3xl bg-gradient-to-br from-primary/20 to-transparent animate-float" style={{ animation: 'float 10s ease-in-out infinite' }}></div>
        <div className="absolute -bottom-24 -left-20 w-[28rem] h-[28rem] rounded-full blur-3xl bg-gradient-to-br from-secondary/20 to-transparent animate-float" style={{ animation: 'float 12s ease-in-out infinite', animationDelay: '-2s' }}></div>
      </div>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-2xl flex items-center justify-center shadow-lg">⚡</div>
            <div>
              <p className="text-sm uppercase tracking-[0.22em] font-bold text-primary/90">Smart Billing</p>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">InvoiceFlow AI</h1>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#workflow" className="hover:text-primary transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 border border-slate-300 hover:border-primary/50 hover:text-primary transition-all">
              Log in
            </Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2.5 btn-ripple">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <p className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-xs font-black tracking-[0.16em] uppercase bg-primary/10 text-primary border border-primary/20">
                <span>Automated Revenue Operations</span>
              </p>
              <h2 className="text-5xl sm:text-6xl font-black leading-[1.05] text-slate-900 mb-6">
                Get paid faster with
                <span className="block gradient-text-animated">AI billing workflows</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                Capture invoices, extract key fields with Gemini AI, and deliver clean structured outputs for finance teams.
                Replace repetitive manual entry with a fast, reliable pipeline.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-primary text-base px-8 py-4 btn-ripple">
                  Create account
                </Link>
                <button
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                  className="btn-secondary text-base px-8 py-4"
                >
                  {isAuthenticated ? 'Go to dashboard' : 'See live workflow'}
                </button>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 max-w-lg">
                <div className="glass-effect p-4 text-center">
                  <p className="text-3xl font-black text-slate-900">85%</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Time Saved</p>
                </div>
                <div className="glass-effect p-4 text-center">
                  <p className="text-3xl font-black text-slate-900">99.3%</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Accuracy</p>
                </div>
                <div className="glass-effect p-4 text-center">
                  <p className="text-3xl font-black text-slate-900">24/7</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Processing</p>
                </div>
              </div>
            </div>

            <div className="relative animate-rotate-in-3d pb-6 lg:pb-0">
              <div className="card p-8 hover-3d shadow-2xl border border-primary/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900">Invoice Pipeline</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Live</span>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Step 1</p>
                    <p className="text-base font-bold text-slate-900">Upload PDF, image, or scanned invoice</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Step 2</p>
                    <p className="text-base font-bold text-slate-900">Prompt AI with custom extraction rules</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Step 3</p>
                    <p className="text-base font-bold text-slate-900">Download structured HTML output instantly</p>
                  </div>
                </div>
              </div>

              <div
                className="relative mt-5 ml-auto card p-5 w-full max-w-xs sm:w-72 lg:w-72 animate-float-up"
                style={{ animationDelay: '0.25s' }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Processed Today</p>
                <p className="text-4xl font-black text-primary mt-1">1,248</p>
                <p className="text-sm font-semibold text-emerald-600 mt-1">+18.2% from yesterday</p>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Extraction Engine',
                description: 'Parse totals, line items, vendor data, due dates, and custom fields from complex invoice layouts.',
                icon: '🧠',
              },
              {
                title: 'Prompt-driven Controls',
                description: 'Give detailed instructions per upload so your finance output always matches your SOPs.',
                icon: '🎯',
              },
              {
                title: 'Secure Team Access',
                description: 'Role-ready authentication and isolated invoice history for each user account.',
                icon: '🔐',
              },
            ].map((item) => (
              <article key={item.title} className="card p-7 hover-3d">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 font-medium leading-relaxed">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="rounded-3xl p-10 md:p-12 bg-gradient-to-br from-slate-900 via-primary to-secondary text-white overflow-hidden relative shadow-2xl border border-white/10">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 35%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2), transparent 35%)' }}></div>
            <div className="relative z-10">
              <h3 className="text-4xl font-black mb-4">From upload to output in under 60 seconds</h3>
              <p className="text-white/90 text-lg max-w-3xl mb-8">
                Built for operations and finance teams who need speed without sacrificing confidence.
                Every extracted file remains downloadable and reviewable in your dashboard.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors">
                  Try it now
                </Link>
                <Link to="/login" className="border border-white/60 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="text-center mb-10">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">Pricing</p>
            <h3 className="text-4xl font-black text-slate-900 mt-2">Simple, transparent plans</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
            <div className="card p-8 flex flex-col h-full">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Starter</p>
              <p className="text-5xl font-black text-slate-900 mt-4">$0</p>
              <p className="text-slate-600 font-medium mt-2">Perfect for trial and small teams.</p>
              <ul className="mt-6 space-y-3 text-slate-700 font-semibold">
                <li>• 100 invoices per month</li>
                <li>• Prompt-based extraction</li>
                <li>• Downloadable HTML results</li>
              </ul>
              <div className="mt-auto pt-8">
                <Link
                  to="/register"
                  className="block w-full text-center px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-colors"
                >
                  Get started
                </Link>
              </div>
            </div>
            <div className="card p-8 border-2 border-primary/40 relative overflow-hidden flex flex-col h-full">
              <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black bg-primary text-white">Popular</span>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Growth</p>
              <p className="text-5xl font-black text-slate-900 mt-4">$49</p>
              <p className="text-slate-600 font-medium mt-2">For scale-ready finance teams.</p>
              <ul className="mt-6 space-y-3 text-slate-700 font-semibold">
                <li>• Unlimited invoices</li>
                <li>• Priority processing lane</li>
                <li>• Multi-user team workspace</li>
              </ul>
              <div className="mt-auto pt-8">
                <Link
                  to="/register"
                  className="block w-full text-center px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-colors"
                >
                  Start growth plan
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
