import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, IndianRupee, ShoppingCart,
    ArrowUpRight, ArrowDownRight, Package, RotateCcw, Percent
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SparkLine from '../components/charts/SparkLine';
import { loadKPIs, loadDailyData, loadPlatformSummaries, loadOrders, loadRegions } from '../services/dataLoader';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
};

function formatCurrency(num) {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card-static !p-3 !rounded-xl text-xs">
            <p className="text-[#5a5a6e] mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-medium">
                    {p.name}: {formatCurrency(p.value)}
                </p>
            ))}
        </div>
    );
};

export default function Overview() {
    const [kpis, setKpis] = useState(null);
    const [daily, setDaily] = useState([]);
    const [platformSummaries, setPlatformSummaries] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('30d');
    const [isSyncing, setIsSyncing] = useState(false);

    const refreshData = useCallback(async () => {
        let days = 30;
        if (selectedPeriod === '7d') days = 7;
        if (selectedPeriod === '14d') days = 14;
        if (selectedPeriod === 'all') days = 9999;

        const [k, d, s, r] = await Promise.all([
            loadKPIs(days),
            loadDailyData(days),
            loadPlatformSummaries(),
            loadOrders({ page: 1, perPage: 8 })
        ]);
        setKpis(k);
        setDaily(d);
        setPlatformSummaries(s);
        setRecentOrders(r.orders);
    }, [selectedPeriod]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleGlobalSync = async () => {
        setIsSyncing(true);
        try {
            const { apiFetch } = await import('../services/api');
            await apiFetch('/overview/sync-all', { method: 'POST' });
            await refreshData();
        } catch (err) {
            console.error("Sync error:", err);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!kpis) return <div className="text-center py-20 text-[#5a5a6e]">Loading...</div>;


    const kpiCards = [
        {
            title: 'Total Revenue',
            value: kpis.revenue.value,
            change: kpis.revenue.change,
            prefix: '₹',
            icon: IndianRupee,
            color: '#7c3aed',
            sparkData: daily.slice(-14).map(d => d.totalRevenue),
        },
        {
            title: 'Net Profit',
            value: kpis.profit.value,
            change: kpis.profit.change,
            prefix: '₹',
            icon: TrendingUp,
            color: '#10b981',
            sparkData: daily.slice(-14).map(d => d.totalProfit),
        },
        {
            title: 'Total Orders',
            value: kpis.orders.value,
            change: kpis.orders.change,
            prefix: '',
            icon: ShoppingCart,
            color: '#2563eb',
            sparkData: daily.slice(-14).map(d => d.totalOrders),
        },
        {
            title: 'Avg Order Value',
            value: kpis.avgOrderValue.value,
            change: kpis.avgOrderValue.change,
            prefix: '₹',
            icon: Package,
            color: '#06b6d4',
            sparkData: daily.slice(-14).map(d => d.avgOrderValue),
        },
        {
            title: 'Profit Margin',
            value: parseFloat(kpis.profitMargin?.value ?? kpis.profit_margin?.value ?? 0),
            change: kpis.profitMargin?.change ?? kpis.profit_margin?.change ?? 0,
            suffix: '%',
            icon: Percent,
            color: '#f59e0b',
            sparkData: daily.slice(-14).map(d => (d.totalRevenue ? (d.totalProfit / d.totalRevenue * 100) : 0)),
        },
        {
            title: 'Returns',
            value: kpis.returns.value,
            change: kpis.returns.change,
            prefix: '',
            icon: RotateCcw,
            color: '#ef4444',
            sparkData: daily.slice(-14).map(d => d.totalReturns),
            negative: true,
        },
    ];

    const chartData = daily.map(d => ({
        name: `${d.day} ${d.month}`,
        revenue: d.totalRevenue,
        profit: d.totalProfit,
    }));

    const platformDonutData = platformSummaries.map(p => ({
        name: p.name,
        value: p.revenue,
        color: p.color,
    })).sort((a, b) => b.value - a.value);

    const regionData = [
        { name: 'India 🇮🇳', platforms: 5, revenue: platformSummaries.filter(p => ['amazon', 'meesho', 'flipkart', 'myntra', 'nykaa'].includes(p.id)).reduce((s, p) => s + p.revenue, 0), color: '#FF9900' },
        { name: 'Global 🌍', platforms: 3, revenue: platformSummaries.filter(p => ['shopify', 'woocommerce', 'tiktokshop'].includes(p.id)).reduce((s, p) => s + p.revenue, 0), color: '#2563eb' },
        { name: 'Social 📱', platforms: 2, revenue: platformSummaries.filter(p => ['whatsapp', 'instagram'].includes(p.id)).reduce((s, p) => s + p.revenue, 0), color: '#25D366' },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Period Selector & Sync */}
            <motion.div variants={item} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {['7d', '14d', '30d', 'all'].map(period => (
                        <motion.button
                            key={period}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPeriod === period
                                ? 'bg-gradient-to-r from-[rgba(124,58,237,0.2)] to-[rgba(6,182,212,0.15)] text-white border border-[rgba(124,58,237,0.3)]'
                                : 'text-[#5a5a6e] hover:text-white bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]'
                                }`}
                            onClick={() => setSelectedPeriod(period)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {period === '7d' ? 'Last 7 days' : period === '14d' ? 'Last 14 days' : period === '30d' ? 'Last 30 days' : 'All Time'}
                        </motion.button>
                    ))}
                </div>

                <motion.button
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium bg-[rgba(124,58,237,0.1)] text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all hover:text-white"
                    onClick={handleGlobalSync}
                    disabled={isSyncing}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <RotateCcw size={14} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Syncing..." : "Sync Data"}
                </motion.button>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpiCards.map((kpi, i) => {
                    const Icon = kpi.icon;
                    const isPositive = parseFloat(kpi.change) > 0;
                    const isBadPositive = kpi.negative && isPositive;
                    const changeColor = isBadPositive ? '#ef4444' : isPositive ? '#10b981' : '#ef4444';

                    return (
                        <motion.div key={kpi.title} variants={item}>
                            <GlassCard delay={i * 0.06} className="relative overflow-hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-[#5a5a6e] font-medium uppercase tracking-wider">{kpi.title}</span>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                                        <Icon size={16} style={{ color: kpi.color }} />
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <AnimatedNumber
                                        value={kpi.value}
                                        prefix={kpi.prefix || ''}
                                        suffix={kpi.suffix || ''}
                                        delay={i * 100}
                                        className="text-2xl font-bold text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-1 mb-3">
                                    {isPositive ? (
                                        <ArrowUpRight size={14} style={{ color: changeColor }} />
                                    ) : (
                                        <ArrowDownRight size={14} style={{ color: changeColor }} />
                                    )}
                                    <span className="text-xs font-medium" style={{ color: changeColor }}>
                                        {kpi.change}%
                                    </span>
                                    <span className="text-xs text-[#5a5a6e]">vs last week</span>
                                </div>
                                <SparkLine data={kpi.sparkData} color={kpi.color} height={35} />
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue vs Profit Chart */}
                <motion.div variants={item} className="lg:col-span-2">
                    <GlassCard delay={0.4} hover={false} className="!p-0">
                        <div className="p-5 pb-0">
                            <h3 className="text-sm font-semibold text-white mb-1">Revenue vs Profit</h3>
                            <p className="text-xs text-[#5a5a6e]">Last 30 days performance</p>
                        </div>
                        <div className="p-4 h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" stroke="#5a5a6e" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#5a5a6e" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#7c3aed"
                                        strokeWidth={2}
                                        fill="url(#revenueGrad)"
                                        name="Revenue"
                                        animationDuration={2000}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="profit"
                                        stroke="#06b6d4"
                                        strokeWidth={2}
                                        fill="url(#profitGrad)"
                                        name="Profit"
                                        animationDuration={2000}
                                        animationBegin={300}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Platform Revenue Donut */}
                <motion.div variants={item}>
                    <GlassCard delay={0.5} hover={false} className="!p-0">
                        <div className="p-5 pb-0">
                            <h3 className="text-sm font-semibold text-white mb-1">Platform Revenue</h3>
                            <p className="text-xs text-[#5a5a6e]">Distribution across channels</p>
                        </div>
                        <div className="p-4 h-[320px] flex flex-col">
                            <div className="flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={platformDonutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            animationDuration={1500}
                                            animationBegin={500}
                                        >
                                            {platformDonutData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} stroke="transparent" />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(v)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="px-2 grid grid-cols-2 gap-1">
                                {platformDonutData.slice(0, 6).map((p, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                        <span className="text-[#8b8b9e] truncate">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Region Cards & Recent Orders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Region Cards */}
                <motion.div variants={item} className="space-y-4">
                    <h3 className="text-sm font-semibold text-white">Region Breakdown</h3>
                    {regionData.map((region, i) => (
                        <GlassCard key={region.name} delay={0.6 + i * 0.1}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-white">{region.name}</p>
                                    <p className="text-xs text-[#5a5a6e]">{region.platforms} platforms</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-white">{formatCurrency(region.revenue)}</p>
                                </div>
                            </div>
                            <div className="mt-3 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: region.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(region.revenue / (regionData[0].revenue || 1) * 100)}%` }}
                                    transition={{ duration: 1.2, delay: 0.8 + i * 0.15 }}
                                />
                            </div>
                        </GlassCard>
                    ))}
                </motion.div>

                {/* Recent Orders */}
                <motion.div variants={item} className="lg:col-span-2">
                    <GlassCard delay={0.7} hover={false} className="!p-0">
                        <div className="p-5 pb-3 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
                                <p className="text-xs text-[#5a5a6e]">Latest across all platforms</p>
                            </div>
                            <span className="text-xs text-[#5a5a6e] bg-[rgba(255,255,255,0.04)] px-2 py-1 rounded-lg">Live</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-[rgba(255,255,255,0.04)]">
                                        <th className="text-left py-2 px-5 text-[#5a5a6e] font-medium">Order</th>
                                        <th className="text-left py-2 px-3 text-[#5a5a6e] font-medium">Product</th>
                                        <th className="text-left py-2 px-3 text-[#5a5a6e] font-medium">Platform</th>
                                        <th className="text-right py-2 px-3 text-[#5a5a6e] font-medium">Amount</th>
                                        <th className="text-right py-2 px-5 text-[#5a5a6e] font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.map((order, i) => (
                                        <motion.tr
                                            key={order.id}
                                            className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.8 + i * 0.05 }}
                                        >
                                            <td className="py-2.5 px-5 text-[#8b8b9e] font-mono">{order.id}</td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span>{order.productImage}</span>
                                                    <span className="text-white truncate max-w-[120px]">{order.product}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]" style={{ background: `${order.platformColor}15`, color: order.platformColor }}>
                                                    {order.platformIcon} {order.platform}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-white font-medium">₹{order.amount.toLocaleString('en-IN')}</td>
                                            <td className="py-2.5 px-5 text-right">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${order.statusColor}20`, color: order.statusColor }}>
                                                    {order.status}
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </motion.div>
    );
}
