/**
 * API Service Layer - Connects React frontend to FastAPI backend
 * Falls back to local sample data when backend is unavailable
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let backendAvailable = null; // null = not checked, true/false = checked

async function checkBackend() {
    if (backendAvailable !== null) return backendAvailable;
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
        backendAvailable = res.ok;
    } catch {
        backendAvailable = false;
    }
    return backendAvailable;
}

async function apiFetch(path, options = {}) {
    const isAvailable = await checkBackend();
    if (!isAvailable) return null;

    let token = localStorage.getItem('sellerverse_auth');
    if (token && (token.startsWith('{') || token === '[object Object]')) {
        console.warn('Cleaning up legacy auth token format');
        localStorage.removeItem('sellerverse_auth');
        token = null;
    }
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...authHeader,
                ...options.headers
            },
            ...options,
        });
        if (res.status === 401) {
            console.error('Session expired, logging out...');
            localStorage.removeItem('sellerverse_auth');
            // Only redirect if we're not already on login/signup to avoid loops
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
                window.location.href = '/login';
            }
            return null;
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`API call failed for ${path}:`, err.message);
        return null;
    }
}

// ── Overview ─────────────────────────────────────────
export async function fetchKPIs() {
    return apiFetch('/overview/kpis');
}

export async function fetchDailyData(days = 30) {
    return apiFetch(`/overview/daily?days=${days}`);
}

export async function fetchRegions() {
    return apiFetch('/overview/regions');
}

// ── Platforms ────────────────────────────────────────
export async function fetchPlatformSummaries() {
    return apiFetch('/platforms/summaries');
}

export async function fetchPlatforms() {
    return apiFetch('/platforms/');
}

// ── Products ────────────────────────────────────────
export async function fetchProductPerformance() {
    return apiFetch('/products/performance');
}

export async function fetchProducts() {
    return apiFetch('/products/');
}

export async function createProduct(data) {
    return apiFetch('/products/', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateProduct(id, data) {
    return apiFetch(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// ── Orders ──────────────────────────────────────────
export async function fetchOrders({ page = 1, perPage = 10, search = '', platform = '', sortBy = 'date', sortDir = 'desc' } = {}) {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_dir: sortDir,
    });
    if (search) params.set('search', search);
    if (platform && platform !== 'All') params.set('platform', platform);

    return apiFetch(`/orders/?${params}`);
}

// ── P&L ─────────────────────────────────────────────
export async function fetchPnL() {
    return apiFetch('/pnl/');
}

// ── Stock ───────────────────────────────────────────
export async function fetchStock() {
    return apiFetch('/stock/');
}

// ── CSV Upload ──────────────────────────────────────
export async function uploadCsv(file, platform = 'auto') {
    const isAvailable = await checkBackend();
    if (!isAvailable) return null;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch(`${API_BASE}/upload/csv?platform=${encodeURIComponent(platform)}`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('CSV upload failed:', err.message);
        return null;
    }
}

export async function fetchUploadHistory() {
    return apiFetch('/upload/history');
}

// ── Seed ────────────────────────────────────────────
export async function seedDatabase() {
    return apiFetch('/seed', { method: 'POST' });
}

// ── Utility ─────────────────────────────────────────
export { checkBackend };
