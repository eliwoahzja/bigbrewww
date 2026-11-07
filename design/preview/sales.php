<header class="page-head"><p class="kicker">Sales register</p><h1>Sales</h1><p class="lead">Log sales by hand. This page doesn't process payments.</p></header>
<section class="panel sales-filters" aria-labelledby="sales-filter-title"><h2 id="sales-filter-title">Filter sales by date</h2>
<form method="get" class="filter-row"><label class="field"><span>From <em>(optional)</em></span><input type="date" name="from" max="2026-11-07" value=""></label><label class="field"><span>To <em>(optional)</em></span><input type="date" name="to" max="2026-11-07" value=""></label><button class="btn btn-light" type="submit">Filter</button></form>
<a class="text-link" href="/sales.php">Clear filters</a><p class="muted">The summary covers the seven days up to your end date. Filters also narrow the list.</p></section>
<div class="two-column">
<section class="panel"><div class="panel-heading"><h2>Record a sale</h2><span class="mini-label">Manual entry</span></div>
<form method="post" class="stack-form"><label class="field"><span>Date</span><input type="date" name="sale_date" max="2026-11-07" value="2026-11-07" required></label>
<label class="field"><span>Sale amount (₱)</span><input type="number" name="amount" step="0.01" min="0.01" max="99999999" placeholder="0.00" inputmode="decimal" required></label>
<label class="field"><span>Notes <em>(optional)</em></span><input name="notes" maxlength="255" placeholder="Walk-in, delivery, note"></label>
<button class="btn btn-primary" type="submit">Record sale</button></form></section>
<section class="panel"><div class="panel-heading"><h2>Seven-day summary</h2><span class="mini-label">Ending 2026-11-07</span></div>
<div class="table-wrap" role="region" aria-label="Seven-day sales summary" tabindex="0"><table class="data-table"><caption class="sr-only">Sales totals grouped by date, newest first</caption><thead><tr><th scope="col">Date</th><th scope="col">Entries</th><th scope="col">Total</th></tr></thead><tbody>
<tr><td>2026-11-07</td><td>6</td><td><strong>₱4,560.00</strong></td></tr>
<tr><td>2026-11-06</td><td>9</td><td><strong>₱7,180.00</strong></td></tr>
<tr><td>2026-11-05</td><td>8</td><td><strong>₱6,240.00</strong></td></tr>
<tr><td>2026-11-04</td><td>7</td><td><strong>₱5,980.00</strong></td></tr>
<tr><td>2026-11-03</td><td>10</td><td><strong>₱8,120.00</strong></td></tr>
<tr><td>2026-11-02</td><td>5</td><td><strong>₱3,960.00</strong></td></tr>
<tr><td>2026-11-01</td><td>4</td><td><strong>₱2,880.00</strong></td></tr>
</tbody></table></div></section>
</div>
<section class="panel recent-sales"><div class="panel-heading"><h2>Recent transactions</h2><span class="mini-label">Latest 50 entries</span></div>
<div class="table-wrap"><table class="data-table"><caption class="sr-only">Recent sales transactions</caption><thead><tr><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Notes</th><th scope="col">Recorded by</th><th scope="col">Timestamp</th></tr></thead><tbody>
<tr><td data-label="Date">2026-11-07</td><td data-label="Amount"><strong>₱380.00</strong></td><td data-label="Notes">Walk-in</td><td data-label="Recorded by">manager</td><td data-label="Timestamp">2026-11-07 09:42:11</td></tr>
<tr><td data-label="Date">2026-11-07</td><td data-label="Amount"><strong>₱1,240.00</strong></td><td data-label="Notes">Delivery, 3F office</td><td data-label="Recorded by">staff</td><td data-label="Timestamp">2026-11-07 08:15:40</td></tr>
<tr><td data-label="Date">2026-11-06</td><td data-label="Amount"><strong>₱860.00</strong></td><td data-label="Notes">Walk-in</td><td data-label="Recorded by">staff</td><td data-label="Timestamp">2026-11-06 17:05:22</td></tr>
<tr><td data-label="Date">2026-11-06</td><td data-label="Amount"><strong>₱2,340.00</strong></td><td data-label="Notes">Catering, study group</td><td data-label="Recorded by">manager</td><td data-label="Timestamp">2026-11-06 13:48:09</td></tr>
<tr><td data-label="Date">2026-11-05</td><td data-label="Amount"><strong>₱720.00</strong></td><td data-label="Notes">Walk-in</td><td data-label="Recorded by">staff</td><td data-label="Timestamp">2026-11-05 16:22:31</td></tr>
</tbody></table></div></section>
