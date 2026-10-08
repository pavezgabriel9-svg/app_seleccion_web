-- =============================================================
-- App Selección Web — Agregar test Excel al catálogo
-- (Excel — Conocimientos, selección múltiple, 21 preguntas, 30 min)
-- Ejecutar en Supabase: SQL Editor > New Query
-- =============================================================

INSERT INTO tests (id, name, path, position, has_practice) VALUES
  ('excel', 'Excel — Conocimientos (selección múltiple)', 'excel', 11, false)
ON CONFLICT (id) DO NOTHING;
