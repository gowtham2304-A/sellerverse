// Sample Data for D2C Seller Dashboard
// Realistic Indian ecommerce data with ₹ currency

const platforms = {
    india: [
        { id: 'amazon', name: 'Amazon India', color: '#FF9900', icon: '📦', category: 'india', feeRate: 0.15, avgReturnRate: 0.08 },
        { id: 'meesho', name: 'Meesho', color: '#E91E63', icon: '🛍️', category: 'india', feeRate: 0.0, avgReturnRate: 0.18 },
        { id: 'flipkart', name: 'Flipkart', color: '#2874F0', icon: '🏪', category: 'india', feeRate: 0.12, avgReturnRate: 0.10 },
        { id: 'myntra', name: 'Myntra', color: '#FF3F6C', icon: '👗', category: 'india', feeRate: 0.20, avgReturnRate: 0.22 },
        { id: 'nykaa', name: 'Nykaa', color: '#FC2779', icon: '💄', category: 'india', feeRate: 0.18, avgReturnRate: 0.05 },
        { id: 'snapdeal', name: 'Snapdeal', color: '#E40046', icon: '🎯', category: 'india', feeRate: 0.10, avgReturnRate: 0.12 },
        { id: 'jiomart', name: 'JioMart', color: '#0078AD', icon: '🛒', category: 'india', feeRate: 0.08, avgReturnRate: 0.07 },
        { id: 'glowroad', name: 'Glowroad', color: '#7B2D8E', icon: '✨', category: 'india', feeRate: 0.05, avgReturnRate: 0.15 },
    ],
    global: [
        { id: 'shopify', name: 'Shopify', color: '#96BF48', icon: '🏬', category: 'global', feeRate: 0.029, avgReturnRate: 0.06 },
        { id: 'woocommerce', name: 'WooCommerce', color: '#96588A', icon: '🌐', category: 'global', feeRate: 0.0, avgReturnRate: 0.05 },
        { id: 'etsy', name: 'Etsy', color: '#F1641E', icon: '🎨', category: 'global', feeRate: 0.065, avgReturnRate: 0.04 },
        { id: 'ebay', name: 'eBay', color: '#E53238', icon: '🏷️', category: 'global', feeRate: 0.13, avgReturnRate: 0.09 },
        { id: 'tiktokshop', name: 'TikTok Shop', color: '#00F2EA', icon: '🎵', category: 'global', feeRate: 0.05, avgReturnRate: 0.11 },
        { id: 'noon', name: 'Noon', color: '#FEEE00', icon: '☀️', category: 'global', feeRate: 0.10, avgReturnRate: 0.08 },
        { id: 'lazada', name: 'Lazada', color: '#0F146D', icon: '🌏', category: 'global', feeRate: 0.06, avgReturnRate: 0.10 },
        { id: 'shopee', name: 'Shopee', color: '#EE4D2D', icon: '🧡', category: 'global', feeRate: 0.05, avgReturnRate: 0.12 },
    ],
    social: [
        { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', icon: '💬', category: 'social', feeRate: 0.0, avgReturnRate: 0.03 },
        { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: '📸', category: 'social', feeRate: 0.0, avgReturnRate: 0.05 },
        { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: '👥', category: 'social', feeRate: 0.05, avgReturnRate: 0.06 },
    ],
};

const allPlatforms = [...platforms.india, ...platforms.global, ...platforms.social];

const products = [
    { id: 1, name: 'Premium Cotton T-Shirt', sku: 'TSH-001', category: 'Apparel', costPrice: 280, sellingPrice: 699, stock: 456, image: '👕' },
    { id: 2, name: 'Wireless Earbuds Pro', sku: 'EAR-002', category: 'Electronics', costPrice: 420, sellingPrice: 1299, stock: 234, image: '🎧' },
    { id: 3, name: 'Organic Face Serum', sku: 'SER-003', category: 'Beauty', costPrice: 180, sellingPrice: 599, stock: 678, image: '✨' },
    { id: 4, name: 'Leather Wallet Classic', sku: 'WAL-004', category: 'Accessories', costPrice: 350, sellingPrice: 899, stock: 123, image: '👛' },
    { id: 5, name: 'Smart Watch Band', sku: 'SWB-005', category: 'Electronics', costPrice: 150, sellingPrice: 499, stock: 567, image: '⌚' },
    { id: 6, name: 'Bamboo Water Bottle', sku: 'BWB-006', category: 'Lifestyle', costPrice: 220, sellingPrice: 649, stock: 345, image: '🍶' },
    { id: 7, name: 'Aromatherapy Candle Set', sku: 'ACS-007', category: 'Home', costPrice: 190, sellingPrice: 549, stock: 89, image: '🕯️' },
    { id: 8, name: 'Phone Case Premium', sku: 'PHC-008', category: 'Accessories', costPrice: 80, sellingPrice: 299, stock: 892, image: '📱' },
    { id: 9, name: 'Yoga Mat Pro', sku: 'YMP-009', category: 'Fitness', costPrice: 450, sellingPrice: 1199, stock: 167, image: '🧘' },
    { id: 10, name: 'Hair Growth Oil', sku: 'HGO-010', category: 'Beauty', costPrice: 140, sellingPrice: 449, stock: 534, image: '💆' },
    { id: 11, name: 'Canvas Tote Bag', sku: 'CTB-011', category: 'Accessories', costPrice: 120, sellingPrice: 399, stock: 23, image: '👜' },
    { id: 12, name: 'USB-C Hub 7-in-1', sku: 'USB-012', category: 'Electronics', costPrice: 520, sellingPrice: 1499, stock: 198, image: '🔌' },
];

// Generate 30 days of data
function generateDailyData() {
    const days = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const seasonMultiplier = 1 + Math.sin(i / 5) * 0.2;

        const dayData = {
            date: dateStr,
            dayName,
            day: date.getDate(),
            month: date.toLocaleDateString('en-IN', { month: 'short' }),
        };

        // Per platform data
        const platformData = {};
        let totalRevenue = 0;
        let totalProfit = 0;
        let totalOrders = 0;
        let totalReturns = 0;

        // Only use 10 active platforms
        const activePlatforms = [
            allPlatforms[0], // Amazon
            allPlatforms[1], // Meesho
            allPlatforms[2], // Flipkart
            allPlatforms[3], // Myntra
            allPlatforms[4], // Nykaa
            allPlatforms[8], // Shopify
            allPlatforms[9], // WooCommerce
            allPlatforms[14], // TikTok Shop
            allPlatforms[16], // WhatsApp
            allPlatforms[17], // Instagram
        ];

        activePlatforms.forEach(platform => {
            const baseOrders = platform.id === 'amazon' ? 45 :
                platform.id === 'flipkart' ? 35 :
                    platform.id === 'meesho' ? 55 :
                        platform.id === 'myntra' ? 20 :
                            platform.id === 'shopify' ? 15 :
                                platform.id === 'nykaa' ? 12 :
                                    platform.id === 'whatsapp' ? 8 :
                                        platform.id === 'instagram' ? 10 :
                                            platform.id === 'woocommerce' ? 6 :
                                                5;

            const orders = Math.round(baseOrders * (0.7 + Math.random() * 0.6) * seasonMultiplier * (isWeekend ? 1.3 : 1));
            const avgOrderValue = 500 + Math.random() * 800;
            const revenue = Math.round(orders * avgOrderValue);
            const fees = Math.round(revenue * platform.feeRate);
            const cogs = Math.round(revenue * (0.35 + Math.random() * 0.1));
            const returns = Math.round(orders * platform.avgReturnRate * (0.8 + Math.random() * 0.4));
            const returnValue = Math.round(returns * avgOrderValue * 0.9);
            const profit = revenue - fees - cogs - returnValue;

            platformData[platform.id] = {
                orders,
                revenue,
                fees,
                cogs,
                returns,
                returnValue,
                profit,
                avgOrderValue: Math.round(avgOrderValue),
            };

            totalRevenue += revenue;
            totalProfit += profit;
            totalOrders += orders;
            totalReturns += returns;
        });

        dayData.platforms = platformData;
        dayData.totalRevenue = totalRevenue;
        dayData.totalProfit = totalProfit;
        dayData.totalOrders = totalOrders;
        dayData.totalReturns = totalReturns;
        dayData.avgOrderValue = Math.round(totalRevenue / totalOrders);

        days.push(dayData);
    }

    return days;
}

const dailyData = generateDailyData();

// Aggregate KPIs
function getKPIs() {
    const last7 = dailyData.slice(-7);
    const prev7 = dailyData.slice(-14, -7);

    const currentRevenue = last7.reduce((s, d) => s + d.totalRevenue, 0);
    const prevRevenue = prev7.reduce((s, d) => s + d.totalRevenue, 0);
    const currentProfit = last7.reduce((s, d) => s + d.totalProfit, 0);
    const prevProfit = prev7.reduce((s, d) => s + d.totalProfit, 0);
    const currentOrders = last7.reduce((s, d) => s + d.totalOrders, 0);
    const prevOrders = prev7.reduce((s, d) => s + d.totalOrders, 0);
    const currentReturns = last7.reduce((s, d) => s + d.totalReturns, 0);
    const prevReturns = prev7.reduce((s, d) => s + d.totalReturns, 0);

    const totalRevenue30d = dailyData.reduce((s, d) => s + d.totalRevenue, 0);
    const totalProfit30d = dailyData.reduce((s, d) => s + d.totalProfit, 0);
    const totalOrders30d = dailyData.reduce((s, d) => s + d.totalOrders, 0);
    const totalReturns30d = dailyData.reduce((s, d) => s + d.totalReturns, 0);

    return {
        revenue: { value: totalRevenue30d, change: ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) },
        profit: { value: totalProfit30d, change: ((currentProfit - prevProfit) / prevProfit * 100).toFixed(1) },
        orders: { value: totalOrders30d, change: ((currentOrders - prevOrders) / prevOrders * 100).toFixed(1) },
        returns: { value: totalReturns30d, change: ((currentReturns - prevReturns) / prevReturns * 100).toFixed(1) },
        avgOrderValue: { value: Math.round(totalRevenue30d / totalOrders30d), change: '+3.2' },
        profitMargin: { value: ((totalProfit30d / totalRevenue30d) * 100).toFixed(1), change: '+1.8' },
    };
}

// Platform aggregated data
function getPlatformSummaries() {
    const activePlatformIds = ['amazon', 'meesho', 'flipkart', 'myntra', 'nykaa', 'shopify', 'woocommerce', 'tiktokshop', 'whatsapp', 'instagram'];

    return activePlatformIds.map(pid => {
        const platform = allPlatforms.find(p => p.id === pid);
        if (!platform) return null;

        const totals = dailyData.reduce((acc, day) => {
            const pd = day.platforms[pid];
            if (!pd) return acc;
            return {
                revenue: acc.revenue + pd.revenue,
                profit: acc.profit + pd.profit,
                orders: acc.orders + pd.orders,
                returns: acc.returns + pd.returns,
                fees: acc.fees + pd.fees,
            };
        }, { revenue: 0, profit: 0, orders: 0, returns: 0, fees: 0 });

        const sparkline = dailyData.slice(-14).map(day => {
            const pd = day.platforms[pid];
            return pd ? pd.revenue : 0;
        });

        return {
            ...platform,
            ...totals,
            margin: ((totals.profit / totals.revenue) * 100).toFixed(1),
            returnRate: ((totals.returns / totals.orders) * 100).toFixed(1),
            avgOrderValue: Math.round(totals.revenue / totals.orders),
            sparkline,
        };
    }).filter(Boolean);
}

// Recent orders
function getRecentOrders() {
    const statuses = ['Delivered', 'Shipped', 'Processing', 'Returned', 'Cancelled'];
    const statusColors = {
        'Delivered': '#10b981',
        'Shipped': '#2563eb',
        'Processing': '#f59e0b',
        'Returned': '#ef4444',
        'Cancelled': '#6b7280',
    };
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Jaipur', 'Ahmedabad', 'Lucknow'];

    const activePlatformIds = ['amazon', 'meesho', 'flipkart', 'myntra', 'nykaa', 'shopify', 'woocommerce', 'tiktokshop', 'whatsapp', 'instagram'];

    return Array.from({ length: 50 }, (_, i) => {
        const product = products[Math.floor(Math.random() * products.length)];
        const platformId = activePlatformIds[Math.floor(Math.random() * activePlatformIds.length)];
        const platform = allPlatforms.find(p => p.id === platformId);
        const status = statuses[Math.floor(Math.random() * (i < 10 ? 3 : statuses.length))];
        const qty = 1 + Math.floor(Math.random() * 3);
        const date = new Date();
        date.setHours(date.getHours() - Math.floor(Math.random() * 72));

        return {
            id: `ORD-${(10000 + i).toString()}`,
            product: product.name,
            productImage: product.image,
            sku: product.sku,
            platform: platform.name,
            platformId: platform.id,
            platformColor: platform.color,
            platformIcon: platform.icon,
            customer: `Customer ${1000 + i}`,
            city: cities[Math.floor(Math.random() * cities.length)],
            qty,
            amount: product.sellingPrice * qty,
            status,
            statusColor: statusColors[status],
            date: date.toISOString(),
            dateFormatted: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        };
    });
}

// Product performance
function getProductPerformance() {
    return products.map((product, idx) => {
        const dailySales = dailyData.map(day => {
            const baseSales = Math.round((30 - idx * 2) * (0.6 + Math.random() * 0.8));
            return {
                date: day.date,
                day: day.day,
                month: day.month,
                sales: Math.max(1, baseSales),
                revenue: Math.max(1, baseSales) * product.sellingPrice,
            };
        });

        const totalSales = dailySales.reduce((s, d) => s + d.sales, 0);
        const totalRevenue = totalSales * product.sellingPrice;
        const totalCost = totalSales * product.costPrice;
        const profit = totalRevenue - totalCost;
        const returns = Math.round(totalSales * (0.03 + Math.random() * 0.08));

        const platformBreakdown = [
            { name: 'Amazon', value: Math.round(totalRevenue * 0.30), color: '#FF9900' },
            { name: 'Flipkart', value: Math.round(totalRevenue * 0.22), color: '#2874F0' },
            { name: 'Meesho', value: Math.round(totalRevenue * 0.18), color: '#E91E63' },
            { name: 'Shopify', value: Math.round(totalRevenue * 0.12), color: '#96BF48' },
            { name: 'Others', value: Math.round(totalRevenue * 0.18), color: '#6366f1' },
        ];

        const stockStatus = product.stock < 50 ? 'critical' : product.stock < 150 ? 'low' : product.stock < 400 ? 'medium' : 'healthy';

        return {
            ...product,
            totalSales,
            totalRevenue,
            totalCost,
            profit,
            margin: ((profit / totalRevenue) * 100).toFixed(1),
            returns,
            returnRate: ((returns / totalSales) * 100).toFixed(1),
            dailySales,
            platformBreakdown,
            stockStatus,
            rank: idx + 1,
        };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// Stock data
function getStockData() {
    return products.map(p => {
        const dailySalesRate = Math.round(5 + Math.random() * 20);
        const daysOfStock = Math.round(p.stock / dailySalesRate);
        const urgency = daysOfStock <= 3 ? 'critical' : daysOfStock <= 7 ? 'warning' : daysOfStock <= 14 ? 'moderate' : 'healthy';

        return {
            ...p,
            dailySalesRate,
            daysOfStock,
            urgency,
            reorderQty: dailySalesRate * 14,
            reorderDate: new Date(Date.now() + daysOfStock * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            stockPercent: Math.min(100, Math.round((p.stock / (dailySalesRate * 30)) * 100)),
        };
    }).sort((a, b) => a.daysOfStock - b.daysOfStock);
}

// P&L Data
function getPnLData() {
    const totalRevenue = dailyData.reduce((s, d) => s + d.totalRevenue, 0);
    const activePlatformIds = ['amazon', 'meesho', 'flipkart', 'myntra', 'nykaa', 'shopify', 'woocommerce', 'tiktokshop', 'whatsapp', 'instagram'];

    const totalFees = dailyData.reduce((s, d) => {
        return s + activePlatformIds.reduce((fs, pid) => fs + (d.platforms[pid]?.fees || 0), 0);
    }, 0);
    const totalCOGS = Math.round(totalRevenue * 0.38);
    const totalReturns = dailyData.reduce((s, d) => {
        return s + activePlatformIds.reduce((rs, pid) => rs + (d.platforms[pid]?.returnValue || 0), 0);
    }, 0);
    const shipping = Math.round(totalRevenue * 0.06);
    const marketing = Math.round(totalRevenue * 0.08);
    const packaging = Math.round(totalRevenue * 0.02);
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalFees - totalReturns - shipping - marketing - packaging;

    const waterfall = [
        { name: 'Revenue', value: totalRevenue, fill: '#10b981', type: 'positive' },
        { name: 'COGS', value: -totalCOGS, fill: '#ef4444', type: 'negative' },
        { name: 'Gross Profit', value: grossProfit, fill: '#7c3aed', type: 'subtotal' },
        { name: 'Platform Fees', value: -totalFees, fill: '#ef4444', type: 'negative' },
        { name: 'Returns', value: -totalReturns, fill: '#f59e0b', type: 'negative' },
        { name: 'Shipping', value: -shipping, fill: '#ef4444', type: 'negative' },
        { name: 'Marketing', value: -marketing, fill: '#ef4444', type: 'negative' },
        { name: 'Packaging', value: -packaging, fill: '#ef4444', type: 'negative' },
        { name: 'Net Profit', value: netProfit, fill: '#10b981', type: 'total' },
    ];

    const costBreakdown = [
        { name: 'COGS', value: totalCOGS, color: '#ef4444' },
        { name: 'Platform Fees', value: totalFees, color: '#f59e0b' },
        { name: 'Returns', value: totalReturns, color: '#ec4899' },
        { name: 'Shipping', value: shipping, color: '#8b5cf6' },
        { name: 'Marketing', value: marketing, color: '#06b6d4' },
        { name: 'Packaging', value: packaging, color: '#6366f1' },
    ];

    const dailyPnL = dailyData.map(d => ({
        date: d.date,
        day: d.day,
        month: d.month,
        revenue: d.totalRevenue,
        profit: d.totalProfit,
        margin: ((d.totalProfit / d.totalRevenue) * 100).toFixed(1),
    }));

    return { waterfall, costBreakdown, dailyPnL, totalRevenue, grossProfit, netProfit, totalCOGS, totalFees, totalReturns, shipping, marketing, packaging };
}

// ── Empty Data Generators ──────────────────────────
export function getEmptyKPIs() {
    return {
        revenue: { value: 0, change: '0.0' },
        profit: { value: 0, change: '0.0' },
        orders: { value: 0, change: '0.0' },
        returns: { value: 0, change: '0.0' },
        avgOrderValue: { value: 0, change: '0.0' },
        profitMargin: { value: 0, change: '0.0' },
    };
}

export function getEmptyDailyData() {
    return [];
}

export function getEmptyPlatformSummaries() {
    return [];
}

export function getEmptyProductPerformance() {
    return [];
}

export function getEmptyRecentOrders() {
    return { orders: [], total: 0 };
}

export function getEmptyPnLData() {
    return {
        waterfall: [
            { name: 'Revenue', value: 0, fill: '#10b981', type: 'positive' },
            { name: 'COGS', value: 0, fill: '#ef4444', type: 'negative' },
            { name: 'Gross Profit', value: 0, fill: '#7c3aed', type: 'subtotal' },
            { name: 'Platform Fees', value: 0, fill: '#ef4444', type: 'negative' },
            { name: 'Returns', value: 0, fill: '#f59e0b', type: 'negative' },
            { name: 'Net Profit', value: 0, fill: '#10b981', type: 'total' },
        ],
        costBreakdown: [],
        dailyPnL: [],
        totalRevenue: 0,
        grossProfit: 0,
        netProfit: 0
    };
}

export function getEmptyStockData() {
    return [];
}

export {
    platforms,
    allPlatforms,
    products,
    dailyData,
    getKPIs,
    getPlatformSummaries,
    getRecentOrders,
    getProductPerformance,
    getStockData,
    getPnLData,
};
