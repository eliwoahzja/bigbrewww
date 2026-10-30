<?php
require dirname(__DIR__).'/app/bootstrap.php';
redirect(isset($_SESSION['user_id']) ? '/dashboard.php' : '/login.php');
