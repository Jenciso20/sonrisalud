-- Evita solapes de citas por odontologo usando constraint GIST (PostgreSQL).
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'citas_no_overlap_gist'
  ) THEN
    ALTER TABLE "citas"
      ADD CONSTRAINT "citas_no_overlap_gist"
      EXCLUDE USING gist (
        odontologo_id WITH =,
        tstzrange("inicio","fin") WITH &&
      )
      WHERE (estado IN ('pendiente','confirmada'));
  END IF;
END $$;
