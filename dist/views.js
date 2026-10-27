import { getStats, forecast, templates, trainingModules } from './domain.js';
import { esc, fmtNum, fmtMoney, shortDate, dateTime } from './format.js';
const paths = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    boxes: '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Z"/><path d="m3 7 9 4 9-4M12 11v10"/>',
    clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m9 13 2 2 4-4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    chart: '<path d="M3 3v18h18M7 16l4-5 4 3 5-8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    up: '<path d="m7 14 5-5 5 5"/>',
    down: '<path d="m7 10 5 5 5-5"/>',
    alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5m0 4h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    close: '<path d="M5 5 19 19M19 5 5 19"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    box: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    coffee: '<path d="M5 8h13v7a6.5 6.5 0 0 1-13 0V8Zm13 2h2a3 3 0 0 1 0 6h-2M3 22h17M8 2v3m5-3v3"/>',
    shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    edit: '<path d="m4 20 5-1 11-11-4-4L5 15l-1 5ZM14 6l4 4"/>'
};
export const icon = (name, size = 18) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.box}</svg>`;
export const button = (label, action, cls = 'btn btn-primary', id = '', extra = '') => `<button type="button" class="${cls}" data-action="${esc(action)}" ${id ? `data-id="${esc(id)}"` : ''} ${extra}>${label}</button>`;
const navItems = [['overview', 'Overview', 'grid'], ['inventory', 'Inventory', 'boxes'], ['orders', 'Orders', 'coffee'], ['checklists', 'Checklists', 'clipboard'], ['team', 'People & training', 'users'], ['insights', 'Insights', 'chart']];
const user = (db, id) => db.employees.find(e => e.id === id)?.name || 'Unassigned';
const initials = (name) => name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
const sentence = (s) => s.replaceAll('-', ' ');
const stockAction = { opening: 'Opening balance', receive: 'Received', consume: 'Used in service', waste: 'Wasted', count: 'Count adjustment' };
const statusLabel = {
    queued: 'Queued', verification: 'Awaiting check', 'needs-fix': 'Needs correction', completed: 'Completed', cancelled: 'Cancelled', active: 'Active', inactive: 'Inactive',
    'in-stock': 'In stock', 'low-stock': 'Below minimum', 'out-of-stock': 'Out of stock', 'at-minimum': 'At minimum',
    assigned: 'Open assignment', 'up-to-date': 'Current', 'in-progress': 'In progress'
};
const status = (kind) => `<span class="status status-${esc(kind)}"><span class="status-mark" aria-hidden="true"></span>${esc(statusLabel[kind] || sentence(kind))}</span>`;
const todayLabel = () => new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const pageTitle = (page) => navItems.find(([id]) => id === page)?.[1] || 'Overview';
const empty = (title, body, action = '') => `<div class="empty-state"><p class="empty-title">${esc(title)}</p><p>${esc(body)}</p>${action}</div>`;
const pageHead = (title, sub, actions = '', meta = '') => `<header class="page-head"><div class="page-title-group">${meta ? `<p class="page-meta">${meta}</p>` : ''}<h1 id="page-title" tabindex="-1">${esc(title)}</h1><p class="page-sub">${esc(sub)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</header>`;
const sectionHead = (title, right = '', id = '') => `<div class="section-head"><h2 ${id ? `id="${esc(id)}"` : ''}>${title}</h2>${right}</div>`;
const countBadge = (n, label) => `<span class="count-badge">${fmtNum(n)}<span class="visually-hidden"> ${esc(label)}</span></span>`;
const progress = (done, total, label) => `<div class="progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}" aria-valuetext="${done} of ${total} steps complete"><span style="width:${total ? Math.round(done / total * 100) : 0}%"></span></div>`;
const actorOptions = (db, selected) => db.employees.filter(e => e.active).map(e => `<option value="${esc(e.id)}" ${e.id === selected ? 'selected' : ''}>${esc(e.name)} · ${esc(e.role)}</option>`).join('');
const operator = (db, ui) => {
    const active = db.employees.filter(e => e.active);
    return `<div class="actor-control"><label for="operator">Acting as</label>${active.length ? `<select id="operator" aria-label="Acting staff member">${actorOptions(db, ui.actorId)}</select>` : `<select id="operator" aria-label="Acting staff member" disabled><option>No active staff</option></select><button type="button" class="actor-add" data-action="add-employee">Add staff</button>`}</div>`;
};
const staffRequired = (db, ui) => db.employees.some(e => e.id === ui.actorId && e.active) ? '' : `<p class="staff-required" role="status">${icon('users', 17)} No acting staff member selected. Choose one in the top bar to record changes.</p>`;
const searchField = (placeholder, value) => `<div class="search-field"><label class="visually-hidden" for="page-search">${esc(placeholder)}</label>${icon('search', 18)}<input type="search" id="page-search" placeholder="${esc(placeholder)}" value="${esc(value)}" autocomplete="off">${value ? `<button type="button" class="search-clear" data-action="clear-search" aria-label="Clear search">${icon('close', 15)}</button>` : ''}</div>`;
const stockSeverity = (qty, min) => {
    if (qty <= 0)
        return { kind: 'out-of-stock', label: 'Out of stock', shortfall: min };
    if (qty < min)
        return { kind: 'low-stock', label: 'Below minimum', shortfall: min - qty };
    if (qty === min)
        return { kind: 'at-minimum', label: 'At minimum', shortfall: 0 };
    return { kind: 'in-stock', label: 'In stock', shortfall: 0 };
};
const orderNote = (db, o) => {
    if (o.status === 'verification')
        return `Prepared by ${user(db, o.preparedBy)}. Needs an independent check.`;
    if (o.status === 'needs-fix')
        return 'Returned for correction after a failed check.';
    if (o.status === 'completed') {
        const v = [...o.verifications].reverse().find(x => x.passed);
        return v ? `Checked by ${user(db, v.actorId)}.` : 'Recorded as complete.';
    }
    if (o.status === 'cancelled')
        return o.cancelReason ? `Cancelled: ${o.cancelReason}` : 'Cancelled.';
    return 'Ready to be prepared.';
};
const lastFailure = (o) => [...o.verifications].reverse().find(v => !v.passed);
const actionFor = (db, o, ui) => {
    const canAct = db.employees.some(e => e.id === ui.actorId && e.active);
    if (o.status === 'verification') {
        if (!canAct)
            return { action: 'focus-operator', label: 'Select staff' };
        if (o.preparedBy === ui.actorId)
            return { action: 'focus-operator', label: 'Change checker' };
        return { action: 'verify-order', label: 'Verify order' };
    }
    if (o.status === 'needs-fix')
        return canAct ? { action: 'prepare-order', label: 'Reprepare' } : { action: 'focus-operator', label: 'Select staff' };
    if (o.status === 'queued')
        return canAct ? { action: 'prepare-order', label: 'Mark prepared' } : { action: 'focus-operator', label: 'Select staff' };
    return { action: 'view-order', label: 'View record' };
};
export function appView(db, ui) {
    const current = pageTitle(ui.page);
    return `<a class="skip-link" href="#main-content">Skip to main content</a>
 <div class="shell" ${ui.modal ? 'inert' : ''}>
 <aside class="sidebar" id="app-sidebar" aria-label="Workspace navigation">
   <div class="sidebar-brand-row">
     <div class="brand"><div class="brand-emblem" aria-hidden="true">B<span>.</span></div><div class="brand-name">BRANCHWORK<small>BigBrew operations</small></div></div>
     <button type="button" class="icon-btn sidebar-close" data-action="mobile-toggle" aria-label="Close navigation">${icon('close', 20)}</button>
   </div>
   <nav class="nav-stack" aria-label="Primary">${navItems.map(([p, title, i]) => `<button type="button" data-action="nav" data-page="${p}" class="nav-link ${ui.page === p ? 'is-selected' : ''}" ${ui.page === p ? 'aria-current="page"' : ''}>${icon(i, 19)}<span>${esc(title)}</span></button>`).join('')}</nav>
   <div class="sidebar-foot"><p class="sidebar-note">Local-first prototype<span>Records stay in this browser. No account or cloud sync.</span></p></div>
 </aside>
 <button type="button" class="drawer-scrim" data-action="mobile-toggle" aria-label="Close navigation" aria-hidden="true" tabindex="-1"></button>
 <div class="app-main">
   <header class="topbar">
     <div class="topbar-main">
       <div class="topbar-context">
         <button type="button" class="icon-btn menu-btn" data-action="mobile-toggle" aria-label="Open navigation" aria-expanded="${ui.mobileOpen}" aria-controls="app-sidebar">${icon('menu', 21)}</button>
         <span class="mobile-wordmark">BRANCHWORK</span>
         <span class="crumb-root">Workspace</span><span class="crumb-sep" aria-hidden="true">/</span><span class="crumb-current">${esc(current)}</span>
       </div>
       ${operator(db, ui)}
     </div>
   </header>
   <main class="page" id="main-content" tabindex="-1">
     ${db.mode === 'sample' ? `<div class="notice notice-sample"><span class="notice-mark" aria-hidden="true">${icon('alert', 18)}</span><p><strong>Sample workspace.</strong> Every record is illustrative, not a measured BigBrew result.</p>${button('Start with empty data', 'confirm-blank', 'btn btn-secondary btn-sm')}</div>` : `<div class="notice notice-local"><span class="notice-mark" aria-hidden="true">${icon('shield', 17)}</span><p><strong>Local workspace.</strong> Saved on this browser only.</p>${button('Load sample workspace', 'confirm-sample', 'btn btn-quiet btn-sm')}</div>`}
     ${ui.page === 'overview' ? overview(db, ui) : ui.page === 'inventory' ? inventory(db, ui) : ui.page === 'orders' ? orders(db, ui) : ui.page === 'checklists' ? checklists(db, ui) : ui.page === 'team' ? team(db) : insights(db)}
     <footer class="page-footer"><span>Branchwork · Independent operations prototype</span><span>Not official BigBrew software · No records leave this device</span></footer>
   </main>
 </div>
 <nav class="mobile-dock" aria-label="Quick navigation">
   ${['overview', 'orders', 'inventory', 'checklists'].map(p => { const item = navItems.find(([id]) => id === p); const short = p === 'inventory' ? 'Stock' : p === 'checklists' ? 'Routines' : item[1]; return `<button type="button" data-action="nav" data-page="${p}" class="dock-link ${ui.page === p ? 'is-active' : ''}" ${ui.page === p ? 'aria-current="page"' : ''} aria-label="${esc(item[1])}">${icon(item[2], 20)}<span>${esc(short)}</span></button>`; }).join('')}
   <button type="button" data-action="mobile-toggle" aria-label="Open all navigation" aria-expanded="${ui.mobileOpen}" aria-controls="app-sidebar" class="dock-link ${ui.page === 'team' || ui.page === 'insights' ? 'is-active' : ''}">${icon('menu', 20)}<span>More</span></button>
 </nav>
 </div>
 ${ui.modal ? renderModal(db, ui) : ''}`;
}
function recentActivity(db) {
    return [
        ...db.movements.slice(0, 8).map(m => ({ at: m.at, type: 'Stock', subject: db.ingredients.find(i => i.id === m.ingredientId)?.name || 'Ingredient', desc: `${stockAction[m.action] || sentence(m.action)} ${m.delta > 0 ? '+' : ''}${fmtNum(m.delta)} · ${user(db, m.actorId)}` })),
        ...db.orders.slice(0, 8).map(o => ({ at: o.createdAt, type: 'Order', subject: o.code, desc: `${o.channel} · ${statusLabel[o.status] || sentence(o.status)}` }))
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
}
function overview(db, ui) {
    const st = getStats(db);
    const open = db.orders.filter(o => !['cancelled', 'completed'].includes(o.status)).sort((a, b) => {
        const priority = (o) => o.status === 'verification' ? 0 : o.status === 'needs-fix' ? 1 : 2;
        return priority(a) - priority(b) || a.createdAt.localeCompare(b.createdAt);
    });
    const atRisk = st.low.slice().sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name));
    const pending = db.checklists.filter(c => !c.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const canAct = db.employees.some(e => e.id === ui.actorId && e.active);
    const first = open[0];
    const needsNewVerifier = !!first && first.status === 'verification' && first.preparedBy === ui.actorId;
    const awaiting = open.filter(o => o.status === 'verification').length;
    let nextTitle = 'Review the shift routines', nextBody = 'No open orders or low-stock items in the current local records.', nextAction = 'go-checklists', nextLabel = 'Open checklists', nextId = '';
    if (!db.employees.length) {
        nextTitle = 'Add your first staff member';
        nextBody = 'Stock movements, order preparation, and sign-offs all need a named local operator.';
        nextAction = 'add-employee';
        nextLabel = 'Add employee';
    }
    else if (first) {
        if (first.status === 'verification') {
            nextTitle = `Check ${first.code}`;
            nextBody = needsNewVerifier ? 'Prepared by you. Switch the acting staff member before completing the independent check.' : `Prepared by ${user(db, first.preparedBy)}. Confirm the drink, modifiers, seal, and label.`;
            nextAction = needsNewVerifier || !canAct ? 'focus-operator' : 'verify-order';
            nextId = nextAction === 'verify-order' ? first.id : '';
            nextLabel = nextAction === 'focus-operator' ? 'Change checker' : 'Open verification';
        }
        else if (first.status === 'needs-fix') {
            const failure = lastFailure(first);
            nextTitle = `Correct ${first.code}`;
            nextBody = failure ? `${failure.issueType}: ${failure.notes || 'No note recorded'}. Fix the order, then prepare it for a fresh check.` : 'The order was returned after a failed check. Correct it and prepare it again.';
            nextAction = canAct ? 'prepare-order' : 'focus-operator';
            nextId = canAct ? first.id : '';
            nextLabel = canAct ? 'Reprepare order' : 'Select staff';
        }
        else {
            nextTitle = `Prepare ${first.code}`;
            nextBody = `${first.lines.reduce((sum, l) => sum + l.qty, 0)} drinks · ${first.channel}. Mark it prepared to request a second-person check.`;
            nextAction = canAct ? 'prepare-order' : 'focus-operator';
            nextId = canAct ? first.id : '';
            nextLabel = canAct ? 'Mark prepared' : 'Select staff';
        }
    }
    else if (atRisk.length) {
        const item = atRisk[0];
        const severity = stockSeverity(item.qty, item.min);
        nextTitle = `Replenish ${item.name}`;
        nextBody = `${fmtNum(item.qty)} ${item.unit} on hand · reorder point ${fmtNum(item.min)} ${item.unit}. ${severity.kind === 'out-of-stock' ? 'The ingredient is out of stock.' : `${fmtNum(severity.shortfall)} ${item.unit} below the reorder point.`}`;
        nextAction = canAct ? 'move-stock' : 'go-inventory';
        nextId = canAct ? item.id : '';
        nextLabel = canAct ? 'Record stock' : 'Open inventory';
    }
    else if (pending.length) {
        const run = pending[0], done = run.items.filter(i => i.done).length;
        nextTitle = `Resume the ${run.type.toLowerCase()} routine`;
        nextBody = `${done} of ${run.items.length} steps complete. Sign-off records who closed the routine.`;
        nextAction = 'go-checklists';
        nextLabel = 'Resume checklist';
    }
    return `${pageHead('Shift desk', 'The work that needs a decision now: orders on the pass, stock below threshold, and routines still open.', button(`${icon('plus', 17)} New order`, 'new-order'), `${todayLabel()} · ${esc(db.branchName)}`)}
 ${db.employees.length ? '' : `<section class="setup-panel" aria-labelledby="setup-title"><h2 id="setup-title">Start with the staff directory</h2><p>Add a staff member to record stock, prepare orders, and sign off routines. Everything stays in this browser.</p>${button(`${icon('plus', 16)} Add first employee`, 'add-employee', 'btn btn-primary')}</section>`}
 <section class="shift-brief" aria-labelledby="brief-title">
   <div class="brief-main">
     <p class="brief-eyebrow"><span class="brief-dot" aria-hidden="true"></span>Shift priority</p>
     <h2 id="brief-title">${open.length ? 'Start with the next handoff.' : atRisk.length ? 'Stock needs attention.' : pending.length ? 'A routine is still open.' : 'The work queue is clear.'}</h2>
     <p>${open.length ? `${open.length} ${open.length === 1 ? 'order needs' : 'orders need'} action. ${awaiting} ${awaiting === 1 ? 'is' : 'are'} awaiting an independent check.` : 'No order is waiting on preparation or verification.'} ${atRisk.length ? `${atRisk.length} ${atRisk.length === 1 ? 'ingredient is at or below its reorder point' : 'ingredients are at or below their reorder points'}.` : 'Ingredient levels are above their reorder points.'}</p>
     <dl class="brief-counts">
       <div><dt>Awaiting check</dt><dd>${fmtNum(awaiting)}</dd></div>
       <div><dt>Stock alerts</dt><dd>${fmtNum(atRisk.length)}</dd></div>
       <div><dt>Open routines</dt><dd>${fmtNum(pending.length)}</dd></div>
     </dl>
   </div>
   <div class="next-action">
     <div class="next-action-top"><span>Next action</span><span class="next-action-index" aria-hidden="true">01</span></div>
     <h3>${esc(nextTitle)}</h3>
     <p>${esc(nextBody)}</p>
     ${button(`${nextLabel} ${icon('arrow', 18)}`, nextAction, 'btn btn-primary', nextId)}
   </div>
 </section>
 <div class="desk-grid">
   <div class="desk-main">
     <section class="queue-panel" aria-labelledby="queue-title">
       <div class="section-head">
         <div><p class="section-kicker">Order desk</p><h2 id="queue-title">Handoff queue ${countBadge(open.length, 'open orders')}</h2><p class="section-sub">Oldest work first. The checker must differ from the preparer.</p></div>
         ${button(`All orders ${icon('arrow', 15)}`, 'go-orders', 'btn btn-quiet btn-sm')}
       </div>
       ${open.length ? `<ol class="ticket-list">${open.slice(0, 4).map(o => {
        const act = actionFor(db, o, ui);
        const summary = o.lines.map(l => `${l.qty}× ${l.drink}${l.details ? ` · ${l.details}` : ''}`).join(' / ');
        return `<li class="ticket ticket-${esc(o.status)}" id="order-${esc(o.id)}" tabindex="-1">
           <div class="ticket-head"><div class="ticket-identity"><span class="order-code">${esc(o.code)}</span><span class="order-channel">${esc(o.channel)}</span></div>${status(o.status)}</div>
           <p class="ticket-items">${esc(summary)}</p>
           <div class="ticket-foot"><span>${esc(orderNote(db, o))}</span>${button(`${esc(act.label)} ${icon('arrow', 15)}`, act.action, 'btn btn-secondary btn-sm', act.action === 'focus-operator' ? '' : o.id, `aria-label="${esc(act.label)} ${esc(o.code)}"`)}</div>
         </li>`;
    }).join('')}${open.length > 4 ? `<li class="ticket-more">${button(`${open.length - 4} more in the queue ${icon('arrow', 15)}`, 'go-orders', 'btn btn-quiet btn-sm')}</li>` : ''}</ol>` : empty('No pending handoffs', 'New orders appear here until preparation and an independent check are complete.', button('Record an order', 'new-order', 'btn btn-primary btn-sm'))}
     </section>
   <section class="activity-panel" aria-labelledby="activity-title">
       <div class="section-head"><div><p class="section-kicker">Activity ledger</p><h2 id="activity-title">Recent changes</h2></div><span class="micro">Saved on this device</span></div>
       ${recentActivity(db).length ? `<ol class="activity-list">${recentActivity(db).map(a => `<li><span class="activity-type">${icon(a.type === 'Stock' ? 'boxes' : 'coffee', 15)}<span class="visually-hidden">${a.type}</span></span><div><strong>${esc(a.subject)}</strong><span>${esc(a.desc)}</span></div><time datetime="${esc(a.at)}">${dateTime(a.at)}</time></li>`).join('')}</ol>` : empty('No activity yet', 'Order, stock, and routine activity appears here as it is recorded.')}
     </section>
   </div>
   <div class="desk-side">
     <section class="stock-watch" aria-labelledby="stock-watch-title">
       <div class="section-head"><div><p class="section-kicker">Stock watch</p><h2 id="stock-watch-title">Replenishment ${countBadge(atRisk.length, 'stock alerts')}</h2></div>${button('Inventory', 'go-inventory', 'btn btn-quiet btn-sm')}</div>
       ${atRisk.length ? `<ul class="stock-list">${atRisk.slice(0, 4).map(i => { const sv = stockSeverity(i.qty, i.min); const ratio = i.min > 0 ? Math.max(0, Math.min(100, i.qty / i.min * 100)) : 0; const canMove = canAct; return `<li class="stock-row"><div class="stock-row-top"><div><strong>${esc(i.name)}</strong><span>${fmtNum(i.qty)} ${esc(i.unit)} on hand · reorder at ${fmtNum(i.min)} ${esc(i.unit)}</span></div><span class="severity severity-${esc(sv.kind)}">${esc(sv.label)}</span></div><div class="meter" aria-hidden="true"><span style="width:${ratio}%"></span></div><div class="stock-row-foot"><span>${sv.shortfall > 0 ? `Need ${fmtNum(sv.shortfall)} ${esc(i.unit)} to reach the reorder point` : 'At the reorder point'}</span>${button(canMove ? 'Record stock' : 'View', canMove ? 'move-stock' : 'go-inventory', 'btn btn-quiet btn-sm', canMove ? i.id : '')}</div></li>`; }).join('')}</ul>${atRisk.length > 4 ? `<p class="section-more">${button(`${atRisk.length - 4} more below threshold ${icon('arrow', 14)}`, 'go-inventory', 'btn btn-quiet btn-sm')}</p>` : ''}` : empty('Above reorder points', 'No active ingredient is at or below its set minimum.')}
     </section>
     <section class="routine-panel" aria-labelledby="routine-title">
       <div class="section-head"><div><p class="section-kicker">Standard work</p><h2 id="routine-title">Shift routines</h2></div>${button(`Open ${icon('arrow', 14)}`, 'go-checklists', 'btn btn-quiet btn-sm')}</div>
       ${pending.length ? `<ul class="routine-list">${pending.slice(0, 2).map(r => { const done = r.items.filter(i => i.done).length; return `<li><div><strong>${esc(r.type)}</strong><span>${done} of ${r.items.length} steps · started ${dateTime(r.createdAt)}</span></div>${progress(done, r.items.length, `${r.type} checklist progress`)}</li>`; }).join('')}</ul><p class="section-more">${pending.length} open ${pending.length === 1 ? 'routine' : 'routines'}. Sign-off is recorded after every step is complete.</p>` : empty('No routine in progress', 'Opening, closing, stock count, and order quality routines are ready when needed.', button('Start a checklist', 'go-checklists', 'btn btn-quiet btn-sm'))}
     </section>
   </div>
 </div>
 <section class="record-strip" aria-labelledby="record-title">
   <div class="record-head"><div><h2 id="record-title">What the records show</h2><p>Derived from local records. Hover or read the definition, not just the percentage.</p></div>${button(`Review insights ${icon('arrow', 15)}`, 'go-insights', 'btn btn-quiet btn-sm')}</div>
   <div class="record-grid">
     <div class="record-item"><span>Orders with a found issue</span><strong>${st.errorRate === null ? 'Not measured' : `${fmtNum(st.errorRate)}%`}</strong><small>${st.verified ? `${st.withIssues} of ${st.verified} checked orders` : 'No checked orders yet'}</small></div>
     <div class="record-item"><span>Waste value logged</span><strong>${fmtMoney(st.wasteCost)}</strong><small>${st.wasteRecords} ${st.wasteRecords === 1 ? 'waste record' : 'waste records'} · quantity × recorded unit cost</small></div>
     <div class="record-item"><span>Completed routines</span><strong>${fmtNum(st.checklistsDone)}</strong><small>Sign-offs recorded in this browser</small></div>
   </div>
 </section>`;
}
function inventory(db, ui) {
    const all = db.ingredients.filter(i => !i.archived);
    const low = all.filter(i => i.qty <= i.min);
    const query = ui.search.trim().toLowerCase();
    const list = all.filter(i => (ui.filter !== 'low' || i.qty <= i.min) && (!query || `${i.name} ${i.category} ${i.notes}`.toLowerCase().includes(query))).sort((a, b) => a.name.localeCompare(b.name));
    const filtered = !!query || ui.filter === 'low';
    return `${pageHead('Inventory', 'Check what is on hand, record every movement, and catch a shortage before it reaches the counter.', button(`${icon('plus', 17)} Add ingredient`, 'add-ingredient'))}
 <dl class="fact-row"><div><dt>Active ingredients</dt><dd>${all.length}</dd></div><div><dt>At or below minimum</dt><dd class="${low.length ? 'fact-alert' : ''}">${low.length}</dd></div><div><dt>Movements recorded</dt><dd>${db.movements.length}</dd></div></dl>
 ${staffRequired(db, ui)}
 <section class="panel" aria-labelledby="inventory-title">
   <div class="table-toolbar">
     <div class="tabs" role="group" aria-label="Filter inventory"><button type="button" data-action="set-filter" data-filter="all" class="tab ${ui.filter !== 'low' ? 'is-on' : ''}" aria-pressed="${ui.filter !== 'low'}">All items</button><button type="button" data-action="set-filter" data-filter="low" class="tab ${ui.filter === 'low' ? 'is-on' : ''}" aria-pressed="${ui.filter === 'low'}">Below threshold ${low.length ? `<span class="tab-count">${low.length}</span>` : ''}</button></div>
     ${searchField('Search ingredients', ui.search)}
   </div>
   ${list.length ? `<div class="table-scroller"><table class="record-table inventory-table"><caption class="visually-hidden">Active ingredients, balances, reorder points, and stock actions</caption><thead><tr><th scope="col">Ingredient</th><th scope="col">On hand</th><th scope="col">Reorder at</th><th scope="col">Position</th><th scope="col">Actions</th></tr></thead><tbody>${list.map(i => { const sv = stockSeverity(i.qty, i.min); return `<tr class="${i.qty <= i.min ? 'row-alert' : ''}" id="stock-${esc(i.id)}" tabindex="-1"><td data-label="Ingredient"><div class="item-name">${esc(i.name)}</div><div class="item-meta">${esc(i.category)}${i.bestBefore ? ` · Best before ${shortDate(i.bestBefore)}` : ''}</div></td><td data-label="On hand" class="numeric"><strong>${fmtNum(i.qty)} ${esc(i.unit)}</strong><small>${fmtMoney(i.unitCost)} / ${esc(i.unit)}</small></td><td data-label="Reorder at" class="numeric">${fmtNum(i.min)} ${esc(i.unit)}</td><td data-label="Position"><div class="cell-status">${status(sv.kind)}${sv.shortfall > 0 ? `<small>Need ${fmtNum(sv.shortfall)} ${esc(i.unit)}</small>` : ''}</div></td><td data-label="Actions" class="cell-actions">${button('Record stock', 'move-stock', 'btn btn-secondary btn-sm', i.id)}${button(`${icon('dots', 18)}`, 'history-stock', 'icon-btn', i.id, `aria-label="History and edit for ${esc(i.name)}"`)}</td></tr>`; }).join('')}</tbody></table></div>` : empty(filtered ? 'No ingredients match' : 'Inventory is empty', query ? `Nothing matches “${ui.search.trim()}”. Try another name or clear the search.` : ui.filter === 'low' ? 'Every active ingredient is above its reorder point today.' : 'Add an ingredient to start recording stock balances.', filtered ? button('Clear filters', 'clear-search', 'btn btn-secondary btn-sm') : button('Add first ingredient', 'add-ingredient', 'btn btn-primary btn-sm'))}
   <div class="table-foot"><span>Balances are entered manually. A physical count creates an adjustment record.</span><span>${list.length} of ${all.length} shown</span></div>
 </section>
 <section class="subsection" aria-labelledby="movements-title">
   ${sectionHead('Latest stock movements', '<span class="micro">Newest first</span>', 'movements-title')}
   ${db.movements.length ? `<ol class="ledger-list">${db.movements.slice(0, 6).map(m => { const ing = db.ingredients.find(i => i.id === m.ingredientId); return `<li id="movement-${esc(m.id)}" tabindex="-1"><div class="ledger-copy"><span class="ledger-kind">${esc(stockAction[m.action] || sentence(m.action))}</span><strong>${esc(ing?.name || 'Archived ingredient')}</strong><span>${esc(m.note || 'No note')} · ${esc(user(db, m.actorId))}</span></div><span class="ledger-delta ${m.delta < 0 ? 'is-negative' : m.delta > 0 ? 'is-positive' : 'is-neutral'}">${m.delta > 0 ? '+' : ''}${fmtNum(m.delta)} ${esc(ing?.unit || '')}</span><time datetime="${esc(m.at)}">${dateTime(m.at)}</time></li>`; }).join('')}</ol>` : empty('No stock movements yet', 'Receipts, service use, waste, and physical counts will be recorded here with the acting employee and timestamp.')}
 </section>`;
}
function orders(db, ui) {
    const all = db.orders;
    const open = all.filter(o => !['completed', 'cancelled'].includes(o.status));
    const query = ui.search.trim().toLowerCase();
    const visible = all.filter(o => (ui.filter !== 'open' || !['completed', 'cancelled'].includes(o.status)) && (ui.filter !== 'completed' || o.status === 'completed') && (!query || `${o.code} ${o.channel} ${o.lines.map(l => l.drink + ' ' + l.details).join(' ')}`.toLowerCase().includes(query))).sort((a, b) => ui.filter === 'open' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
    const awaiting = open.filter(o => o.status === 'verification').length;
    const corrections = open.filter(o => o.status === 'needs-fix').length;
    return `${pageHead('Orders', 'Record multi-item drinks, send them to a separate checker, and keep every failed check attached to the order.', button(`${icon('plus', 17)} New order`, 'new-order'))}
 <dl class="fact-row"><div><dt>Open orders</dt><dd>${open.length}</dd></div><div><dt>Awaiting check</dt><dd>${awaiting}</dd></div><div><dt>Corrections</dt><dd class="${corrections ? 'fact-alert' : ''}">${corrections}</dd></div></dl>
 ${staffRequired(db, ui)}
 <aside class="rule-note">${icon('shield', 18)}<div><strong>Two-person check</strong><span>The verifier must be a different active employee from the preparer. A failed check returns the order for correction.</span></div></aside>
 <section class="panel" aria-labelledby="orders-title">
   <div class="table-toolbar">
     <div class="tabs" role="group" aria-label="Filter orders"><button type="button" data-action="set-filter" data-filter="all" class="tab ${ui.filter === 'all' || ui.filter === '' ? 'is-on' : ''}" aria-pressed="${ui.filter === 'all' || ui.filter === ''}">All orders</button><button type="button" data-action="set-filter" data-filter="open" class="tab ${ui.filter === 'open' ? 'is-on' : ''}" aria-pressed="${ui.filter === 'open'}">In progress ${open.length ? `<span class="tab-count">${open.length}</span>` : ''}</button><button type="button" data-action="set-filter" data-filter="completed" class="tab ${ui.filter === 'completed' ? 'is-on' : ''}" aria-pressed="${ui.filter === 'completed'}">Completed</button></div>
     ${searchField('Search orders', ui.search)}
   </div>
   ${visible.length ? `<ol class="order-list">${visible.map(o => orderRecord(db, o, ui)).join('')}</ol>` : empty(all.length ? 'No orders in this view' : 'No orders recorded yet', query ? `Nothing matches “${ui.search.trim()}”. Try another code or drink.` : 'New orders will appear here with their preparation and check history.', all.length ? button('Show all orders', 'clear-search', 'btn btn-secondary btn-sm') : button('Create an order', 'new-order', 'btn btn-primary btn-sm'))}
   <div class="table-foot"><span>Status changes are recorded in this browser. No printer, POS, or payment connection is implied.</span><span>${visible.length} shown</span></div>
 </section>`;
}
function orderRecord(db, o, ui) {
    const act = actionFor(db, o, ui);
    const total = o.lines.reduce((sum, l) => sum + l.qty, 0);
    const failure = lastFailure(o);
    const lastPass = [...o.verifications].reverse().find(v => v.passed);
    return `<li class="order-card status-rail-${esc(o.status)}" id="order-${esc(o.id)}" tabindex="-1">
   <div class="order-card-head"><div class="order-identity"><span class="order-code">${esc(o.code)}</span><span class="order-channel">${esc(o.channel)}</span></div><div class="order-stamp">${status(o.status)}<time datetime="${esc(o.createdAt)}">${dateTime(o.createdAt)}</time></div></div>
   <ul class="order-items">${o.lines.map(l => `<li><span class="order-qty">${l.qty}×</span><span><strong>${esc(l.drink)}</strong>${l.details ? `<small>${esc(l.details)}</small>` : ''}</span></li>`).join('')}</ul>
   ${o.status === 'needs-fix' && failure ? `<p class="correction-note"><strong>Correction needed · ${esc(failure.issueType)}</strong><span>${esc(failure.notes || 'No note recorded')}</span></p>` : ''}
   <div class="order-card-foot"><div class="order-meta"><span>${icon('coffee', 15)} ${total} ${total === 1 ? 'drink' : 'drinks'}</span><span>${icon('users', 15)} ${esc(o.preparedBy ? `Prepared by ${user(db, o.preparedBy)}` : orderNote(db, o))}</span>${lastPass ? `<span>${icon('check', 15)} Checked by ${esc(user(db, lastPass.actorId))}</span>` : ''}</div><div class="order-actions">${act.action === 'view-order' ? button('View record', 'view-order', 'btn btn-secondary btn-sm', o.id) : button(`${esc(act.label)} ${icon('arrow', 15)}`, act.action, 'btn btn-primary btn-sm', o.id, `aria-label="${esc(act.label)} ${esc(o.code)}"`)}${button('Details', 'view-order', 'btn btn-quiet btn-sm', o.id, `aria-label="Details for ${esc(o.code)}"`)}</div></div>
 </li>`;
}
function checklists(db, ui) {
    const active = db.checklists.filter(c => !c.completedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const completed = db.checklists.filter(c => !!c.completedAt).sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 8);
    const routineCopy = {
        'Opening': 'Set the counter and preparation station up for service.',
        'Closing': 'Close the station cleanly and leave the next shift a usable record.',
        'Stock count': 'Reconcile physical stock against the ledger and flag variance.',
        'Order quality': 'Run a final pass over packaging, labels, and modifiers.'
    };
    const routineIcons = { 'Opening': 'coffee', 'Closing': 'clipboard', 'Stock count': 'boxes', 'Order quality': 'shield' };
    return `${pageHead('Checklists', 'Repeat the routines that keep service consistent. Every step is ticked before a named staff member signs off.')}
 ${staffRequired(db, ui)}
 <section class="routine-catalog" aria-labelledby="catalog-title">
   <div class="section-head"><div><p class="section-kicker">Standard work</p><h2 id="catalog-title">Start a routine</h2></div><span class="micro">Four templates</span></div>
   <ul class="routine-catalog-list">${Object.keys(templates).map((type, k) => `<li><span class="routine-number">${String(k + 1).padStart(2, '0')}</span><span class="routine-icon" aria-hidden="true">${icon(routineIcons[type], 20)}</span><div class="routine-copy"><h3>${esc(type)}</h3><p>${esc(routineCopy[type])}</p><span>${templates[type].length} steps · starts with “${esc(templates[type][0])}”</span></div>${button(`Start ${icon('arrow', 15)}`, 'start-checklist', 'btn btn-secondary btn-sm', '', `data-kind="${esc(type)}" aria-label="Start ${esc(type)} checklist"`)}</li>`).join('')}</ul>
 </section>
 <section class="subsection" aria-labelledby="active-runs-title">
   ${sectionHead(`In progress ${active.length ? countBadge(active.length, 'open routines') : ''}`, `<span class="micro">${active.length} active</span>`, 'active-runs-title')}
   ${active.length ? `<div class="run-list">${active.map(r => checklistCard(db, r)).join('')}</div>` : empty('No routine in progress', 'Start one of the four standard routines above. Progress is saved after every tick.')}
 </section>
 <section class="subsection" aria-labelledby="completed-runs-title">
   ${sectionHead('Completed routines', '<span class="micro">Most recent 8</span>', 'completed-runs-title')}
   ${completed.length ? `<ol class="completion-list">${completed.map(r => `<li><span class="completion-check" aria-hidden="true">${icon('check', 16)}</span><div><strong>${esc(r.type)}</strong><span>${r.items.length} steps · signed off by ${esc(user(db, r.completedBy))}</span></div><time datetime="${esc(r.completedAt)}">${dateTime(r.completedAt)}</time></li>`).join('')}</ol>` : empty('Nothing signed off yet', 'A routine appears here after every step is complete and an acting employee signs it off.')}
 </section>`;
}
function checklistCard(db, r) {
    const done = r.items.filter(i => i.done).length;
    const remaining = r.items.length - done;
    const helpId = `run-help-${r.id}`;
    return `<article class="run-card" id="run-${esc(r.id)}" tabindex="-1" aria-labelledby="run-title-${esc(r.id)}">
   <div class="run-head"><div><p class="section-kicker">Started ${dateTime(r.createdAt)}</p><h3 id="run-title-${esc(r.id)}">${esc(r.type)}</h3></div>${status('in-progress')}</div>
   <div class="run-progress"><div class="progress-copy"><span aria-live="polite">${done} of ${r.items.length} steps done</span><strong>${Math.round(done / r.items.length * 100)}%</strong></div>${progress(done, r.items.length, `${r.type} checklist progress`)}</div>
   <ul class="task-list">${r.items.map(i => `<li><label class="task-row ${i.done ? 'is-done' : ''}"><input type="checkbox" data-check="${esc(r.id)}" data-item="${esc(i.id)}" ${i.done ? 'checked' : ''}><span class="task-box" aria-hidden="true">${icon('check', 13)}</span><span class="task-text">${esc(i.label)}</span></label></li>`).join('')}</ul>
   <div class="run-foot"><span>Started by ${esc(user(db, r.startedBy))}</span><div class="run-signoff"><span id="${helpId}" class="run-help">${remaining ? `${remaining} ${remaining === 1 ? 'step' : 'steps'} remaining` : 'All steps complete'}</span>${button(`Sign off ${icon('arrow', 15)}`, 'complete-checklist', 'btn btn-primary btn-sm', r.id, remaining ? `disabled aria-describedby="${helpId}"` : `aria-describedby="${helpId}"`)}</div></div>
 </article>`;
}
function team(db) {
    const employees = [...db.employees].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    const active = db.employees.filter(e => e.active);
    const assigned = db.trainings.filter(t => t.status === 'assigned').length;
    const completed = db.trainings.filter(t => t.status === 'completed').length;
    return `${pageHead('People & training', 'Keep the staff directory current and make training coverage visible before a shift needs it.', button(`${icon('plus', 17)} Add employee`, 'add-employee'))}
 <dl class="fact-row"><div><dt>Active staff</dt><dd>${active.length}</dd></div><div><dt>Open assignments</dt><dd>${assigned}</dd></div><div><dt>Modules completed</dt><dd>${completed}</dd></div></dl>
 <section class="panel" aria-labelledby="directory-title">
   ${sectionHead('Staff directory', button('Assign training', 'assign-training', 'btn btn-secondary btn-sm', '', ''), 'directory-title')}
   ${employees.length ? `<div class="table-scroller"><table class="record-table roster-table"><caption class="visually-hidden">Staff directory with roles, status, and completed training modules</caption><thead><tr><th scope="col">Employee</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Training</th><th scope="col">Actions</th></tr></thead><tbody>${employees.map(e => { const done = db.trainings.filter(t => t.employeeId === e.id && t.status === 'completed').length; const open = db.trainings.filter(t => t.employeeId === e.id && t.status === 'assigned').length; return `<tr class="${e.active ? '' : 'row-inactive'}" id="person-${esc(e.id)}" tabindex="-1"><td data-label="Employee"><div class="person-cell"><span class="avatar" aria-hidden="true">${esc(initials(e.name))}</span><div><strong>${esc(e.name)}</strong><small>${e.active ? 'Can act locally' : 'Inactive · not selectable'}</small></div></div></td><td data-label="Role">${esc(e.role)}</td><td data-label="Status">${e.active ? status('active') : status('inactive')}</td><td data-label="Training"><div class="cell-status"><strong>${done} of ${trainingModules.length}</strong><small>${open ? `${open} open ${open === 1 ? 'assignment' : 'assignments'}` : 'No open assignment'}</small></div></td><td data-label="Actions" class="cell-actions">${button('Edit', 'edit-employee', 'btn btn-secondary btn-sm', e.id)}${e.active ? button('Assign', 'assign-training', 'btn btn-quiet btn-sm', e.id, `aria-label="Assign training to ${esc(e.name)}"`) : ''}</td></tr>`; }).join('')}</tbody></table></div>` : empty('No staff recorded', 'Add staff before assigning orders, running routines, or tracking training.', button('Add first employee', 'add-employee', 'btn btn-primary btn-sm'))}
 </section>
 <section class="subsection" aria-labelledby="modules-title">
   ${sectionHead('Training modules', '<span class="micro">Foundation, operations, quality</span>', 'modules-title')}
   <ul class="module-list">${trainingModules.map((m, n) => { const done = db.trainings.filter(t => t.moduleId === m.id && t.status === 'completed').length; const open = db.trainings.filter(t => t.moduleId === m.id && t.status === 'assigned').length; return `<li><span class="module-number">${String(n + 1).padStart(2, '0')}</span><div><h3>${esc(m.name)}</h3><p>${esc(m.description)}</p></div><span class="module-level">${esc(m.level)}</span><span class="module-count">${done} complete · ${open} open</span></li>`; }).join('')}</ul>
 </section>
 <section class="subsection" aria-labelledby="assignments-title">
   ${sectionHead('Assignments & completions', `<span class="micro">${db.trainings.length} total</span>`, 'assignments-title')}
   ${db.trainings.length ? `<div class="panel"><div class="table-scroller"><table class="record-table"><caption class="visually-hidden">Training assignments and completion records</caption><thead><tr><th scope="col">Employee</th><th scope="col">Module</th><th scope="col">Assigned</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>${[...db.trainings].sort((a, b) => b.assignedAt.localeCompare(a.assignedAt)).map(t => `<tr id="training-${esc(t.id)}" tabindex="-1"><td data-label="Employee">${esc(user(db, t.employeeId))}</td><td data-label="Module">${esc(trainingModules.find(m => m.id === t.moduleId)?.name || t.moduleId)}</td><td data-label="Assigned">${shortDate(t.assignedAt)}</td><td data-label="Status">${status(t.status)}</td><td data-label="Action">${t.status === 'assigned' ? button('Mark complete', 'complete-training', 'btn btn-secondary btn-sm', t.id) : `<span class="cell-sub">Completed ${shortDate(t.completedAt)}</span>`}</td></tr>`).join('')}</tbody></table></div></div>` : empty('No training assignments', 'Assign a module to an active employee to start a training record.')}
 </section>`;
}
function insights(db) {
    const s = getStats(db), f = forecast(db.costs);
    const countRate = s.counts ? `${fmtNum(s.discrepancies / s.counts * 100)}%` : 'Not measured';
    const issueCategories = new Map();
    db.orders.forEach(o => o.verifications.filter(v => !v.passed).forEach(v => issueCategories.set(v.issueType, (issueCategories.get(v.issueType) || 0) + 1)));
    const issues = [...issueCategories].sort((a, b) => b[1] - a[1]);
    const maxIssue = Math.max(...issues.map(x => x[1]), 1);
    const measures = [
        { label: 'Orders with a found issue', value: s.errorRate === null ? 'Not measured' : `${fmtNum(s.errorRate)}%`, evidence: `${s.withIssues} of ${s.verified} checked orders`, detail: 'Any failed check on an order that has a check. Cancelled orders are excluded.' },
        { label: 'First-check pass rate', value: s.firstPassRate === null ? 'Not measured' : `${fmtNum(s.firstPassRate)}%`, evidence: `${s.firstPass} of ${s.verified} checked orders`, detail: 'The first recorded check passed. Later corrections do not change the first-check result.' },
        { label: 'Count discrepancy rate', value: countRate, evidence: `${s.discrepancies} of ${s.counts} count records`, detail: 'A physical count with a nonzero adjustment. Mixed units are never summed.' },
        { label: 'Waste value logged', value: fmtMoney(s.wasteCost), evidence: `${s.wasteRecords} ${s.wasteRecords === 1 ? 'waste record' : 'waste records'}`, detail: 'Wasted quantity × the unit cost saved on that movement record.' }
    ];
    return `${pageHead('Insights', 'Read the evidence already recorded here, understand its denominator, then model assumptions separately.')}
 <section class="review-lead" aria-labelledby="review-title">
   <div><p class="section-kicker">Recorded review</p><h2 id="review-title">The record, not the pitch.</h2><p>These figures are calculated from orders, checks, counts, and waste saved in this browser. There is no sales feed or POS integration, so they describe process quality — not revenue or branch performance.</p></div>
   <dl class="review-context"><div><dt>Checked orders</dt><dd>${s.verified}</dd></div><div><dt>Count records</dt><dd>${s.counts}</dd></div><div><dt>Waste records</dt><dd>${s.wasteRecords}</dd></div></dl>
 </section>
 <section class="panel measure-panel" aria-labelledby="measures-title">
   ${sectionHead('Measurement ledger', '<span class="micro">All local records, no time filter</span>', 'measures-title')}
   <div class="table-scroller"><table class="record-table measure-table"><caption class="visually-hidden">Operational measures with evidence and definitions</caption><thead><tr><th scope="col">Measure</th><th scope="col">Result</th><th scope="col">Evidence</th><th scope="col">What it means</th></tr></thead><tbody>${measures.map(m => `<tr><td data-label="Measure"><strong>${esc(m.label)}</strong></td><td data-label="Result" class="measure-value">${esc(m.value)}</td><td data-label="Evidence">${esc(m.evidence)}</td><td data-label="Definition" class="measure-detail">${esc(m.detail)}</td></tr>`).join('')}</tbody></table></div>
   <p class="measure-note">${icon('info', 16)} Denominators are intentionally visible. A small number of records produces unstable percentages; this prototype does not claim statistical significance.</p>
 </section>
 <div class="review-grid">
   <section class="panel" aria-labelledby="issue-title">${sectionHead('Order issue categories', '', 'issue-title')}${issues.length ? `<ol class="rank-list">${issues.map(([type, n]) => `<li><div class="rank-label"><span>${esc(type)}</span><strong>${n}</strong></div><div class="rank-track" aria-hidden="true"><span style="width:${n / maxIssue * 100}%"></span></div><small>${s.withIssues ? `${Math.round(n / s.withIssues * 100)}% of orders with a found issue` : 'Recorded issue'}</small></li>`).join('')}</ol>` : empty('No order issues logged', 'A failed verification records its issue category here.')}</section>
   <section class="panel" aria-labelledby="discrepancy-title">${sectionHead('Inventory discrepancy register', '', 'discrepancy-title')}${db.movements.some(m => m.action === 'count') ? `<ol class="discrepancy-list">${db.movements.filter(m => m.action === 'count').slice(0, 6).map(m => { const ing = db.ingredients.find(i => i.id === m.ingredientId); return `<li><div><strong>${esc(ing?.name || 'Archived ingredient')}</strong><span>${shortDate(m.at)} · ${esc(m.note || 'Physical count')}</span></div><span class="${m.delta === 0 ? 'is-neutral' : m.delta < 0 ? 'is-negative' : 'is-positive'}">${m.delta > 0 ? '+' : ''}${fmtNum(m.delta)} ${esc(ing?.unit || '')}</span></li>`; }).join('')}</ol>` : empty('No physical counts yet', 'Record stock → Physical count to register an adjustment and its reason.')}</section>
 </div>
 <section class="scenario-panel" aria-labelledby="scenario-title">
   <div class="scenario-head"><div><p class="section-kicker">Cost–benefit model</p><h2 id="scenario-title">Estimate a possible payback</h2><p>These are your assumptions, not measured savings. The calculation uses only the values below.</p></div><div class="scenario-result"><span>Monthly net benefit</span><strong>${fmtMoney(f.monthlyNet)}</strong><small>Before one-time costs</small></div></div>
   <div class="scenario-layout">
     <form id="scenario-form" data-form="scenario" class="scenario-inputs" novalidate>
       <label class="field"><span>One-time tool setup (₱)</span><input name="setup" type="number" min="0" step="0.01" value="${db.costs.setup}" required inputmode="decimal"></label>
       <label class="field"><span>One-time training (₱)</span><input name="training" type="number" min="0" step="0.01" value="${db.costs.training}" required inputmode="decimal"></label>
       <label class="field"><span>Monthly tool cost (₱)</span><input name="monthlyTool" type="number" min="0" step="0.01" value="${db.costs.monthlyTool}" required inputmode="decimal"></label>
       <label class="field"><span>Estimated waste savings / month (₱)</span><input name="wasteSavings" type="number" min="0" step="0.01" value="${db.costs.wasteSavings}" required inputmode="decimal"></label>
       <label class="field"><span>Estimated refund savings / month (₱)</span><input name="refundSavings" type="number" min="0" step="0.01" value="${db.costs.refundSavings}" required inputmode="decimal"></label>
       <label class="field"><span>Estimated added margin / month (₱)</span><input name="addedMargin" type="number" min="0" step="0.01" value="${db.costs.addedMargin}" required inputmode="decimal"></label>
       <button class="btn btn-primary scenario-save" type="submit" id="save-scenario">Save assumptions ${icon('arrow', 16)}</button>
     </form>
     <div class="scenario-output">
       <p class="section-kicker">Scenario output</p>
       <dl><div><dt>Upfront investment</dt><dd>${fmtMoney(f.upfront)}</dd></div><div><dt>Gross monthly benefit</dt><dd>${fmtMoney(f.monthlyBenefit)}</dd></div><div><dt>Monthly tool cost</dt><dd>−${fmtMoney(db.costs.monthlyTool)}</dd></div><div class="scenario-payback"><dt>Estimated payback</dt><dd>${f.payback === null ? 'Not calculable' : f.payback === 0 ? 'Immediate' : `${fmtNum(f.payback)} months`}</dd></div></dl>
       <p class="formula">Payback = (setup + training) ÷ (waste savings + refund savings + added margin − monthly tool). Requires a positive monthly net benefit.</p>
     </div>
   </div>
 </section>
 <aside class="limitations" aria-labelledby="limits-title"><div><p class="section-kicker">Read with care</p><h2 id="limits-title">What this cannot tell you</h2></div><ul><li>Per-order pass rate is not a sales or customer-satisfaction measure.</li><li>Stock use is entered manually; there is no recipe or POS deduction.</li><li>Payback is a scenario from your own inputs, not a measured outcome.</li><li>The sample workspace is illustrative. Clear it before drawing conclusions.</li></ul></aside>
 <section class="export-bar" aria-labelledby="export-title"><div><h2 id="export-title">Take the records with you</h2><p>Downloads are created locally. No records are transmitted.</p></div><div class="export-buttons">${button(`${icon('download', 16)} Stock CSV`, 'export-stock', 'btn btn-secondary btn-sm')}${button(`${icon('download', 16)} Orders CSV`, 'export-orders', 'btn btn-secondary btn-sm')}${button(`${icon('download', 16)} JSON backup`, 'export-json', 'btn btn-secondary btn-sm')}</div></section>`;
}
const field = (name, label, value = '', attrs = '') => `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" value="${esc(value)}" ${attrs}></label>`;
const textarea = (name, label, value = '', attrs = '') => `<label class="field"><span>${esc(label)}</span><textarea name="${esc(name)}" rows="2" ${attrs}>${esc(value)}</textarea></label>`;
const select = (name, label, opts, v = '') => `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}">${opts.map(([id, label]) => `<option value="${esc(id)}" ${id === v ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`;
const modal = (title, context, content, primary, form, extra = '', tone = '') => `<div class="modal-overlay"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-context"><div class="modal-head"><div><p class="modal-kicker" id="dialog-context">${esc(context)}</p><h2 id="dialog-title">${esc(title)}</h2></div>${button(icon('close', 21), 'close-modal', 'icon-btn', '', `aria-label="Close dialog"`)}</div><form data-form="${esc(form)}" class="modal-form" novalidate>${content}<div class="form-error" id="form-error" role="alert" tabindex="-1" hidden></div><div class="modal-actions">${extra}${button('Cancel', 'close-modal', 'btn btn-secondary')}<button type="submit" class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}">${esc(primary)} ${icon('arrow', 16)}</button></div></form></div></div>`;
const noticeModal = (title, context, copy, action, accept) => modal(title, context, `<p class="modal-prose">${copy}</p>`, accept, action, '', 'danger');
const detailShell = (title, context, body, footer, extraHead = '') => `<div class="modal-overlay"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-context"><div class="modal-head"><div><p class="modal-kicker" id="dialog-context">${esc(context)}</p><h2 id="dialog-title">${title}</h2></div><div class="modal-head-actions">${extraHead}${button(icon('close', 21), 'close-modal', 'icon-btn', '', `aria-label="Close dialog"`)}</div></div><div class="modal-body">${body}</div><div class="modal-actions padded">${footer}</div></div></div>`;
export function renderModal(db, ui) {
    const i = db.ingredients.find(x => x.id === ui.modalId);
    const o = db.orders.find(x => x.id === ui.modalId);
    const e = db.employees.find(x => x.id === ui.modalId);
    switch (ui.modal) {
        case 'ingredient-add': return modal('Add an ingredient', 'Inventory catalog', `<div class="field-grid">${field('name', 'Ingredient name', '', 'required maxlength="100" placeholder="e.g. Tapioca pearls"')}${field('category', 'Category', '', 'required maxlength="60" placeholder="e.g. Toppings"')}${field('unit', 'Unit', '', 'required maxlength="20" placeholder="e.g. kg, L, pcs"')}${field('qty', 'Opening quantity', '0', 'type="number" min="0" step="0.01" required inputmode="decimal"')}${field('min', 'Reorder point', '0', 'type="number" min="0" step="0.01" required inputmode="decimal"')}${field('unitCost', 'Unit cost (₱)', '0', 'type="number" min="0" step="0.01" required inputmode="decimal"')}${field('bestBefore', 'Best before', '', 'type="date"')}</div>${textarea('notes', 'Notes', '', 'maxlength="250"')}`, 'Save ingredient', 'ingredient-add');
        case 'ingredient-edit': return i ? modal('Edit ingredient', 'Inventory catalog', `<div class="field-grid">${field('name', 'Ingredient name', i.name, 'required maxlength="100"')}${field('category', 'Category', i.category, 'required maxlength="60"')}${field('unit', 'Unit', i.unit, 'required maxlength="20"')}${field('min', 'Reorder point', String(i.min), 'type="number" min="0" step="0.01" required inputmode="decimal"')}${field('unitCost', 'Unit cost (₱)', String(i.unitCost), 'type="number" min="0" step="0.01" required inputmode="decimal"')}${field('bestBefore', 'Best before', i.bestBefore, 'type="date"')}</div>${textarea('notes', 'Notes', i.notes, 'maxlength="250"')}<p class="form-hint">Use Record stock to change the on-hand balance and keep an audit trail.</p>`, 'Save changes', 'ingredient-edit', button('Archive ingredient', 'archive-prompt', 'btn btn-danger-quiet', i.id)) : '';
        case 'stock-move': return i ? modal('Record stock movement', 'Stock ledger', `<div class="entity-summary"><strong>${esc(i.name)}</strong><span>Current balance: ${fmtNum(i.qty)} ${esc(i.unit)}</span></div>${select('action', 'Movement type', [['receive', 'Receive stock (+)'], ['consume', 'Used in service (−)'], ['waste', 'Wasted or expired (−)'], ['count', 'Physical count (set actual balance)']])}<div class="field-grid">${field('amount', 'Quantity', '', `type="number" min="0" step="0.01" required inputmode="decimal" placeholder="Enter quantity"`)}${field('note', 'Reason / reference', '', `required maxlength="160" placeholder="e.g. Supplier delivery"`)}</div><p class="form-hint">A physical count replaces the balance with the counted quantity. Receive, use, and waste record a change. Every movement is logged.</p>`, 'Record movement', 'stock-move') : '';
        case 'stock-history': return i ? detailShell(`${esc(i.name)}`, 'Ingredient details', `<div class="detail-summary">${namedValue('On hand', `${fmtNum(i.qty)} ${esc(i.unit)}`)}${namedValue('Reorder point', `${fmtNum(i.min)} ${esc(i.unit)}`)}${namedValue('Unit cost', fmtMoney(i.unitCost))}</div><section class="modal-section"><h3>Movement history</h3>${db.movements.some(m => m.ingredientId === i.id) ? `<ol class="history-list">${db.movements.filter(m => m.ingredientId === i.id).map(m => `<li><div><strong>${esc(stockAction[m.action] || sentence(m.action))}</strong><span>${dateTime(m.at)} · ${esc(user(db, m.actorId))}</span><p>${esc(m.note || '—')}</p></div><span class="${m.delta < 0 ? 'is-negative' : m.delta > 0 ? 'is-positive' : 'is-neutral'}">${m.delta > 0 ? '+' : ''}${fmtNum(m.delta)} ${esc(i.unit)}</span></li>`).join('')}</ol>` : '<p class="muted">No movement history.</p>'}</section>`, button('Record stock', 'move-stock', 'btn btn-primary', i.id) + button('Edit ingredient', 'edit-ingredient', 'btn btn-secondary', i.id)) : '';
        case 'archive-confirm': return i ? noticeModal('Archive this ingredient?', 'Confirm action', `<strong>${esc(i.name)}</strong> leaves the active inventory list. Its movement history stays in stored records.`, `archive-ingredient`, 'Archive ingredient') : '';
        case 'order-add': return modal('Create a new order', 'Order intake', `${select('channel', 'Order channel', [['Walk-in', 'Walk-in'], ['Pickup', 'Pickup'], ['Delivery', 'Delivery']])}<div class="items-heading"><strong>Drinks in this order</strong>${button(`${icon('plus', 15)} Add line`, 'add-order-line', 'btn btn-secondary btn-sm')}</div><div id="line-items"><div class="line-fields">${field('drink[]', 'Drink / product', '', 'required maxlength="80" placeholder="e.g. Milk tea"')}${field('qty[]', 'Qty', '1', 'type="number" min="1" max="99" step="1" required inputmode="numeric"')}${field('details[]', 'Customizations / toppings', '', 'maxlength="200" placeholder="e.g. With pearls, less ice"')}</div></div><p class="form-hint">Enter the exact order as requested. One to twenty drink lines are supported.</p>`, 'Create order', 'order-add');
        case 'order-verify': return o ? modal(`Verify ${o.code}`, 'Second-person quality check', `<div class="verify-summary"><strong>${esc(o.code)} · ${esc(o.channel)}</strong><span>Prepared by ${esc(user(db, o.preparedBy))}</span><ul>${o.lines.map(l => `<li>${l.qty}× ${esc(l.drink)}${l.details ? ` <small>· ${esc(l.details)}</small>` : ''}</li>`).join('')}</ul></div><p class="form-hint">All four checks are required to pass. A failed result needs an issue category and a note.</p><fieldset class="checks"><legend class="visually-hidden">Quality checks</legend>${['Drink names and quantities match', 'Customizations and add-ons match', 'Lid and cup seal are secure', 'Labels and packaging are correct'].map((t, n) => `<label><input name="check-${n}" type="checkbox"><span class="check-box" aria-hidden="true">${icon('check', 13)}</span><span>${esc(t)}</span></label>`).join('')}</fieldset><div class="field-grid">${select('result', 'Verification result', [['pass', 'Pass and complete'], ['fail', 'Found an issue / return for correction']])}${select('issue', 'Issue category', [['', 'Select category for a failed check'], ['Wrong drink', 'Wrong drink'], ['Missing topping', 'Missing topping'], ['Quantity mismatch', 'Quantity mismatch'], ['Packaging / lid', 'Packaging / lid'], ['Customization', 'Customization'], ['Other', 'Other']])}</div>${textarea('notes', 'Quality notes', '', 'maxlength="250" placeholder="Describe any issue found"')}<p class="form-hint">Signed by ${esc(user(db, ui.actorId) || 'Unassigned')}. Must be different from the preparer.</p>`, 'Submit verification', 'order-verify') : '';
        case 'order-detail': return o ? detailShell(`${esc(o.code)}`, `Order record`, `<div class="detail-summary">${namedValue('Channel', esc(o.channel))}${namedValue('Created', dateTime(o.createdAt))}${namedValue('Preparer', esc(user(db, o.preparedBy)))}</div><div class="detail-status">${status(o.status)}<span>${esc(orderNote(db, o))}</span></div><section class="modal-section"><h3>Ordered items</h3><ul class="detail-lines">${o.lines.map(l => `<li><strong>${l.qty}× ${esc(l.drink)}</strong><span>${esc(l.details || 'No special instructions')}</span></li>`).join('')}</ul></section><section class="modal-section"><h3>Verification history</h3>${o.verifications.length ? `<ol class="history-list">${o.verifications.map(v => `<li><div><strong>${v.passed ? 'Passed' : `Failed · ${esc(v.issueType)}`}</strong><span>${dateTime(v.at)} · ${esc(user(db, v.actorId))}</span><p>${esc(v.notes || 'No notes')}</p></div>${status(v.passed ? 'completed' : 'needs-fix')}</li>`).join('')}</ol>` : '<p class="muted">This order has not been checked yet.</p>'}</section>${o.status === 'cancelled' ? `<p class="muted">Cancellation reason: ${esc(o.cancelReason)}</p>` : ''}`, !['cancelled', 'completed'].includes(o.status) ? button('Cancel order', 'cancel-prompt', 'btn btn-danger-quiet', o.id) : button('Close', 'close-modal', 'btn btn-secondary'), o.status === 'queued' || o.status === 'needs-fix' ? button('Mark prepared', 'prepare-order', 'btn btn-primary', o.id) : o.status === 'verification' ? button('Verify order', 'verify-order', 'btn btn-primary', o.id) : '') : '';
        case 'order-cancel': return o ? modal(`Cancel ${o.code}?`, 'Order cancellation', `${textarea('reason', 'Reason for cancellation', '', 'required maxlength="240" placeholder="Reason"')}<p class="form-hint">Cancelled orders stay in the local audit trail and are excluded from verification denominators.</p>`, 'Cancel order', 'order-cancel', '', 'danger') : '';
        case 'employee-add':
        case 'employee-edit': return modal(ui.modal === 'employee-add' ? 'Add employee' : 'Edit employee', 'Staff directory', `${field('name', 'Employee name', e?.name || '', 'required maxlength="80" autocomplete="off"')}${select('role', 'Role', [['Staff', 'Staff'], ['Manager', 'Manager'], ['Supervisor', 'Supervisor']], e?.role || 'Staff')}${ui.modal === 'employee-edit' ? select('active', 'Account status', [['yes', 'Active'], ['no', 'Inactive']], e?.active ? 'yes' : 'no') : ''}<p class="form-hint">This is a local staff list, not a secure account or identity system.</p>`, ui.modal === 'employee-add' ? 'Add employee' : 'Save employee', ui.modal);
        case 'training-assign': return modal('Assign a training module', 'Staff development', `${select('employeeId', 'Employee', db.employees.filter(x => x.active).map(x => [x.id, x.name]), db.employees.some(x => x.id === ui.modalId && x.active) ? ui.modalId : '')}${select('moduleId', 'Module', trainingModules.map(m => [m.id, m.name]))}<p class="form-hint">An assignment stays open until an operator marks it complete.</p>`, 'Assign module', 'training-assign');
        case 'confirm-blank': return noticeModal('Start with a clean workspace?', 'Replace demonstration data', 'All sample records will be replaced with an empty local workspace. Export a JSON backup first if needed. This does not affect other devices.', 'confirm-blank', 'Clear and start fresh');
        case 'confirm-sample': return noticeModal('Load the example workspace?', 'Replace local data', 'Your local records will be overwritten with sample ingredients, employees, orders, and training records. Export a backup first if needed.', 'confirm-sample', 'Replace with sample');
    }
    return '';
}
const namedValue = (label, value, sub = '') => `<div class="named-value"><span>${esc(label)}</span><strong>${value}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
