-- ============================================================
-- MIGRATION 006 — Visibilidad jerárquica por rol del creador
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- NUEVA REGLA DE VISIBILIDAD DE EVALUACIONES:
--   super_admin → ve TODAS las evaluaciones
--   admin       → las suyas + todas las creadas por cuentas con rol 'user'
--   user        → solo las suyas
--
-- Para poder filtrar por "el rol de quien creó la evaluación" sin consultar
-- auth.users en cada query, denormalizamos ese rol en la columna
-- evaluation_sessions.creator_role, poblada al momento de crear la sesión.
--
-- Debe mantenerse en sincronía con lib/auth/session-visibility.ts (capa app).
-- ============================================================


-- ─── 1. COLUMNA creator_role + BACKFILL ─────────────────────────────────────

ALTER TABLE evaluation_sessions
  ADD COLUMN IF NOT EXISTS creator_role text;

-- Rellenar con el rol real del creador (desde app_metadata en auth.users)
UPDATE evaluation_sessions es
SET creator_role = coalesce(u.raw_app_meta_data ->> 'role', 'user')
FROM auth.users u
WHERE u.id = es.admin_id
  AND es.creator_role IS NULL;

-- Fail-closed: cualquier fila sin match (creador eliminado) queda como 'admin',
-- lo que la restringe a su dueño + super_admin (no se filtra entre admins).
UPDATE evaluation_sessions
SET creator_role = 'admin'
WHERE creator_role IS NULL;

ALTER TABLE evaluation_sessions
  ALTER COLUMN creator_role SET DEFAULT 'admin';
ALTER TABLE evaluation_sessions
  ALTER COLUMN creator_role SET NOT NULL;

-- Índice para el filtro de admins (creator_role = 'user')
CREATE INDEX IF NOT EXISTS idx_eval_sessions_creator_role
  ON evaluation_sessions(creator_role);


-- ─── 2. FUNCIÓN: is_admin (coincidencia exacta, NO super_admin) ──────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;


-- ─── 3. POLÍTICA: evaluation_sessions (SELECT jerárquico) ────────────────────

DROP POLICY IF EXISTS "sessions_select" ON evaluation_sessions;

CREATE POLICY "sessions_select" ON evaluation_sessions
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR admin_id = auth.uid()
    OR (is_admin() AND creator_role = 'user')
  );

-- INSERT / UPDATE se mantienen como en la migración 002 (basadas en propiedad).


-- ─── 4. POLÍTICA: candidates (hereda visibilidad de la sesión) ───────────────

DROP POLICY IF EXISTS "candidates_select" ON candidates;

CREATE POLICY "candidates_select" ON candidates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_sessions es
      WHERE es.id = candidates.session_id
        AND (
          is_super_admin()
          OR es.admin_id = auth.uid()
          OR (is_admin() AND es.creator_role = 'user')
        )
    )
  );


-- ─── 5. POLÍTICA: test_results (hereda visibilidad de la sesión) ─────────────

DROP POLICY IF EXISTS "test_results_select" ON test_results;

CREATE POLICY "test_results_select" ON test_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM evaluation_sessions es
      WHERE es.id = test_results.session_id
        AND (
          is_super_admin()
          OR es.admin_id = auth.uid()
          OR (is_admin() AND es.creator_role = 'user')
        )
    )
  );

-- ============================================================
-- FIN DE LA MIGRACIÓN 006
-- Verifica el resultado antes de continuar:
--   SELECT creator_role, count(*) FROM evaluation_sessions GROUP BY 1;
-- ============================================================
