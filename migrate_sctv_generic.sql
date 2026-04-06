-- Add generic SCTV columns to benchmarks
ALTER TABLE benchmarks ADD COLUMN sctv_5 REAL;
ALTER TABLE benchmarks ADD COLUMN sctv_10 REAL;
ALTER TABLE benchmarks ADD COLUMN sctv_25 REAL;
ALTER TABLE benchmarks ADD COLUMN sctv_50 REAL;
ALTER TABLE benchmarks ADD COLUMN sctv_75 REAL;
