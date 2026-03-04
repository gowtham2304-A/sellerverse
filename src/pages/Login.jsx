import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Zap, ArrowRight, Github } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Clear any existing auth on mount
    useEffect(() => {
        localStorage.removeItem('sellerverse_auth');
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

            // Fetch user info to store in localStorage for the UI
            try {
                const meRes = await fetch(`${API_BASE}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${data.access_token}` }
                });
                if (meRes.ok) {
                    const userData = await meRes.json();
                    localStorage.setItem('sellerverse_auth', JSON.stringify({
                        token: data.access_token,
                        user: userData
                    }));
                } else {
                    localStorage.setItem('sellerverse_auth', data.access_token);
                }
            } catch (error) {
                console.error('Failed to fetch user data after login:', error);
                localStorage.setItem('sellerverse_auth', data.access_token);
            }

            addToast('Welcome back to SellerVerse!', 'success');
            navigate('/');
        } catch (error) {
            addToast(error.message || 'Login failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10 overflow-hidden">
            {/* Background Orbs elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full filter blur-3xl opacity-30 animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="w-full max-w-md"
            >
                <div className="glass-card p-8 bg-gray-900/50 relative overflow-hidden">
                    {/* Top Accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500" />

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-lg shadow-purple-500/20">
                            <img src="/logo.png" alt="SellerVerse Logo" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                        <p className="text-sm text-gray-400 text-center">
                            Sign in to access your universal D2C dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-100 ml-1">Email or Seller ID</label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                    <Mail size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ backgroundColor: '#111118', borderColor: email ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)', paddingLeft: '3.5rem' }}
                                    className="w-full border rounded-xl py-3.5 pr-4 text-sm text-white focus:border-purple-500/50 outline-none transition-all placeholder-gray-500 shadow-inner"
                                    placeholder="admin@sellerverse.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-xs font-medium text-gray-100">Password</label>
                                <a href="#" className="text-xs text-cyan-400 hover:text-white transition-colors">Forgot?</a>
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                    <Lock size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ backgroundColor: '#111118', borderColor: password ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)', paddingLeft: '3.5rem' }}
                                    className="w-full border rounded-xl py-3.5 pr-4 text-sm text-white focus:border-purple-500/50 outline-none transition-all placeholder-gray-500 shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isLoading}
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', opacity: isLoading ? 0.7 : 1, boxShadow: '0 4px 15px rgba(124,58,237,0.3)' }}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In <ArrowRight size={16} />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <p className="mt-8 text-center text-xs text-gray-500">
                        Don't have an account? <Link to="/signup" className="font-medium text-purple-400 hover:text-white transition-colors">Sign up securely</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
