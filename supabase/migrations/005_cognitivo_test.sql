-- =============================================================
-- App Selección Web — Agregar test TCG (capacidad cognitiva)
-- Ejecutar en Supabase: SQL Editor > New Query
-- =============================================================

INSERT INTO tests (id, name, path, position, has_practice) VALUES
  ('tcg', 'TCG — Test de Capacidad Cognitiva General', 'tcg', 9, true)
ON CONFLICT (id) DO NOTHING;
