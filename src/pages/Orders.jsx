import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Download, ChevronLeft, ChevronRight, Calendar, FileSpreadsheet } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { loadOrders } from '../services/dataLoader';
import { useToast } from '../components/ui/Toast';

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const platformFilters = ['All', 'Amazon India', 'Meesho', 'Flipkart', 'Myntra', 'Nykaa', 'Shopify'];

export default function Orders() {
    const [allOrders, setAllOrders] = useState([]);
    const [isLocal, setIsLocal] = useState(true);
    const [search, setSearch] = useState('');
    const [platformFilter, setPlatformFilter] = useState('All');
    const [sortField, setSortField] = useState('date');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [exporting, setExporting] = useState(false);
    const perPage = 10;
    const { addToast } = useToast();

    const fetchOrders = useCallback(async () => {
        const result = await loadOrders({
            page, perPage, search, platform: platformFilter,
            sortBy: sortField, sortDir,
        });
        if (result.isLocal) {
            // Client-side filtering for local data
            setIsLocal(true);
            let data = [...result.orders];
            if (search) {
                const s = search.toLowerCase();
                data = data.filter(o =>
                    o.id.toLowerCase().includes(s) ||
                    o.product.toLowerCase().includes(s) ||
                    o.customer.toLowerCase().includes(s) ||
                    o.city.toLowerCase().includes(s)
                );
            }
            if (platformFilter !== 'All') {
                data = data.filter(o => o.platform === platformFilter);
            }
            data.sort((a, b) => {
                let aVal = a[sortField], bVal = b[sortField];
                if (sortField === 'amount') { aVal = Number(aVal); bVal = Number(bVal); }
                if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
            setTotal(data.length);
            setTotalPages(Math.ceil(data.length / perPage));
            setAllOrders(data.slice((page - 1) * perPage, page * perPage));
        } else {
            // Server-side — already paginated
            setIsLocal(false);
            setAllOrders(result.orders);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        }
    }, [page, search, platformFilter, sortField, sortDir]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const paged = allOrders;

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const handleExport = async (format = 'xlsx') => {
        setExporting(true);
        try {
            const params = new URLSearchParams({ format });
            if (startDate) params.set('start_date', startDate);
            if (endDate) params.set('end_date', endDate);
            if (platformFilter !== 'All') params.set('platform', platformFilter.toLowerCase().replace(' ', ''));
            if (statusFilter !== 'All') params.set('status', statusFilter);

            const tokenStr = localStorage.getItem('OmniTrack_auth');
            let token = tokenStr;
            if (tokenStr && tokenStr.startsWith('{')) {
                try { token = JSON.parse(tokenStr).token; } catch (e) { }
            }

            const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API}/export/orders?${params}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Export failed: Authentication Error');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders_export.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            addToast(`Orders exported as ${format.toUpperCase()} successfully!`, 'success');
        } catch (err) {
            addToast('Export failed: ' + err.message, 'error');
        } finally {
            setExporting(false);
        }
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {/* Controls */}
            <motion.div variants={item} className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2 flex-1 max-w-sm focus-within:border-[rgba(124,58,237,0.5)] transition-all">
                        <Search size={14} className="text-[#5a5a6e]" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="bg-transparent text-sm text-white placeholder-[#5a5a6e] w-full outline-none border-none"
                            style={{ boxShadow: 'none' }}
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-purple-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setPage(1); }}
                            style={{ backgroundColor: '#111118', borderColor: '#3f3f4e', colorScheme: 'dark' }}
                            className="border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                        />
                        <span className="text-gray-500 text-xs">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setPage(1); }}
                            style={{ backgroundColor: '#111118', borderColor: '#3f3f4e', colorScheme: 'dark' }}
                            className="border rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                        />
                    </div>

                    {/* Export Buttons */}
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
                </div>

                {/* Platform + Status Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {platformFilters.map(pf => (
                            <motion.button
                                key={pf}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${platformFilter === pf
                                    ? 'bg-gradient-to-r from-[rgba(124,58,237,0.2)] to-[rgba(6,182,212,0.15)] text-white border border-[rgba(124,58,237,0.3)]'
                                    : 'text-[#5a5a6e] hover:text-white bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]'
                                    }`}
                                onClick={() => { setPlatformFilter(pf); setPage(1); }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {pf}
                            </motion.button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Status:</span>
                        {['All', 'Delivered', 'Shipped', 'Processing', 'Returned', 'Cancelled'].map(s => (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(s); setPage(1); }}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${statusFilter === s
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'text-gray-500 hover:text-white bg-gray-800/30 border border-gray-700/20'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Table */}
            <motion.div variants={item}>
                <GlassCard hover={false} className="!p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                                    {[
                                        { key: 'id', label: 'Order ID' },
                                        { key: 'product', label: 'Product' },
                                        { key: 'platform', label: 'Platform' },
                                        { key: 'customer', label: 'Customer' },
                                        { key: 'city', label: 'City' },
                                        { key: 'qty', label: 'Qty' },
                                        { key: 'amount', label: 'Amount' },
                                        { key: 'status', label: 'Status' },
                                        { key: 'date', label: 'Date' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className="text-left py-3 px-4 text-[#5a5a6e] font-medium cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleSort(col.key)}
                                        >
                                            <span className="flex items-center gap-1">
                                                {col.label}
                                                {sortField === col.key && (
                                                    <span className="text-[#7c3aed]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="wait">
                                    {paged.map((order, i) => (
                                        <motion.tr
                                            key={order.id}
                                            className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                        >
                                            <td className="py-3 px-4 text-[#8b8b9e] font-mono">{order.id}</td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span>{order.productImage}</span>
                                                    <span className="text-white truncate max-w-[140px]">{order.product}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]" style={{ background: `${order.platformColor}15`, color: order.platformColor }}>
                                                    {order.platformIcon} {order.platform}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-[#8b8b9e]">{order.customer}</td>
                                            <td className="py-3 px-4 text-[#8b8b9e]">{order.city}</td>
                                            <td className="py-3 px-4 text-white">{order.qty}</td>
                                            <td className="py-3 px-4 text-white font-medium">₹{order.amount.toLocaleString('en-IN')}</td>
                                            <td className="py-3 px-4">
                                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${order.statusColor}20`, color: order.statusColor }}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-[#5a5a6e] whitespace-nowrap">{order.dateFormatted}</td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.04)]">
                        <span className="text-xs text-[#5a5a6e]">
                            Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total}
                        </span>
                        <div className="flex items-center gap-2">
                            <motion.button
                                className="p-1.5 rounded-lg text-[#5a5a6e] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <ChevronLeft size={16} />
                            </motion.button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                                <motion.button
                                    key={p}
                                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${page === p
                                        ? 'bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-white'
                                        : 'text-[#5a5a6e] hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
                                        }`}
                                    onClick={() => setPage(p)}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {p}
                                </motion.button>
                            ))}
                            <motion.button
                                className="p-1.5 rounded-lg text-[#5a5a6e] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <ChevronRight size={16} />
                            </motion.button>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>
        </motion.div>
    );
}
