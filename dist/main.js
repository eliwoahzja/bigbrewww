import { uid, now, nonnegative, positive, textRequired, stockChange, verifyOrder, csv, createOrder, prepareOrder, cancelOrder, startChecklist, toggleChecklistItem, completeChecklist, assignTraining, completeTraining } from './domain.js';
import { appView, icon } from './views.js';
import { load, save, blank, sample, exportData, storageIssue } from './store.js';
let db = load();
let ui = { page: 'overview', search: '', filter: 'all', modal: '', modalId: '', mobileOpen: false, actorId: db.employees.find(e => e.active)?.id || '' };
const app = document.getElementById('app');
if (!app)
    throw Error('App mount point is missing');
const toast = document.getElementById('toast');
const drawerQuery = window.matchMedia('(max-width:1080px)');
const pageNames = { overview: 'Shift desk', inventory: 'Inventory', orders: 'Orders', checklists: 'Checklists', team: 'People & training', insights: 'Insights' };
let toastTimer;
let lastStorageNotice = '';
let modalReturnFocus = null;
function notify(message, isError = false) {
    if (!toast)
        return;
    toast.innerHTML = `${icon(isError ? 'alert' : 'check', 18)}<span></span>`;
    const text = toast.querySelector('span');
    if (text)
        text.textContent = message;
    toast.className = `toast is-visible ${isError ? 'is-error' : ''}`;
    toast.setAttribute('role', isError ? 'alert' : 'status');
    toast.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    if (toastTimer)
        clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); }, 4200);
}
const cssEscape = (value) => CSS.escape(value);
function captureFocus(el = document.activeElement) {
    if (!(el instanceof HTMLElement))
        return null;
    if (el.dataset.action)
        return { action: el.dataset.action, id: el.dataset.id || '', filter: el.dataset.filter || '' };
    if (el.id)
        return { idAttr: el.id };
    return null;
}
function findFocus(key) {
    if (!key)
        return null;
    if (key.action) {
        let selector = `[data-action="${cssEscape(key.action)}"]`;
        if (key.id)
            selector += `[data-id="${cssEscape(key.id)}"]`;
        if (key.filter)
            selector += `[data-filter="${cssEscape(key.filter)}"]`;
        return Array.from(document.querySelectorAll(selector)).find(el => el.getClientRects().length > 0) || null;
    }
    if (key.idAttr)
        return document.getElementById(key.idAttr);
    return null;
}
function focusMain() {
    document.getElementById('main-content')?.focus({ preventScroll: true });
}
function render(resetScroll = false) {
    const y = window.scrollY;
    app.innerHTML = appView(db, ui);
    document.body.classList.toggle('modal-active', !!ui.modal);
    document.body.classList.toggle('drawer-active', ui.mobileOpen && drawerQuery.matches);
    document.title = `${pageNames[ui.page]} · Branchwork`;
    applyDrawerState();
    if (resetScroll)
        window.scrollTo({ top: 0, behavior: 'instant' });
    else
        window.scrollTo({ top: y, behavior: 'instant' });
    if (storageIssue && storageIssue !== lastStorageNotice) {
        lastStorageNotice = storageIssue;
        notify(storageIssue, true);
    }
    if (!storageIssue)
        lastStorageNotice = '';
}
function commit(next, message, focusSelector = '') {
    const key = modalReturnFocus || captureFocus();
    db = next;
    save(db);
    if (!db.employees.some(e => e.id === ui.actorId && e.active))
        ui.actorId = db.employees.find(e => e.active)?.id || '';
    render();
    if (storageIssue)
        notify(storageIssue, true);
    else
        notify(message);
    const modalKey = modalReturnFocus;
    modalReturnFocus = null;
    requestAnimationFrame(() => {
        if (focusSelector) {
            const el = document.querySelector(focusSelector);
            if (el) {
                el.focus({ preventScroll: true });
                return;
            }
        }
        const target = findFocus(modalKey || key);
        if (target)
            target.focus({ preventScroll: true });
        else
            focusMain();
    });
}
function applyDrawerState(focusInside = false) {
    const sidebar = document.getElementById('app-sidebar');
    const scrim = document.querySelector('.drawer-scrim');
    const main = document.querySelector('.app-main');
    const dock = document.querySelector('.mobile-dock');
    const open = !!ui.mobileOpen && drawerQuery.matches;
    sidebar?.classList.toggle('is-open', open);
    scrim?.classList.toggle('is-open', open);
    if (scrim) {
        scrim.tabIndex = open ? 0 : -1;
        scrim.setAttribute('aria-hidden', String(!open));
    }
    document.body.classList.toggle('drawer-active', open);
    document.body.classList.toggle('modal-active', !!ui.modal);
    if (sidebar instanceof HTMLElement)
        sidebar.inert = drawerQuery.matches && !open;
    if (main instanceof HTMLElement)
        main.inert = open;
    if (dock instanceof HTMLElement)
        dock.inert = open;
    document.querySelectorAll('[data-action="mobile-toggle"][aria-controls="app-sidebar"]').forEach(el => el.setAttribute('aria-expanded', String(open)));
    if (open && focusInside)
        sidebar?.querySelector('.sidebar-close')?.focus({ preventScroll: true });
}
function setDrawer(open, focusInside = false) {
    ui.mobileOpen = open && drawerQuery.matches;
    applyDrawerState(focusInside);
    if (!ui.mobileOpen)
        document.querySelector('.menu-btn')?.focus({ preventScroll: true });
}
function open(kind, id = '') {
    if (!ui.modal)
        modalReturnFocus = captureFocus();
    ui.modal = kind;
    ui.modalId = id;
    render();
    requestAnimationFrame(() => {
        const card = document.querySelector('.modal-card');
        const target = card?.querySelector('form.modal-form input:not([type="hidden"]):not([disabled]), form.modal-form select:not([disabled]), form.modal-form textarea:not([disabled]), .modal-actions .btn-secondary, .modal-head .icon-btn');
        target?.focus({ preventScroll: true });
        syncVerificationFields();
    });
}
function close() {
    ui.modal = '';
    ui.modalId = '';
    render();
    const key = modalReturnFocus;
    modalReturnFocus = null;
    requestAnimationFrame(() => {
        const target = findFocus(key);
        if (target)
            target.focus({ preventScroll: true });
        else
            focusMain();
    });
}
function actor() {
    if (!ui.actorId || !db.employees.some(e => e.id === ui.actorId && e.active))
        throw Error('Add or select an active employee in the top bar first.');
    return ui.actorId;
}
function download(name, mime, text) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${name} exported`);
}
function fValue(form, name) { return String(new FormData(form).get(name) ?? ''); }
function data(form, name) { return fValue(form, name).trim(); }
function setError(form, message) {
    const el = form.querySelector('#form-error');
    if (el) {
        el.textContent = message;
        el.hidden = false;
        el.focus();
    }
    else
        notify(message, true);
}
function ingredientsFromForm(form, existing) {
    const name = textRequired(data(form, 'name'), 'Ingredient name');
    if (db.ingredients.some(i => !i.archived && i.name.toLowerCase() === name.toLowerCase() && i.id !== existing?.id))
        throw Error('An active ingredient with this name already exists.');
    return { id: existing?.id || uid(), name, category: textRequired(data(form, 'category'), 'Category', 60), unit: textRequired(data(form, 'unit'), 'Unit', 20), qty: existing?.qty ?? nonnegative(data(form, 'qty'), 'Opening quantity'), min: nonnegative(data(form, 'min'), 'Reorder point'), unitCost: nonnegative(data(form, 'unitCost'), 'Unit cost'), bestBefore: data(form, 'bestBefore'), notes: data(form, 'notes').slice(0, 250), archived: false };
}
function handleSubmit(form) {
    try {
        const kind = form.dataset.form || '';
        const id = ui.modalId;
        if (kind === 'ingredient-add') {
            const by = actor();
            const i = ingredientsFromForm(form);
            const opening = i.qty > 0 ? [{ id: uid(), ingredientId: i.id, action: 'opening', before: 0, after: i.qty, delta: i.qty, note: 'Opening stock balance', actorId: by, at: now(), unitCost: i.unitCost }] : [];
            ui.modal = '';
            commit({ ...db, ingredients: [...db.ingredients, i], movements: [...opening, ...db.movements] }, 'Ingredient added');
            return;
        }
        if (kind === 'ingredient-edit') {
            const current = db.ingredients.find(i => i.id === id);
            if (!current)
                throw Error('Ingredient missing.');
            const updated = ingredientsFromForm(form, current);
            ui.modal = '';
            commit({ ...db, ingredients: db.ingredients.map(i => i.id === id ? updated : i) }, 'Ingredient updated');
            return;
        }
        if (kind === 'stock-move') {
            const action = data(form, 'action');
            if (!['receive', 'consume', 'waste', 'count'].includes(action))
                throw Error('Invalid movement type.');
            const qty = action === 'count' ? nonnegative(data(form, 'amount'), 'Count') : positive(data(form, 'amount'), 'Quantity');
            const note = textRequired(data(form, 'note'), 'Movement reason', 160);
            const next = stockChange(db, id, action, qty, note, actor());
            ui.modal = '';
            commit(next, 'Stock balance and movement saved', `#stock-${id}`);
            return;
        }
        if (kind === 'archive-ingredient') {
            const ingredient = db.ingredients.find(x => x.id === id);
            if (!ingredient)
                throw Error('Ingredient no longer exists.');
            ui.modal = '';
            commit({ ...db, ingredients: db.ingredients.map(x => x.id === id ? { ...x, archived: true } : x) }, 'Ingredient archived');
            return;
        }
        if (kind === 'order-add') {
            const channel = data(form, 'channel');
            const drinks = Array.from(form.querySelectorAll('input[name="drink[]"]'));
            const quantities = Array.from(form.querySelectorAll('input[name="qty[]"]'));
            const details = Array.from(form.querySelectorAll('input[name="details[]"]'));
            if (!drinks.length || drinks.length > 20)
                throw Error('Include between 1 and 20 order lines.');
            const lines = drinks.map((d, index) => ({ drink: d.value, qty: quantities[index]?.value ?? '', details: details[index]?.value ?? '' }));
            const next = createOrder(db, channel, lines, actor());
            const order = next.orders[0];
            ui.modal = '';
            commit(next, `${order.code} created`, `#order-${order.id}`);
            return;
        }
        if (kind === 'order-verify') {
            const checks = [0, 1, 2, 3].map(n => form.elements.namedItem(`check-${n}`)?.checked === true);
            const passed = data(form, 'result') === 'pass';
            if (passed && !checks.every(Boolean))
                throw Error('Confirm all four checks to pass the order, or select a failed result.');
            const issue = passed ? '' : data(form, 'issue');
            const notes = data(form, 'notes');
            const next = verifyOrder(db, id, actor(), passed, issue, notes);
            ui.modal = '';
            commit(next, passed ? 'Order verified and completed' : 'Issue logged. Order returned for correction');
            return;
        }
        if (kind === 'order-cancel') {
            const reason = textRequired(data(form, 'reason'), 'Cancellation reason', 240);
            const next = cancelOrder(db, id, reason);
            ui.modal = '';
            commit(next, 'Order cancelled');
            return;
        }
        if (kind === 'employee-add' || kind === 'employee-edit') {
            const name = textRequired(data(form, 'name'), 'Employee name', 80);
            const role = data(form, 'role');
            if (!['Manager', 'Staff', 'Supervisor'].includes(role))
                throw Error('Invalid employee role.');
            if (kind === 'employee-add') {
                const employee = { id: uid(), name, role, active: true };
                if (!db.employees.some(e => e.id === ui.actorId && e.active))
                    ui.actorId = employee.id;
                ui.modal = '';
                commit({ ...db, employees: [...db.employees, employee] }, 'Employee added', `#person-${employee.id}`);
                return;
            }
            const emp = db.employees.find(e => e.id === id);
            if (!emp)
                throw Error('Employee missing.');
            const active = data(form, 'active') === 'yes';
            ui.modal = '';
            commit({ ...db, employees: db.employees.map(e => e.id === id ? { ...e, name, role, active } : e) }, 'Employee updated', `#person-${id}`);
            return;
        }
        if (kind === 'training-assign') {
            const employeeId = data(form, 'employeeId');
            const moduleId = data(form, 'moduleId');
            const next = assignTraining(db, employeeId, moduleId);
            const assignment = next.trainings[0];
            ui.modal = '';
            commit(next, 'Training assigned', `#training-${assignment.id}`);
            return;
        }
        if (kind === 'scenario') {
            const fields = ['setup', 'training', 'monthlyTool', 'wasteSavings', 'refundSavings', 'addedMargin'];
            const costs = { ...db.costs };
            for (const name of fields)
                costs[name] = nonnegative(data(form, name), name);
            commit({ ...db, costs }, 'Scenario assumptions updated', '#save-scenario');
            return;
        }
        if (kind === 'confirm-blank') {
            ui.modal = '';
            modalReturnFocus = null;
            db = blank();
            ui.actorId = '';
            ui.page = 'overview';
            ui.search = '';
            ui.filter = 'all';
            render(true);
            notify('Empty workspace started');
            requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
            return;
        }
        if (kind === 'confirm-sample') {
            ui.modal = '';
            modalReturnFocus = null;
            db = sample();
            ui.actorId = db.employees[0]?.id || '';
            ui.page = 'overview';
            ui.search = '';
            ui.filter = 'all';
            render(true);
            notify('Example workspace loaded');
            requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
            return;
        }
        throw Error('This form action is unsupported.');
    }
    catch (err) {
        setError(form, err instanceof Error ? err.message : 'Unable to save the record.');
    }
}
function syncVerificationFields() {
    const form = document.querySelector('form[data-form="order-verify"]');
    if (!form)
        return;
    const result = form.elements.namedItem('result');
    const issue = form.elements.namedItem('issue');
    const notes = form.elements.namedItem('notes');
    if (!result || !issue || !notes)
        return;
    const passed = result.value === 'pass';
    /* A failed check needs both fields, but the dialog reports that through its
       own alert region so the message is announced and stays visible. Native
       bubbles are bypassed here; aria-required keeps the requirement exposed. */
    issue.disabled = passed;
    issue.setAttribute('aria-required', String(!passed));
    if (passed)
        issue.value = '';
    notes.setAttribute('aria-required', String(!passed));
    notes.placeholder = passed ? 'Optional note for the record' : 'Describe the issue found';
}
function syncChecklistCard(runId) {
    const card = document.getElementById(`run-${runId}`);
    if (!card)
        return;
    const run = db.checklists.find(c => c.id === runId);
    if (!run)
        return;
    const done = run.items.filter(i => i.done).length, total = run.items.length, remaining = total - done;
    const copy = card.querySelector('.progress-copy');
    if (copy) {
        const span = copy.querySelector('span');
        if (span)
            span.textContent = `${done} of ${total} steps done`;
        const strong = copy.querySelector('strong');
        if (strong)
            strong.textContent = `${Math.round(done / total * 100)}%`;
    }
    const bar = card.querySelector('.progress');
    if (bar) {
        bar.setAttribute('aria-valuenow', String(done));
        bar.setAttribute('aria-valuetext', `${done} of ${total} steps complete`);
    }
    const fill = bar?.querySelector('span');
    if (fill)
        fill.style.width = `${total ? Math.round(done / total * 100) : 0}%`;
    const help = card.querySelector('.run-help');
    if (help)
        help.textContent = remaining ? `${remaining} ${remaining === 1 ? 'step' : 'steps'} remaining` : 'All steps complete';
    const signoff = card.querySelector('[data-action="complete-checklist"]');
    if (signoff)
        signoff.disabled = remaining > 0;
}
function syncAllChecklists() {
    db.checklists.filter(r => !r.completedAt).forEach(r => syncChecklistCard(r.id));
}
function clickHandler(event) {
    const target = event.target;
    if (target.classList.contains('modal-overlay')) {
        close();
        return;
    }
    const el = target.closest('[data-action]');
    if (!el)
        return;
    const action = el.dataset.action || '';
    const id = el.dataset.id || '';
    try {
        if (action === 'nav') {
            ui.page = (el.dataset.page || 'overview');
            ui.search = '';
            ui.filter = 'all';
            ui.mobileOpen = false;
            ui.modal = '';
            render(true);
            requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
            return;
        }
        if (action === 'mobile-toggle') {
            setDrawer(!ui.mobileOpen, true);
            return;
        }
        if (action === 'close-modal') {
            close();
            return;
        }
        if (action === 'set-filter') {
            ui.filter = el.dataset.filter || 'all';
            const filter = ui.filter;
            render();
            requestAnimationFrame(() => document.querySelector(`[data-action="set-filter"][data-filter="${cssEscape(filter)}"]`)?.focus({ preventScroll: true }));
            return;
        }
        if (action === 'clear-search') {
            ui.search = '';
            ui.filter = 'all';
            render();
            requestAnimationFrame(() => document.getElementById('page-search')?.focus({ preventScroll: true }));
            return;
        }
        if (action === 'focus-operator') {
            if (ui.mobileOpen)
                setDrawer(false);
            const select = document.getElementById('operator');
            if (select instanceof HTMLSelectElement && !select.disabled) {
                select.focus({ preventScroll: true });
                notify('Choose a different staff member in the top bar.');
            }
            else {
                open('employee-add');
            }
            return;
        }
        if (action === 'go-inventory' || action === 'go-checklists' || action === 'go-orders' || action === 'go-insights') {
            ui.page = action === 'go-inventory' ? 'inventory' : action === 'go-checklists' ? 'checklists' : action === 'go-orders' ? 'orders' : 'insights';
            ui.filter = 'all';
            ui.search = '';
            ui.modal = '';
            ui.mobileOpen = false;
            render(true);
            requestAnimationFrame(() => document.getElementById('page-title')?.focus({ preventScroll: true }));
            return;
        }
        if (action === 'add-ingredient') {
            actor();
            open('ingredient-add');
            return;
        }
        if (action === 'move-stock') {
            actor();
            open('stock-move', id);
            return;
        }
        if (action === 'edit-ingredient') {
            open('ingredient-edit', id);
            return;
        }
        if (action === 'history-stock') {
            open('stock-history', id);
            return;
        }
        if (action === 'archive-prompt') {
            open('archive-confirm', id);
            return;
        }
        if (action === 'new-order') {
            actor();
            open('order-add');
            return;
        }
        if (action === 'verify-order') {
            actor();
            open('order-verify', id);
            return;
        }
        if (action === 'view-order') {
            open('order-detail', id);
            return;
        }
        if (action === 'cancel-prompt') {
            open('order-cancel', id);
            return;
        }
        if (action === 'prepare-order') {
            const next = prepareOrder(db, id, actor());
            ui.modal = '';
            commit(next, 'Order is ready for a separate verifier', `#order-${id}`);
            return;
        }
        if (action === 'add-order-line') {
            const container = document.getElementById('line-items');
            if (!container)
                return;
            if (container.querySelectorAll('.line-fields').length >= 20)
                throw Error('Maximum 20 order lines.');
            const row = document.createElement('div');
            row.className = 'line-fields';
            row.innerHTML = `<label class="field"><span>Drink / product</span><input name="drink[]" maxlength="80" required placeholder="e.g. Coffee" autocomplete="off"></label><label class="field"><span>Qty</span><input name="qty[]" type="number" min="1" max="99" step="1" required value="1" inputmode="numeric"></label><label class="field"><span>Customizations / toppings</span><input name="details[]" maxlength="200" placeholder="Special request" autocomplete="off"></label><button type="button" data-action="remove-order-line" class="remove-line" aria-label="Remove order line">${icon('close', 16)}</button>`;
            container.append(row);
            row.querySelector('input')?.focus();
            return;
        }
        if (action === 'remove-order-line') {
            el.closest('.line-fields')?.remove();
            document.querySelector('[data-action="add-order-line"]')?.focus({ preventScroll: true });
            return;
        }
        if (action === 'start-checklist') {
            const type = el.dataset.kind;
            const next = startChecklist(db, type, actor());
            const run = next.checklists[0];
            commit(next, `${type} checklist started`, `#run-${run.id}`);
            return;
        }
        if (action === 'complete-checklist') {
            const next = completeChecklist(db, id, actor());
            commit(next, 'Checklist completed and signed off', '#page-title');
            return;
        }
        if (action === 'add-employee') {
            open('employee-add');
            return;
        }
        if (action === 'edit-employee') {
            open('employee-edit', id);
            return;
        }
        if (action === 'assign-training') {
            if (!db.employees.some(e => e.active))
                throw Error('Add an active employee before assigning training.');
            open('training-assign', id);
            return;
        }
        if (action === 'complete-training') {
            actor();
            const next = completeTraining(db, id);
            commit(next, 'Training marked complete', `#training-${id}`);
            return;
        }
        if (action === 'confirm-blank' || action === 'confirm-sample') {
            open(action);
            return;
        }
        if (action === 'export-json') {
            download('branchwork-backup.json', 'application/json', exportData(db));
            return;
        }
        if (action === 'export-stock') {
            const rows = [['Date', 'Ingredient', 'Movement', 'Before', 'After', 'Change', 'Unit', 'Recorded unit cost PHP', 'Reason', 'Recorded by']];
            db.movements.forEach(m => { const ing = db.ingredients.find(i => i.id === m.ingredientId); rows.push([m.at, ing?.name || m.ingredientId, m.action, m.before, m.after, m.delta, ing?.unit || '', m.unitCost, m.note, db.employees.find(e => e.id === m.actorId)?.name || m.actorId]); });
            download('branchwork-stock-ledger.csv', 'text/csv;charset=utf-8', csv(rows));
            return;
        }
        if (action === 'export-orders') {
            const rows = [['Order code', 'Created', 'Channel', 'Status', 'Items', 'Prepared by', 'Verification attempts', 'Failed checks', 'Cancellation reason']];
            db.orders.forEach(o => rows.push([o.code, o.createdAt, o.channel, o.status, o.lines.map(l => `${l.qty}x ${l.drink} (${l.details})`).join(' | '), db.employees.find(e => e.id === o.preparedBy)?.name || '', o.verifications.length, o.verifications.filter(v => !v.passed).length, o.cancelReason]));
            download('branchwork-orders.csv', 'text/csv;charset=utf-8', csv(rows));
            return;
        }
    }
    catch (err) {
        notify(err instanceof Error ? err.message : 'This action did not complete.', true);
    }
}
app.addEventListener('click', clickHandler);
app.addEventListener('submit', event => { const form = event.target.closest('form[data-form]'); if (form) {
    event.preventDefault();
    handleSubmit(form);
} });
app.addEventListener('input', event => {
    const target = event.target;
    if (target.id === 'page-search') {
        ui.search = target.value;
        const pos = target.selectionStart;
        render();
        const input = document.getElementById('page-search');
        if (input) {
            input.focus();
            if (pos !== null)
                try {
                    input.setSelectionRange(pos, pos);
                }
                catch { /* search type unsupported */ }
        }
    }
});
app.addEventListener('change', event => {
    const input = event.target;
    if (input.id === 'operator') {
        ui.actorId = input.value;
        render();
        requestAnimationFrame(() => document.getElementById('operator')?.focus({ preventScroll: true }));
        const name = db.employees.find(e => e.id === ui.actorId)?.name;
        if (name)
            notify(`Acting as ${name}`);
        return;
    }
    if (input.matches('input[data-check]')) {
        const id = input.dataset.check || '', itemId = input.dataset.item || '';
        try {
            db = toggleChecklistItem(db, id, itemId, input.checked);
            save(db);
            input.closest('.task-row')?.classList.toggle('is-done', input.checked);
            syncChecklistCard(id);
            if (storageIssue)
                notify(storageIssue, true);
        }
        catch (err) {
            input.checked = !input.checked;
            notify(err instanceof Error ? err.message : 'Checklist could not be updated.', true);
        }
        return;
    }
    if (input.name === 'result')
        syncVerificationFields();
});
document.addEventListener('keydown', event => {
    if (ui.modal && event.key === 'Tab') {
        const card = document.querySelector('.modal-card');
        const focusable = Array.from(card?.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])') || []).filter(el => el.getClientRects().length > 0);
        if (focusable.length) {
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || !card?.contains(document.activeElement))) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && (document.activeElement === last || !card?.contains(document.activeElement))) {
                event.preventDefault();
                first.focus();
            }
        }
        else
            event.preventDefault();
        return;
    }
    if (ui.mobileOpen && event.key === 'Tab') {
        const sidebar = document.getElementById('app-sidebar');
        const focusable = Array.from(sidebar?.querySelectorAll('button:not(:disabled),a[href]') || []).filter(el => el.getClientRects().length > 0);
        if (focusable.length) {
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }
    if (event.key === 'Escape') {
        if (ui.modal) {
            event.preventDefault();
            close();
            return;
        }
        if (ui.mobileOpen) {
            event.preventDefault();
            setDrawer(false);
            return;
        }
        const search = document.activeElement;
        if (search instanceof HTMLInputElement && search.id === 'page-search' && search.value) {
            ui.search = '';
            render();
            requestAnimationFrame(() => document.getElementById('page-search')?.focus());
        }
    }
});
drawerQuery.addEventListener('change', () => {
    if (!drawerQuery.matches)
        ui.mobileOpen = false;
    applyDrawerState();
});
render();
syncAllChecklists();
// External, non-mutating diagnostics for automated checks.
Object.defineProperty(window, '__branchworkDiagnostics', { value: () => ({ mode: db.mode, ingredients: db.ingredients.length, orders: db.orders.length, checklists: db.checklists.length, trainings: db.trainings.length, activeOperator: ui.actorId, storedMovements: db.movements.length, page: ui.page }), configurable: false });
