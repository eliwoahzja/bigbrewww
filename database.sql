CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('manager','staff') NOT NULL DEFAULT 'staff',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(20) NOT NULL,
  par_level DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT inventory_quantity_nonnegative CHECK (quantity >= 0),
  CONSTRAINT inventory_par_nonnegative CHECK (par_level >= 0),
  CONSTRAINT inventory_cost_nonnegative CHECK (unit_cost >= 0),
  KEY inventory_category (category, item_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shift_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  shift_date DATE NOT NULL,
  shift_type ENUM('opening','mid','closing') NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shift_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY shift_logs_recent (shift_date, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sale_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes VARCHAR(255) DEFAULT NULL,
  created_by INT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT sales_amount_positive CHECK (amount > 0),
  CONSTRAINT fk_sales_user FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY sales_daily (sale_date, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO users (username,password,role,active) VALUES
('manager', '$2y$12$dYiYBch4DjzF9lm3wFclRuTyj9gq.caVZtnCSKXFwUPc4Vpx7aPkS', 'manager', 1),
('staff', '$2y$12$ZJ1DMD.7po.2H3UXscv36ecflHP.OOO.tLVIVU1MAuXAGdk.4OMY2', 'staff', 1);
