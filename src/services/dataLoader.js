/**
 * Data adapter — normalizes API responses to match the frontend's expected data shape.
 * The API returns snake_case, the frontend expects camelCase.
 * Falls back to local sample data when API is unavailable.
 */
import * as api from '../services/api';
import {
    dailyData, getKPIs, getPlatformSummaries,
    getRecentOrders, getProductPerformance,
    getPnLData, getStockData,
    getEmptyKPIs, getEmptyDailyData, getEmptyPlatformSummaries,
    getEmptyRecentOrders, getEmptyProductPerformance,
    getEmptyPnLData, getEmptyStockData
} from '../data/sampleData';

const isAuth = () => !!localStorage.getItem('OmniTrack_auth');


// ── Overview ────────────────────────────────────────────
export async function loadKPIs(days = 30) {
    const data = await api.fetchKPIs(days);
    if (!data) return isAuth() ? getEmptyKPIs() : getKPIs();
    return {
        revenue: data.revenue,
        profit: data.profit,
        orders: data.orders,
        returns: data.returns,
        avgOrderValue: data.avg_order_value,
        profitMargin: data.profit_margin,
    };
}

export async function loadDailyData(days = 30) {
    const data = await api.fetchDailyData(days);
    if (!data) return isAuth() ? getEmptyDailyData() : dailyData;
    return data.map(d => ({
        day: d.day,
        month: d.month,
        totalRevenue: d.total_revenue,
        totalProfit: d.total_profit,
        totalOrders: d.total_orders,
        totalReturns: d.total_returns,
        avgOrderValue: d.avg_order_value,
    }));
}

export async function loadRegions() {
    const data = await api.fetchRegions();
    if (!data) return null; // will use local fallback in component
    return data;
}


// ── Platforms ────────────────────────────────────────────
export async function loadPlatformSummaries() {
    const data = await api.fetchPlatformSummaries();
    if (!data) return isAuth() ? getEmptyPlatformSummaries() : getPlatformSummaries();
    return data.map(p => ({
        id: p.slug,
        name: p.name,
        color: p.color,
        icon: p.icon,
        category: p.category,
        feeRate: p.fee_rate,
        revenue: p.total_revenue,
        profit: p.total_profit,
        orders: p.total_orders,
        returns: p.total_returns,
        fees: p.total_fees,
        margin: p.margin,
        returnRate: p.return_rate,
        avgOrderValue: p.avg_order_value,
        sparkline: p.sparkline,
    }));
}


// ── Products ────────────────────────────────────────────
export async function loadProductPerformance() {
    const data = await api.fetchProductPerformance();
    if (!data) return isAuth() ? getEmptyProductPerformance() : getProductPerformance();
    return data.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        costPrice: p.cost_price,
        sellingPrice: p.selling_price,
        stock: p.stock,
        image: p.image,
        totalSales: p.total_sales,
        totalRevenue: p.total_revenue,
        profit: p.profit,
        margin: p.margin,
        returnRate: p.return_rate,
        rank: p.rank,
        stockStatus: p.stock_status,
        dailySales: (p.daily_sales_data || []).map(d => ({
            day: d.day,
            month: d.month,
            sales: d.sales,
            revenue: d.revenue,
        })),
        platformBreakdown: p.platform_breakdown || [],
    }));
}


// ── Orders ──────────────────────────────────────────────
export async function loadOrders(params = {}) {
    const data = await api.fetchOrders(params);
    if (!data) {
        if (isAuth()) return getEmptyRecentOrders();
        // Use local data fallback for public demo
        const allOrders = getRecentOrders();
        return { orders: allOrders, total: allOrders.length, isLocal: true };
    }
    return {
        orders: data.orders.map(o => ({
            id: o.order_id,
            product: o.product_name,
            productImage: o.product_image,
            platform: o.platform_name,
            platformIcon: o.platform_icon,
            platformColor: o.platform_color,
            customer: o.customer_name,
            city: o.city,
            qty: o.quantity,
            amount: o.amount,
            status: o.status,
            statusColor: o.status_color,
            dateFormatted: o.date_formatted,
        })),
        total: data.total,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages,
        isLocal: false,
    };
}


// ── P&L ─────────────────────────────────────────────────
export async function loadPnL() {
    const data = await api.fetchPnL();
    if (!data) return isAuth() ? getEmptyPnLData() : getPnLData();
    return {
        waterfall: data.waterfall,
        costBreakdown: data.cost_breakdown,
        dailyPnL: data.daily_pnl,
        totalRevenue: data.total_revenue,
        grossProfit: data.gross_profit,
        netProfit: data.net_profit,
    };
}


// ── Stock ───────────────────────────────────────────────
export async function loadStock() {
    const data = await api.fetchStock();
    if (!data) return isAuth() ? getEmptyStockData() : getStockData();
    return data.map(s => ({
        id: s.id,
        name: s.name,
        sku: s.sku,
        category: s.category,
        image: s.image,
        stock: s.stock,
        sellingPrice: s.selling_price,
        costPrice: s.cost_price,
        dailySalesRate: s.daily_sales_rate,
        daysOfStock: s.days_of_stock,
        urgency: s.urgency,
        reorderQty: s.reorder_qty,
        reorderDate: s.reorder_date,
        stockPercent: s.stock_percent,
    }));
}


// ── CSV Upload ──────────────────────────────────────────
export async function uploadFile(file, platform = 'auto') {
    return api.uploadCsv(file, platform);
}
