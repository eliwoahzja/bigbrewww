import { uid, now } from './domain.js';
const iso = (days) => new Date(Date.now() + days * 86400000).toISOString();
export function emptyDatabase() { return { version: 1, mode: 'local', branchName: 'Prototype branch', ingredients: [], movements: [], employees: [], orders: [], checklists: [], trainings: [], costs: { setup: 0, training: 0, monthlyTool: 0, wasteSavings: 0, refundSavings: 0, addedMargin: 0 } }; }
export function demoDatabase() {
    const staff = [{ id: 'st-a', name: 'Alex Rivera', role: 'Manager', active: true }, { id: 'st-b', name: 'Sam Cruz', role: 'Staff', active: true }, { id: 'st-c', name: 'Jamie Santos', role: 'Staff', active: true }];
    const ingredients = [
        { id: 'ing-1', name: 'Black tea concentrate', category: 'Tea & coffee', unit: 'L', qty: 8.5, min: 5, unitCost: 82, bestBefore: iso(12).slice(0, 10), notes: 'Chilled ingredient', archived: false },
        { id: 'ing-2', name: 'Tapioca pearls', category: 'Toppings', unit: 'kg', qty: 1.25, min: 2, unitCost: 140, bestBefore: iso(8).slice(0, 10), notes: 'Count before afternoon shift', archived: false },
        { id: 'ing-3', name: 'Fresh milk', category: 'Dairy', unit: 'L', qty: 11, min: 6, unitCost: 88, bestBefore: iso(6).slice(0, 10), notes: 'Keep chilled', archived: false },
        { id: 'ing-4', name: '12 oz cups', category: 'Packaging', unit: 'pcs', qty: 180, min: 100, unitCost: 2.2, bestBefore: '', notes: '', archived: false },
        { id: 'ing-5', name: 'Cup lids', category: 'Packaging', unit: 'pcs', qty: 70, min: 90, unitCost: 1.1, bestBefore: '', notes: 'Seal inspection required', archived: false },
        { id: 'ing-6', name: 'Coffee concentrate', category: 'Tea & coffee', unit: 'L', qty: 5.5, min: 4, unitCost: 115, bestBefore: iso(14).slice(0, 10), notes: '', archived: false }
    ];
    const movements = ingredients.map((i, k) => ({ id: `move-${k}`, ingredientId: i.id, action: 'opening', before: 0, after: i.qty, delta: i.qty, note: 'Demonstration opening balance', actorId: 'st-a', at: iso(-2), unitCost: i.unitCost }));
    const orders = [
        { id: 'ord-1', code: 'BB-1001', channel: 'Walk-in', createdAt: iso(-0.2), createdBy: 'st-b', preparedBy: 'st-b', status: 'verification', lines: [{ id: 'l-1', drink: 'Milk tea', qty: 2, details: 'With pearls' }], verifications: [], cancelReason: '' },
        { id: 'ord-2', code: 'BB-1002', channel: 'Delivery', createdAt: iso(-0.4), createdBy: 'st-a', preparedBy: 'st-c', status: 'completed', lines: [{ id: 'l-2', drink: 'Coffee', qty: 1, details: 'Less ice' }], verifications: [{ id: 'v-1', actorId: 'st-a', at: iso(-0.35), passed: true, issueType: '', notes: '' }], cancelReason: '' },
        { id: 'ord-3', code: 'BB-1003', channel: 'Pickup', createdAt: iso(-0.1), createdBy: 'st-a', preparedBy: '', status: 'queued', lines: [{ id: 'l-3', drink: 'Fruit tea', qty: 1, details: 'No add-ons' }], verifications: [], cancelReason: '' }
    ];
    const trainings = [{ id: 'tr-1', employeeId: 'st-b', moduleId: 'onboarding', status: 'completed', assignedAt: iso(-9), completedAt: iso(-7) }, { id: 'tr-2', employeeId: 'st-c', moduleId: 'quality', status: 'assigned', assignedAt: iso(-2), completedAt: '' }];
    return { ...emptyDatabase(), mode: 'sample', branchName: 'Sample branch · Demonstration', ingredients, movements, employees: staff, orders, trainings };
}
export const initialDemoTimestamp = now;
export const newId = uid;
