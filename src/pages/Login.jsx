import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, LayoutDashboard, Database, Shield, Zap } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        localStorage.removeItem('OmniTrack_auth');
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            addToast('Please enter both email and password', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_BASE}/api/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Invalid email or password');
            }

            const data = await response.json();

            try {
                const meRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${data.access_token}` }
                });
                if (meRes.ok) {
                    const userData = await meRes.json();
                    localStorage.setItem('OmniTrack_auth', JSON.stringify({
                        token: data.access_token,
                        user: userData
                    }));
                } else {
                    localStorage.setItem('OmniTrack_auth', data.access_token);
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
                localStorage.setItem('OmniTrack_auth', data.access_token);
            }

            addToast('Welcome back to OmniTrack!', 'success');
            navigate('/');
        } catch (error) {
            addToast(error.message || 'Login failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex relative z-10 overflow-hidden bg-[#0A0A0F]">
            {/* Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full filter blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

                    {/* LEFT COLUMN: Features & Portfolio Pitch */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="hidden lg:flex flex-col space-y-8 relative z-10"
                    >
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-6">
                                <Zap size={14} /> Production Grade
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
                                Universal D2C Seller Dashboard
                            </h1>
                            <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                                Managing 10+ platforms is a nightmare. OmniTrack fuses them into one beautiful, lightning-fast dashboard.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="mt-1 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                    <LayoutDashboard className="text-blue-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-base mb-1">19 Platform Integrations</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">Unified analytics across Amazon, Shopify, Flipkart, Meesho, Etsy, WooCommerce and Social Commerce.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1 w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                                    <Database className="text-purple-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-base mb-1">High-Speed Data Engine</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">Smart CSV parser mapping 100k+ rows instantly via in-memory Python aggregation and background auto-sync.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="mt-1 w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Shield className="text-emerald-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-semibold text-base mb-1">Bank-Grade Security</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">API credentials encrypted with Fernet AES-128. Built with FastAPI, SQLite/PostgreSQL, and React 18.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex items-center gap-6">
                            <div className="flex -space-x-3">
                                {/* Tech stack dots */}
                                <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-[#0A0A0F] flex items-center justify-center shadow-lg"><img src="/vite.svg" alt="Vite" className="w-5" /></div>
                                <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-[#0A0A0F] flex items-center justify-center shadow-lg text-[#61dafb] font-bold text-xs" style={{ fontFamily: 'monospace' }}>Re</div>
                                <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-[#0A0A0F] flex items-center justify-center shadow-lg text-[#009688] font-bold text-xs" style={{ fontFamily: 'monospace' }}>FA</div>
                                <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-[#0A0A0F] flex items-center justify-center shadow-lg text-[#3776ab] font-bold text-xs" style={{ fontFamily: 'monospace' }}>Py</div>
                            </div>
                            <p className="text-xs text-gray-500 font-medium tracking-wide">FULL STACK ARCHITECTURE</p>
                        </div>
                    </motion.div>

                    {/* RIGHT COLUMN: Login Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full max-w-md mx-auto"
                    >
                        <div className="glass-card p-8 bg-[#11111A]/80 border border-white/5 backdrop-blur-xl relative overflow-hidden shadow-2xl rounded-2xl">
                            {/* Top Accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500" />

                            <div className="flex flex-col items-center mb-8">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-[0_0_30px_rgba(124,58,237,0.3)] bg-gray-900 flex items-center justify-center border border-white/10">
                                    <img src="/logo.png" alt="OmniTrack Logo" className="w-[80%] h-[80%] object-contain" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                                <p className="text-sm text-gray-400 text-center">
                                    Sign in or use demo account to explore
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-300 ml-1">Email or Seller ID</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                            <Mail size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: email ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)', paddingLeft: '3.5rem' }}
                                            className="w-full border rounded-xl py-3.5 pr-4 text-sm text-white focus:border-purple-500/50 outline-none transition-all placeholder-gray-600"
                                            placeholder="admin@OmniTrack.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-xs font-medium text-gray-300">Password</label>
                                        <button type="button" onClick={() => { setEmail('admin@OmniTrack.com'); setPassword('admin123'); }} className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium bg-purple-500/10 px-2 py-0.5 rounded">Use Demo Auth</button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                            <Lock size={18} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: password ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)', paddingLeft: '3.5rem' }}
                                            className="w-full border rounded-xl py-3.5 pr-4 text-sm text-white focus:border-purple-500/50 outline-none transition-all placeholder-gray-600"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-4"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isLoading}
                                    style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', opacity: isLoading ? 0.7 : 1, boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Explore Dashboard <ArrowRight size={16} />
                                        </>
                                    )}
                                </motion.button>
                            </form>

                            <div className="mt-8 text-center bg-white/5 border border-white/5 rounded-lg p-4">
                                <p className="text-xs text-gray-400 mb-2">Want to create your own dataset?</p>
                                <Link to="/signup" className="text-sm font-medium text-white hover:text-purple-400 transition-colors flex items-center justify-center gap-1">
                                    Sign up securely <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
