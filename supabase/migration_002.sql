-- Migration 002: contraseña de admin por grupo
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS admin_password VARCHAR(100);
