ALTER TABLE users ADD COLUMN organization_role TEXT;

CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_role);
