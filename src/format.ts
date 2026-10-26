export const esc=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export const fmtNum=(n:number)=>new Intl.NumberFormat('en-PH',{maximumFractionDigits:2}).format(n);
export const fmtMoney=(n:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export const shortDate=(s:string)=>s?new Date(s).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}):'—';
export const dateTime=(s:string)=>s?new Date(s).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
