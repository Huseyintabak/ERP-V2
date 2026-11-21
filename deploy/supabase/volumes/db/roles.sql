-- Servis rollerine POSTGRES_PASSWORD ata.
-- Image sürümüne göre bazı roller (örn. supabase_functions_admin) bulunmayabilir;
-- init ON_ERROR_STOP ile çalıştığından sadece var olan roller değiştirilir.
\set pgpass `echo "$POSTGRES_PASSWORD"`

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') AS has_role \gset
\if :has_role
ALTER USER authenticator WITH PASSWORD :'pgpass';
\endif

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pgbouncer') AS has_role \gset
\if :has_role
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
\endif

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') AS has_role \gset
\if :has_role
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
\endif

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_functions_admin') AS has_role \gset
\if :has_role
ALTER USER supabase_functions_admin WITH PASSWORD :'pgpass';
\endif

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') AS has_role \gset
\if :has_role
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
\endif
