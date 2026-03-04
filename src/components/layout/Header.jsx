import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, Database, LogOut, ShoppingCart, Package, Store } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useBackendStatus } from '../../hooks/useApiData';
import { fetchMe } from '../../services/api';
import NotificationBell from '../ui/NotificationBell';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const timer = useRef(null);
    const wrapRef = useRef(null);
    const navigate = useNavigate();

    const search = useCallback(async (q) => {
        if (q.length < 2) { setResults(null); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&limit=5`);
            if (res.ok) setResults(await res.json());
        } catch { setResults(null); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => search(query), 350);
        return () => clearTimeout(timer.current);
    }, [query, search]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Cmd/Ctrl+K shortcut
    useEffect(() => {
        const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); document.getElementById('global-search')?.focus(); setOpen(true); } };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const total = results ? results.orders.length + results.products.length + results.platforms.length : 0;

    const go = (link) => { setOpen(false); setQuery(''); setResults(null); navigate(link); };

    return (
        <div ref={wrapRef} className="relative hidden md:flex">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 w-64 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${open ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}` }}>
                <Search size={14} className="text-gray-500 flex-shrink-0" />
                <input
                    id="global-search"
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search products, orders..."
                    className="bg-transparent text-sm text-white placeholder-gray-600 w-full outline-none border-none"
                    style={{ boxShadow: 'none' }}
                />
                <kbd className="hidden lg:inline text-[10px] text-gray-600 rounded px-1.5 py-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>⌘K</kbd>
            </div>

            <AnimatePresence>
                {open && query.length >= 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-11 left-0 w-80 rounded-2xl overflow-hidden z-50 shadow-2xl"
                        style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
                    >
                        {loading && (
                            <div className="px-4 py-3 text-xs text-gray-500 flex items-center gap-2">
                                <span className="animate-spin w-3 h-3 border border-purple-500 border-t-transparent rounded-full" />
                                Searching...
                            </div>
                        )}

                        {!loading && results && total === 0 && (
                            <div className="px-4 py-6 text-center text-xs text-gray-500">
                                No results for "<span className="text-white">{query}</span>"
                            </div>
                        )}

                        {!loading && results && total > 0 && (
                            <div className="py-2 max-h-80 overflow-y-auto">
                                {results.orders.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <ShoppingCart size={10} /> Orders
                                        </div>
                                        {results.orders.map(o => (
                                            <button key={o.id} onClick={() => go(o.link)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                                                <div>
                                                    <p className="text-xs font-medium text-white">{o.order_id}</p>
                                                    <p className="text-[10px] text-gray-500">{o.customer} · {o.platform}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-purple-400">₹{o.amount?.toLocaleString('en-IN')}</p>
                                                    <p className="text-[10px] text-gray-600">{o.status}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.products.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                                            <Package size={10} /> Products
                                        </div>
                                        {results.products.map(p => (
                                            <button key={p.id} onClick={() => go(p.link)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                                                <div>
                                                    <p className="text-xs font-medium text-white">{p.name}</p>
                                                    <p className="text-[10px] text-gray-500">{p.sku} · {p.category}</p>
                                                </div>
                                                <p className="text-xs text-cyan-400">Stock: {p.stock}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {results.platforms.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mt-1">
                                            <Store size={10} /> Platforms
                                        </div>
                                        {results.platforms.map(p => (
                                            <button key={p.id} onClick={() => go(p.link)}
                                                className="w-full px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                                                <p className="text-xs font-medium text-white">{p.name}</p>
                                                <p className="text-[10px] text-gray-500 capitalize">{p.category}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Header({ title, subtitle, collapsed, setCollapsed }) {
    const backendUp = useBackendStatus();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileRef = useRef(null);
    const [realUser, setRealUser] = useState(null);

    // Initial load from localStorage
    useEffect(() => {
        try {
            const auth = localStorage.getItem('sellerverse_auth');
            if (auth && auth.startsWith('{')) {
                const parsed = JSON.parse(auth);
                if (parsed.user) setRealUser(parsed.user);
            }
        } catch (e) { console.error('Error loading user from storage:', e); }
    }, []);

    // Self-healing: fetch user info if missing but token exists
    useEffect(() => {
        if (!realUser && localStorage.getItem('sellerverse_auth')) {
            const loadMe = async () => {
                const userData = await fetchMe();
                if (userData) {
                    setRealUser(userData);
                    // Standardize storage format for next time
                    const currentAuth = localStorage.getItem('sellerverse_auth');
                    if (currentAuth && !currentAuth.startsWith('{')) {
                        localStorage.setItem('sellerverse_auth', JSON.stringify({
                            token: currentAuth,
                            user: userData
                        }));
                    } else if (currentAuth) {
                        try {
                            const parsed = JSON.parse(currentAuth);
                            localStorage.setItem('sellerverse_auth', JSON.stringify({
                                ...parsed,
                                user: userData
                            }));
                        } catch { /* ignore */ }
                    }
                }
            };
            loadMe();
        }
    }, [realUser]);

    const initials = realUser?.name ? realUser.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'SV';

    const handleLogout = () => {
        localStorage.removeItem('sellerverse_auth');
        navigate('/login');
    };

    useEffect(() => {
        const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <motion.header
            className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-[rgba(255,255,255,0.06)] bg-[#0a0a0f]/80 backdrop-blur-xl"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center gap-4">
                <button className="lg:hidden text-[#8b8b9e] hover:text-white transition-colors"
                    onClick={() => setCollapsed(!collapsed)}>
                    <Menu size={22} />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">{title}</h1>
                    {subtitle && <p className="text-xs text-[#5a5a6e]">{subtitle}</p>}
                </div>
                {backendUp !== null && (
                    <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium ${backendUp
                        ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981]'
                        : 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${backendUp ? 'bg-[#10b981] animate-pulse' : 'bg-[#f59e0b]'}`} />
                        <Database size={10} />
                        {backendUp ? 'API Connected' : 'Local Data'}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3">
                {/* Live Search */}
                <GlobalSearch />

                {/* Notification Bell */}
                <NotificationBell />

                {/* User Avatar */}
                <div className="relative" ref={profileRef}>
                    <motion.div
                        className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#2563eb] flex items-center justify-center text-xs font-bold cursor-pointer"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        {initials}
                    </motion.div>

                    <AnimatePresence>
                        {showProfileMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-12 w-52 rounded-xl shadow-xl overflow-hidden"
                                style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <div className="p-3 border-b border-[rgba(255,255,255,0.04)]">
                                    <p className="text-xs font-semibold text-white truncate max-w-[150px]">{realUser?.name || 'Loading Profile...'}</p>
                                    <p className="text-[10px] text-[#5a5a6e] truncate max-w-[150px]">{realUser?.email || 'Syncing account...'}</p>
                                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-purple-300"
                                        style={{ background: 'rgba(124,58,237,0.2)' }}>
                                        {(realUser?.plan || 'free').toUpperCase()}
                                    </span>
                                </div>
                                <div className="p-1">
                                    <Link to="/settings"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)] rounded-lg transition-colors">
                                        ⚙️ Settings
                                    </Link>
                                    <button onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#ef4444] hover:bg-[rgba(239,68,68,0.05)] rounded-lg transition-colors">
                                        <LogOut size={14} /> Sign Out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.header>
    );
}
