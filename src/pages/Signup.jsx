import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const plans = [
    { id: 'free', label: 'Free', desc: 'Up to 3 platforms · 1K orders/mo', color: '#5a5a6e' },
    { id: 'pro', label: 'Pro', desc: 'All platforms · Unlimited · Email reports', color: '#7c3aed' },
    { id: 'enterprise', label: 'Enterprise', desc: 'Custom limits · Dedicated support', color: '#06b6d4' },
];

export default function Signup() {
    const [form, setForm] = useState({ name: '', email: '', password: '', plan: 'free' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleRegister = async (e) => {
        if (e) e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            addToast('Please fill all fields', 'error'); return;
        }
        if (form.password.length < 8) {
            addToast('Password must be at least 8 characters', 'error'); return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Registration failed');

            // Store token same as login
            localStorage.setItem('sellerverse_auth', JSON.stringify({
                token: data.access_token,
                user: data.user,
                loginTime: Date.now(),
            }));

            addToast(`Welcome to SellerVerse, ${data.user.name}! 🎉`, 'success');
            navigate('/');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.15) 0%, #0a0a0f 60%)' }}>

            {/* Glow orbs */}
            <div className="fixed top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)' }} />
            <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)' }} />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))', border: '1px solid rgba(124,58,237,0.4)' }}>
                        <Zap size={26} className="text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create your account</h1>
                    <p className="text-sm text-gray-500 mt-1">Join SellerVerse — the universal D2C dashboard</p>
                </div>

                {/* No Step Indicators needed for single step */}

                <div className="rounded-2xl p-8"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

                    <AnimatePresence mode="wait">
                        <motion.form key="signup"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleRegister} className="space-y-5">

                            {/* Name */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-300">Full Name</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                        <User size={18} className="text-gray-500" />
                                    </div>
                                    <input type="text" placeholder="Alex Johnson" value={form.name}
                                        onChange={e => set('name', e.target.value)} required
                                        style={{ backgroundColor: '#0d0d14', borderColor: form.name ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)', paddingLeft: '3.5rem' }}
                                        className="w-full border rounded-xl py-3.5 pr-4 text-sm text-white outline-none focus:border-purple-500/50 placeholder-gray-600 transition-all shadow-inner" />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-300">Email Address</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                        <Mail size={18} className="text-gray-500" />
                                    </div>
                                    <input type="email" placeholder="you@business.com" value={form.email}
                                        onChange={e => set('email', e.target.value)} required
                                        style={{ backgroundColor: '#0d0d14', borderColor: form.email ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)', paddingLeft: '3.5rem' }}
                                        className="w-full border rounded-xl py-3.5 pr-4 text-sm text-white outline-none focus:border-purple-500/50 placeholder-gray-600 transition-all shadow-inner" />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-300">Password</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                        <Lock size={18} className="text-gray-500" />
                                    </div>
                                    <input type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                                        value={form.password} onChange={e => set('password', e.target.value)} required
                                        style={{ backgroundColor: '#0d0d14', borderColor: form.password ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)', paddingLeft: '3.5rem' }}
                                        className="w-full border rounded-xl py-3.5 pr-10 text-sm text-white outline-none focus:border-purple-500/50 placeholder-gray-600 transition-all shadow-inner" />
                                    <button type="button" onClick={() => setShowPass(v => !v)}
                                        className="absolute right-4 text-gray-500 hover:text-white transition-colors">
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {/* Password strength bar */}
                                {form.password && (
                                    <div className="flex gap-1 mt-1.5">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="flex-1 h-1 rounded-full transition-all"
                                                style={{ background: form.password.length >= i * 3 ? (form.password.length >= 12 ? '#10b981' : '#f59e0b') : '#3f3f4e' }} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <motion.button type="submit" disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}
                                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 mt-4 transition-all"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}>
                                {loading ? (
                                    <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Initializing Dashboard...</>
                                ) : (
                                    <><Zap size={14} /> Create Account</>
                                )}
                            </motion.button>
                        </motion.form>
                    </AnimatePresence>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
}
