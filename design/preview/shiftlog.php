<header class="page-head"><p class="kicker">Shift handovers</p><h1>Shift log</h1><p class="lead">Write down what the next shift needs to know.</p></header>
<div class="two-column shift-layout">
 <section class="panel"><div class="panel-heading"><h2>New handover</h2><span class="mini-label">Signed as manager</span></div>
 <form method="post" class="stack-form"><label class="field"><span>Shift date</span><input name="shift_date" type="date" max="2026-11-07" value="2026-11-07" required></label>
 <label class="field"><span>Shift</span><select name="shift_type" required><option value="opening">Opening</option><option value="mid">Mid</option><option value="closing">Closing</option></select></label>
 <label class="field"><span>Handover notes</span><textarea name="notes" rows="6" minlength="1" maxlength="2000" required placeholder="Machine issues, deliveries, and anything left undone"></textarea><small>1–2000 characters. Saved with your name and the time.</small></label>
 <button class="btn btn-primary" type="submit">Save handover</button></form></section>
 <section class="panel history-panel"><div class="panel-heading"><h2>Earlier handovers</h2><span class="mini-label">Latest 50 matching entries</span></div>
 <form class="filter-row" method="get"><label class="field"><span>Shift</span><select name="shift"><option value="all" selected>All shifts</option><option value="opening">Opening</option><option value="mid">Mid</option><option value="closing">Closing</option></select></label><label class="field"><span>Date</span><input name="date" type="date" max="2026-11-07" value=""></label><button class="btn btn-light" type="submit">Filter</button></form>
 <div class="table-wrap" role="region" aria-label="Shift log history" tabindex="0"><table class="data-table"><caption class="sr-only">Latest 50 matching shift logs</caption><thead><tr><th scope="col">Date</th><th scope="col">Shift</th><th scope="col">User</th><th scope="col">Notes</th><th scope="col">Timestamp</th></tr></thead><tbody>
  <tr><td>2026-11-07</td><td>Opening</td><td>manager</td><td class="notes-cell">Espresso machine descaled; oat milk delivery arrived at 7:10.</td><td>2026-11-07 07:20:04</td></tr>
  <tr><td>2026-11-07</td><td>Mid</td><td>staff</td><td class="notes-cell">Two sleeves of 12 oz cups left; added to the low-stock watch.</td><td>2026-11-07 12:05:37</td></tr>
  <tr><td>2026-11-06</td><td>Closing</td><td>staff</td><td class="notes-cell">Register counted, GCash settlement matched.</td><td>2026-11-06 20:48:12</td></tr>
  <tr><td>2026-11-06</td><td>Mid</td><td>manager</td><td class="notes-cell">Barista training 2–4pm; syrup shelf restocked.</td><td>2026-11-06 14:10:55</td></tr>
  <tr><td>2026-11-05</td><td>Closing</td><td>staff</td><td class="notes-cell">Cold brew keg changed; no incidents.</td><td>2026-11-05 21:02:19</td></tr>
 </tbody></table></div>
 </section>
</div>
