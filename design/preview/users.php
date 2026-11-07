<header class="page-head"><p class="kicker">Manager access</p><h1>User management</h1><p class="lead">Add staff accounts and set their role. Switch access off when someone leaves.</p></header>
<div class="two-column">
<section class="panel"><div class="panel-heading"><h2>Create account</h2><span class="mini-label">Manager only</span></div>
<form method="post" class="stack-form"><label class="field"><span>Username</span><input name="username" minlength="3" maxlength="50" pattern="[A-Za-z0-9_.-]{3,50}" required autocomplete="off"></label><label class="field"><span>Password</span><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required></label><label class="field"><span>Role</span><select name="role"><option value="staff">Staff: counts, handovers, sales</option><option value="manager">Manager: all pages, plus accounts</option></select></label><button class="btn btn-primary" type="submit">Create account</button></form></section>
<section class="panel history-panel"><div class="panel-heading"><h2>Accounts</h2><span class="mini-label">2 accounts</span></div>
<ul class="user-list">
 <li><div class="user-meta"><strong>manager</strong><small>Manager · Active</small></div>
  <form method="post" class="reset-form"><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="New password"><button class="btn btn-small" type="submit">Reset</button></form>
 </li>
 <li><div class="user-meta"><strong>staff</strong><small>Staff · Active</small></div>
  <form method="post"><button class="btn btn-small btn-light" type="submit">Disable</button></form>
  <form method="post" class="reset-form"><input name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="New password"><button class="btn btn-small" type="submit">Reset</button></form>
 </li>
</ul></section>
</div>
