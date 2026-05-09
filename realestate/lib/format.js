export function fmtPrice(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/\.0+$/, '') + 'M';
    if (n >= 100_000) return '$' + Math.round(n / 1_000) + 'K';
    return '$' + n.toLocaleString('en-US');
}
export function fmtPriceFull(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return '—';
    return '$' + n.toLocaleString('en-US');
}
export function fmtSqft(n) { return Number(n).toLocaleString('en-US') + ' sqft'; }
export function fmtDaysAgo(d) {
    if (d <= 0) return 'today';
    if (d === 1) return '1 day ago';
    if (d < 30) return d + ' days ago';
    if (d < 60) return '1 month ago';
    return Math.round(d / 30) + ' months ago';
}
export function fmtMonthly(n) { return '$' + Math.round(n).toLocaleString('en-US') + ' / mo'; }
export function fmtSpecs(l) { return l.beds + ' bd · ' + l.baths + ' ba · ' + l.sqft.toLocaleString('en-US') + ' sqft'; }
export function fmtCityState(l) { return l.address.city + ', ' + l.address.state + ' ' + l.address.zip; }
