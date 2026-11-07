import { Button, Field, Roll, Stage, Text, Toast, Window, type Act } from '../../kit'
import { Check } from 'lucide-react'
import './bigbrew.css'

// The product's own mark, copied from public/assets/ so the scene reads as BigBrew
const LOGO = new URL('./bigbrew-icon.png', import.meta.url).href

// BigBrew BBOMS: the manager records a sale from the dashboard and today's
// total rolls up. Wide hero, browser crop, the real app's cream and coffee
// palette; the form is anchored under the link that opens it.

type S = {
  form: boolean
  amount: string
  saved: boolean
  toast: boolean
}

const initial: S = { form: false, amount: '', saved: false, toast: false }
// Most people only see the poster: the payoff, with the form gone.
const poster: S = { form: false, amount: '380', saved: true, toast: true }

const TOTAL_BEFORE = '₱4,180.00'
const TOTAL_AFTER = '₱4,560.00'
const NAV = ['Dashboard', 'Inventory', 'Shift log', 'Sales', 'Users']

const STOCK = [
  { name: 'Oat milk', category: 'Dairy', qty: '3 L', par: 'Par 6' },
  { name: 'Espresso beans', category: 'Coffee', qty: '2 kg', par: 'Par 5' },
  { name: 'Cups 12 oz', category: 'Packaging', qty: '40 pcs', par: 'Par 100' },
  { name: 'Whole milk', category: 'Dairy', qty: '4 L', par: 'Par 8' },
]

const SHIFTS = [
  { date: 'Nov 7', shift: 'Opening', user: 'manager', note: 96 },
  { date: 'Nov 7', shift: 'Mid', user: 'staff', note: 64 },
  { date: 'Nov 6', shift: 'Closing', user: 'staff', note: 82 },
  { date: 'Nov 6', shift: 'Mid', user: 'manager', note: 70 },
  { date: 'Nov 5', shift: 'Closing', user: 'staff', note: 88 },
]

const REST = { wide: { x: 902, y: 468 }, compact: { x: 330, y: 374 } }

async function script(a: Act<S>) {
  await a.wait(700)

  // The link under the total is the dashboard's one action
  await a.move('record-sale', { duration: 620 })
  await a.wait(420)
  await a.click('record-sale')
  await a.set({ form: true })
  await a.wait(520)

  await a.click('amount')
  await a.wait(240)
  await a.type('amount', '380')
  await a.wait(360)

  await a.click('save')
  await a.set({ form: false, saved: true, amount: '380' })
  await a.wait(560)
  await a.set({ toast: true })

  // Read the result, then step back out of the shot
  await a.wait(2400)
  await a.move(REST[a.layout], { duration: 700 })
  await a.wait(600)
}

export default function BigBrew() {
  return (
    <Stage
      width={960}
      height={500}
      compact={{ below: 560, width: 358, height: 400 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: { wide: REST.wide, compact: REST.compact }, style: 'real', kind: 'pointer' }}
      className="bb"
      tokens={{
        '--ss-font': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        '--ss-canvas': '#f4efe8',
        '--ss-surface': '#ffffff',
        '--ss-chrome': '#ffffff',
        '--ss-line': '#e6d9c8',
        '--ss-line-faint': '#efe5d8',
        '--ss-text-strong': '#3a2a1c',
        '--ss-text': '#6b6056',
        '--ss-text-faint': '#8d7f70',
        '--ss-accent': '#8b542e',
        '--ss-accent-soft': 'rgba(139, 84, 46, 0.10)',
        '--ss-radius-md': '8px',
        '--ss-radius-lg': '10px',
        '--ss-radius-window': '12px',
        '--ss-shadow-hero': '0 26px 64px rgba(61, 41, 20, 0.20)',
      }}
    >
      {(s, rect) => (
        <>
          <Window
            url="localhost/bigbrew/dashboard.php"
            urlShape="pill"
            nav
            className="bb-window"
          >
            <header className="bb-head">
              <div className="bb-brand">
                <img className="bb-mark" src={LOGO} alt="" width={30} height={30} />
                <div>
                  <strong>BIGBREW</strong>
                  <small>Operations management</small>
                </div>
              </div>
              <div className="bb-account">
                <div className="bb-who">
                  <strong>manager</strong>
                  <small>Manager</small>
                </div>
                <Button variant="secondary" size="small" className="bb-signout">
                  Log out
                </Button>
              </div>
            </header>

            <nav className="bb-nav">
              {NAV.map((label, i) => (
                <Text key={label} className="bb-nav__item" data-on={i === 0 || undefined}>
                  {label}
                </Text>
              ))}
            </nav>

            <main className="bb-page">
              <div className="bb-heading">
                <Text className="bb-kicker">Today · Friday, November 7</Text>
                <div className="bb-h1">Shift overview</div>
              </div>

              <div className="bb-stats">
                <section className="bb-card">
                  <Text className="bb-card__label">Today's sales</Text>
                  <span className="bb-value">
                    <Roll>{s.saved ? TOTAL_AFTER : TOTAL_BEFORE}</Roll>
                  </span>
                  <span className="bb-link" data-target="record-sale" data-cursor="pointer">
                    Record sale →
                  </span>
                </section>

                <section className="bb-card">
                  <Text className="bb-card__label">This month's sales</Text>
                  <span className="bb-value">₱86,420.00</span>
                  <Text className="bb-card__note">November 2026</Text>
                </section>

                <section className="bb-card bb-card--alert">
                  <Text className="bb-card__label">Low-stock alerts</Text>
                  <span className="bb-value bb-value--alert">3</span>
                  <span className="bb-link">Review items →</span>
                </section>
              </div>

              <div className="bb-panels">
                <section className="bb-panel">
                  <div className="bb-panel__head">
                    <Text className="bb-panel__title">Low-stock watch</Text>
                    <Text className="bb-panel__meta">Quantity vs minimum</Text>
                  </div>
                  <div className="bb-watch">
                    {STOCK.map((row) => (
                      <div key={row.name} className="bb-watch__row">
                        <div className="bb-watch__what">
                          <Text className="bb-watch__name">{row.name}</Text>
                          <Text className="bb-watch__cat">{row.category}</Text>
                        </div>
                        <div className="bb-watch__nums">
                          <Text className="bb-watch__qty">{row.qty}</Text>
                          <Text className="bb-watch__par">{row.par}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bb-panel bb-panel--shifts">
                  <div className="bb-panel__head">
                    <Text className="bb-panel__title">Recent shift handovers</Text>
                    <span className="bb-link bb-link--quiet">All logs →</span>
                  </div>
                  <div className="bb-shifts">
                    <div className="bb-shifts__head">
                      <Text className="bb-shifts__h">Date</Text>
                      <Text className="bb-shifts__h">Shift</Text>
                      <Text className="bb-shifts__h">User</Text>
                      <Text className="bb-shifts__h">Notes</Text>
                    </div>
                    {SHIFTS.map((row, i) => (
                      <div key={i} className="bb-shifts__row">
                        <Text className="bb-shifts__date">{row.date}</Text>
                        <Text className="bb-shifts__shift">{row.shift}</Text>
                        <Text className="bb-shifts__user">{row.user}</Text>
                        <span className="bb-shifts__note">
                          <i style={{ width: `${row.note}%` }} />
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </main>
          </Window>

          {/* Anchored where the product would put it: under the link that opened it */}
          <div
            className="bb-form"
            data-show={s.form || undefined}
            style={{ left: Math.max(12, rect('record-sale').x - 2), top: rect('record-sale').y + 24 }}
          >
            <Text className="bb-form__title">New sale</Text>
            <Field
              label="Sale amount (₱)"
              value={s.amount}
              placeholder="0.00"
              focused={s.form}
              box={{ 'data-target': 'amount', 'data-cursor': 'ibeam' }}
              className="bb-form__field"
            />
            <div className="bb-form__actions">
              <Button variant="ghost" size="small" data-target="cancel">
                Cancel
              </Button>
              <Button variant="primary" size="small" data-target="save">
                Save sale
              </Button>
            </div>
          </div>

          <div className="bb-toast">
            <Toast show={s.toast} icon={<Check size={13} strokeWidth={2.6} />}>
              Sale recorded.
            </Toast>
          </div>

        </>
      )}
    </Stage>
  )
}
