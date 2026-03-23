DROP TABLE IF EXISTS benchmarks;

CREATE TABLE benchmarks (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  date            TEXT,
  time            TEXT,
  machine         TEXT,       -- ROTO-1/2/3, FLEXO-1/2
  process_type    TEXT,       -- 'gravure' | 'flexo'
  job             TEXT,
  color           TEXT,
  de              REAL,       -- dE2000
  ds              REAL,       -- D/S % (100 = ideal)
  delta_c         REAL,       -- ΔC* chroma difference
  delta_h         REAL,       -- ΔH* hue difference
  delta_l         REAL,       -- ΔL* lightness difference
  viscosity       REAL,       -- DIN cup seconds (gravure primary)
  print_speed     REAL,       -- m/min
  drying_temp     REAL,       -- °C
  status_en       TEXT,
  status_tr       TEXT,
  benchmark_en    TEXT,
  benchmark_tr    TEXT,
  diagnosis_en    TEXT,
  diagnosis_tr    TEXT
);

-- Migration for existing installations:
-- Uncomment and run the following lines to update an active D1 database without dropping it:
-- ALTER TABLE benchmarks ADD COLUMN process_type TEXT DEFAULT 'gravure';
-- ALTER TABLE benchmarks ADD COLUMN delta_h      REAL DEFAULT 0;
-- ALTER TABLE benchmarks ADD COLUMN delta_l      REAL DEFAULT 0;
-- ALTER TABLE benchmarks ADD COLUMN viscosity    REAL;
-- ALTER TABLE benchmarks ADD COLUMN print_speed  REAL;
-- ALTER TABLE benchmarks ADD COLUMN drying_temp  REAL;
