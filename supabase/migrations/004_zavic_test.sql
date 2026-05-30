-- =============================================================
-- App Selección Web — Agregar test ZAVIC al catálogo
-- Ejecutar en Supabase: SQL Editor > New Query
-- =============================================================

INSERT INTO tests (id, name, path, position, has_practice) VALUES
  ('zavic', 'ZAVIC — Valores e Intereses', 'zavic', 8, false)
ON CONFLICT (id) DO NOTHING;
