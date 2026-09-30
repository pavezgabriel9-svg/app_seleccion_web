-- ============================================================
-- MIGRATION 007 — Convocatorias (link compartido con lista blanca)
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Fase 1 del plan docs/plans/2026-09-23-convocatorias-link-compartido.md:
-- migración + ingreso del candidato + listado mínimo.
--
-- Idempotente: puede ejecutarse más de una vez sin error.
-- ============================================================


-- ─── 1. TABLA convocatorias ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS convocatorias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,
  cargo          text,
  battery_id     uuid NOT NULL REFERENCES batteries(id),
  tests_snapshot jsonb NOT NULL DEFAULT '[]',
  admin_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_role   text NOT NULL DEFAULT 'admin',
  activa         boolean NOT NULL DEFAULT true,
  expira_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convocatorias_admin
  ON convocatorias(admin_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_battery
  ON convocatorias(battery_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_creator_role
  ON convocatorias(creator_role);


-- ─── 2. TABLA convocatoria_habilitados ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS convocatoria_habilitados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convocatoria_id uuid NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
  rut             text NOT NULL,
  nombre          text,
  telefono        text,
  session_id      uuid REFERENCES evaluation_sessions(id) ON DELETE SET NULL,
  ingresado_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_habilitado_rut
  ON convocatoria_habilitados (convocatoria_id, rut);
CREATE INDEX IF NOT EXISTS idx_habilitados_convocatoria
  ON convocatoria_habilitados (convocatoria_id);
CREATE INDEX IF NOT EXISTS idx_habilitados_session
  ON convocatoria_habilitados (session_id);


-- ─── 3. COLUMNA convocatoria_id en evaluation_sessions ───────────────────────

ALTER TABLE evaluation_sessions
  ADD COLUMN IF NOT EXISTS convocatoria_id uuid REFERENCES convocatorias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eval_sessions_convocatoria
  ON evaluation_sessions (convocatoria_id);


-- ─── 4. RLS ───────────────────────────────────────────────────────────────────
-- Mismas reglas jerárquicas que evaluation_sessions (migración 006):
--   super_admin → ve todas; admin → las suyas + las de creator_role='user';
--   user → solo las suyas. is_super_admin() e is_admin() ya existen (001/006).
-- El acceso público del candidato es siempre vía service role dentro de las
-- server actions, que bypasea RLS — estas políticas solo gobiernan el panel.

ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocatoria_habilitados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "convocatorias_select" ON convocatorias;
CREATE POLICY "convocatorias_select" ON convocatorias
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR admin_id = auth.uid()
    OR (is_admin() AND creator_role = 'user')
  );

DROP POLICY IF EXISTS "convocatorias_insert" ON convocatorias;
CREATE POLICY "convocatorias_insert" ON convocatorias
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "convocatorias_update" ON convocatorias;
CREATE POLICY "convocatorias_update" ON convocatorias
  FOR UPDATE TO authenticated
  USING (admin_id = auth.uid() OR is_super_admin())
  WITH CHECK (admin_id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "convocatorias_delete" ON convocatorias;
CREATE POLICY "convocatorias_delete" ON convocatorias
  FOR DELETE TO authenticated
  USING (admin_id = auth.uid() OR is_super_admin());


DROP POLICY IF EXISTS "convocatoria_habilitados_select" ON convocatoria_habilitados;
CREATE POLICY "convocatoria_habilitados_select" ON convocatoria_habilitados
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM convocatorias c
      WHERE c.id = convocatoria_habilitados.convocatoria_id
        AND (
          is_super_admin()
          OR c.admin_id = auth.uid()
          OR (is_admin() AND c.creator_role = 'user')
        )
    )
  );

DROP POLICY IF EXISTS "convocatoria_habilitados_insert" ON convocatoria_habilitados;
CREATE POLICY "convocatoria_habilitados_insert" ON convocatoria_habilitados
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM convocatorias c
      WHERE c.id = convocatoria_habilitados.convocatoria_id
        AND (c.admin_id = auth.uid() OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "convocatoria_habilitados_update" ON convocatoria_habilitados;
CREATE POLICY "convocatoria_habilitados_update" ON convocatoria_habilitados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM convocatorias c
      WHERE c.id = convocatoria_habilitados.convocatoria_id
        AND (c.admin_id = auth.uid() OR is_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM convocatorias c
      WHERE c.id = convocatoria_habilitados.convocatoria_id
        AND (c.admin_id = auth.uid() OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "convocatoria_habilitados_delete" ON convocatoria_habilitados;
CREATE POLICY "convocatoria_habilitados_delete" ON convocatoria_habilitados
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM convocatorias c
      WHERE c.id = convocatoria_habilitados.convocatoria_id
        AND (c.admin_id = auth.uid() OR is_super_admin())
    )
  );

-- ============================================================
-- FIN DE LA MIGRACIÓN 007
-- Verifica el resultado antes de continuar:
--   SELECT count(*) FROM convocatorias;
--   SELECT count(*) FROM convocatoria_habilitados;
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'evaluation_sessions' AND column_name = 'convocatoria_id';
-- ============================================================
