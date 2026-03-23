-- Revert Audit Trail System Changes
-- This script removes the 'status' and 'supersedes_id' columns from the 'benchmarks' table.

-- 1. Create a new table with the original schema
CREATE TABLE benchmarks_new (
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

-- 2. Copy data from the old table (ignoring status and supersedes_id)
INSERT INTO benchmarks_new (
    id, created_at, date, time, machine, process_type, job, color, de, ds, 
    delta_c, delta_h, delta_l, viscosity, print_speed, drying_temp, 
    status_en, status_tr, benchmark_en, benchmark_tr, diagnosis_en, diagnosis_tr
)
SELECT 
    id, created_at, date, time, machine, process_type, job, color, de, ds, 
    delta_c, delta_h, delta_l, viscosity, print_speed, drying_temp, 
    status_en, status_tr, benchmark_en, benchmark_tr, diagnosis_en, diagnosis_tr
FROM benchmarks;

-- 3. Drop the old table
DROP TABLE benchmarks;

-- 4. Rename the new table to the original name
ALTER TABLE benchmarks_new RENAME TO benchmarks;
