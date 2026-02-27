-- Development-only seed data for local testing.
-- Do NOT run this file in production environments.

USE athlete_management;

-- Demo admin user  (password: Admin@1234)
INSERT IGNORE INTO users (full_name, email, password_hash, role)
VALUES (
  'Iron Forge Admin',
  'admin@ironforgegym.com',
  '$2a$12$Ynq5Z8t.QpIIGkq5uRoRxuGm2leMpD6PZi9f/fNmNijTn4yqn6Vgy',
  'admin'
);
