import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Store, Package, TrendingUp,
    Boxes, ShoppingCart, Upload, ChevronLeft, ChevronRight,
    Zap, Settings
} from 'lucide-react';

const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/platforms', label: 'Platforms', icon: Store },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/pnl', label: 'P&L', icon: TrendingUp },
    { path: '/stock', label: 'Stock', icon: Boxes },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/integrations', label: 'Integrations', icon: Zap },
    { path: '/upload', label: 'CSV Upload', icon: Upload },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, setCollapsed }) {
    const location = useLocation();

    return (
        <>
            {/* Mobile overlay */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCollapsed(true)}
                    />
                )}
            </AnimatePresence>

            <motion.aside
                className={`fixed top-0 left-0 h-screen z-50 flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#0a0a0f]/95 backdrop-blur-xl`}
                animate={{
                    width: collapsed ? 72 : 260,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                {/* Logo */}
                <div className="flex items-center h-16 px-4 border-b border-[rgba(255,255,255,0.06)]">
                    <motion.div
                        className="flex items-center gap-3 overflow-hidden"
                        animate={{ opacity: 1 }}
                    >
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                            <img src="/logo.png" alt="SellerVerse Logo" className="w-full h-full object-cover" />
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h1 className="text-base font-bold gradient-text whitespace-nowrap">SellerVerse</h1>
                                    <p className="text-[10px] text-[#5a5a6e] whitespace-nowrap">Universal D2C Dashboard</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="block"
                            >
                                <motion.div
                                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-200 ${isActive
                                        ? 'bg-gradient-to-r from-[rgba(124,58,237,0.15)] to-[rgba(6,182,212,0.08)] text-white'
                                        : 'text-[#8b8b9e] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                                        }`}
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isActive && (
                                        <motion.div
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-gradient-to-b from-[#7c3aed] to-[#06b6d4]"
                                            layoutId="activeIndicator"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                    <Icon size={20} className="flex-shrink-0" />
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                className="text-sm font-medium whitespace-nowrap"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Platform Count Badge */}
                <div className="px-3 pb-3">
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                className="glass-card-static p-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                            >
                                <p className="text-[10px] uppercase tracking-wider text-[#5a5a6e] mb-2">Connected Platforms</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold gradient-text">10</span>
                                    <span className="text-xs text-[#8b8b9e]">of 19 available</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4]"
                                        initial={{ width: 0 }}
                                        animate={{ width: '53%' }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Collapse Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center h-12 border-t border-[rgba(255,255,255,0.06)] text-[#5a5a6e] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                    <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
                        <ChevronLeft size={18} />
                    </motion.div>
                </button>
            </motion.aside>
        </>
    );
}
