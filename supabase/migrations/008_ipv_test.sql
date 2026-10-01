-- =============================================================
-- App Selección Web — Agregar test IPV al catálogo
-- (Inventario de Personalidad para Vendedores)
-- Ejecutar en Supabase: SQL Editor > New Query
-- =============================================================

INSERT INTO tests (id, name, path, position, has_practice) VALUES
  ('ipv', 'IPV — Personalidad para Vendedores', 'ipv', 10, false)
ON CONFLICT (id) DO NOTHING;
