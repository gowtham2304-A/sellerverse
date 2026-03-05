import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, Download, FileSpreadsheet, Calendar } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { loadPnL } from '../services/dataLoader';
import { useToast } from '../components/ui/Toast';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

function formatCurrency(num) {
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num.toLocaleString('en-IN')}`;
}

export default function PnL() {
    const [pnl, setPnl] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const { addToast } = useToast();

    useEffect(() => {
        loadPnL().then(setPnl);
    }, []);

    const handleExport = async (format = 'xlsx') => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ format });
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);

            const tokenStr = localStorage.getItem('OmniTrack_auth');
            let token = tokenStr;
            if (tokenStr && tokenStr.startsWith('{')) {
                try { token = JSON.parse(tokenStr).token; } catch (e) { }
            }

            const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API}/export/pnl?${params}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Export failed: Authentication Error');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pnl_report.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            addToast(`P&L report exported as ${format.toUpperCase()}!`, 'success');
        } catch (err) {
            addToast('Export failed: ' + err.message, 'error');
        } finally {
            setExporting(false);
        }
    };
    // Waterfall chart transformation
    const waterfallData = useMemo(() => {
        if (!pnl) return [];
        let cumulative = 0;
        return pnl.waterfall.map(item => {
            const start = cumulative;
            if (item.type === 'subtotal' || item.type === 'total') {
                cumulative = item.value;
                return { ...item, start: 0, end: item.value, display: item.value };
            }
            cumulative += item.value;
            return {
                ...item,
                start: item.value > 0 ? 0 : start + item.value,
                end: item.value > 0 ? item.value : start,
                display: Math.abs(item.value),
                base: item.value < 0 ? cumulative : 0,
            };
        });
    }, [pnl]);

    if (!pnl) return <div className="text-center py-20 text-[#5a5a6e]">Loading...</div>;

    const summaryCards = [
        { label: 'Total Revenue', value: pnl.totalRevenue, color: '#7c3aed', icon: IndianRupee },
        { label: 'Gross Profit', value: pnl.grossProfit, color: '#2563eb', icon: TrendingUp },
        { label: 'Net Profit', value: pnl.netProfit, color: '#10b981', icon: TrendingUp },
        { label: 'Net Margin', value: `${((pnl.netProfit / pnl.totalRevenue) * 100).toFixed(1)}%`, isPercent: true, color: '#06b6d4', icon: TrendingUp },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Date Range & Export Controls */}
            <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-purple-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        style={{ backgroundColor: '#111118', borderColor: '#3f3f4e', colorScheme: 'dark' }}
                        className="border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                    <span className="text-gray-500 text-xs">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        style={{ backgroundColor: '#111118', borderColor: '#3f3f4e', colorScheme: 'dark' }}
                        className="border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                    />
                </div>

                <div className="flex gap-2 ml-auto">
                    <motion.button
                        className="py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl font-medium text-green-400 border border-green-500/20 hover:bg-green-500/10 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleExport('xlsx')}
                        disabled={exporting}
                    >
                        <FileSpreadsheet size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
                    </motion.button>
                    <motion.button
                        className="py-2 px-4 text-xs flex items-center gap-1.5 rounded-xl font-medium text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                    >
                        <Download size={14} /> Export CSV
                    </motion.button>
                </div>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.div key={card.label} variants={item}>
                            <GlassCard delay={i * 0.08}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-[#5a5a6e] font-medium uppercase tracking-wider">{card.label}</span>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                                        <Icon size={16} style={{ color: card.color }} />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-white">
                                    {card.isPercent ? card.value : (
                                        <AnimatedNumber value={card.value} prefix="₹" delay={i * 100} />
                                    )}
                                </div>
                            </GlassCard>
                        </motion.div>
                    );
                })}
            </div>

            {/* Waterfall & Cost Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Waterfall */}
                <motion.div variants={item} className="lg:col-span-2">
                    <GlassCard delay={0.3} hover={false} className="!p-0">
                        <div className="p-5 pb-0">
                            <h3 className="text-sm font-semibold text-white">Revenue to Profit Flow</h3>
                            <p className="text-xs text-[#5a5a6e]">Waterfall breakdown of all costs</p>
                        </div>
                        <div className="p-4 h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pnl.waterfall}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" stroke="#5a5a6e" fontSize={9} angle={-20} textAnchor="end" height={60} />
                                    <YAxis stroke="#5a5a6e" fontSize={10} tickFormatter={v => formatCurrency(Math.abs(v))} />
                                    <Tooltip
                                        formatter={v => formatCurrency(Math.abs(v))}
                                        contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="value" isAnimationActive={false}>
                                        {pnl.waterfall.map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} fillOpacity={0.7} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Cost Breakdown Pie */}
                <motion.div variants={item}>
                    <GlassCard delay={0.4} hover={false} className="!p-0">
                        <div className="p-5 pb-0">
                            <h3 className="text-sm font-semibold text-white">Cost Breakdown</h3>
                            <p className="text-xs text-[#5a5a6e]">Where your money goes</p>
                        </div>
                        <div className="p-4 h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pnl.costBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        {pnl.costBreakdown.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="px-5 pb-5 space-y-2">
                            {pnl.costBreakdown.map((cost, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: cost.color }} />
                                        <span className="text-xs text-[#8b8b9e]">{cost.name}</span>
                                    </div>
                                    <span className="text-xs font-medium text-white">{formatCurrency(cost.value)}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Daily P&L */}
            <motion.div variants={item}>
                <GlassCard delay={0.5} hover={false} className="!p-0">
                    <div className="p-5 pb-0">
                        <h3 className="text-sm font-semibold text-white">Daily P&L</h3>
                        <p className="text-xs text-[#5a5a6e]">Revenue and profit trend with margin</p>
                    </div>
                    <div className="p-4 h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={pnl.dailyPnL}>
                                <defs>
                                    <linearGradient id="pnlRevGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="day" stroke="#5a5a6e" fontSize={10} />
                                <YAxis yAxisId="left" stroke="#5a5a6e" fontSize={10} tickFormatter={v => formatCurrency(v)} />
                                <YAxis yAxisId="right" orientation="right" stroke="#5a5a6e" fontSize={10} tickFormatter={v => `${v}%`} />
                                <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', fontSize: '12px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#7c3aed" fill="url(#pnlRevGrad)" strokeWidth={2} name="Revenue" isAnimationActive={false} />
                                <Bar yAxisId="left" dataKey="profit" fill="#10b981" fillOpacity={0.5} name="Profit" isAnimationActive={false} />
                                <Line yAxisId="right" type="monotone" dataKey="margin" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Margin %" isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </motion.div>
        </motion.div>
    );
}
