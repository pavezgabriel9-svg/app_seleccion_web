-- =============================================================
-- App Selección Web — Agregar test DISC al catálogo
-- Ejecutar en Supabase: SQL Editor > New Query
-- =============================================================

INSERT INTO tests (id, name, path, position, has_practice) VALUES
  ('disc', 'DISC — Estilo de Comportamiento', 'disc', 7, false)
ON CONFLICT (id) DO NOTHING;
