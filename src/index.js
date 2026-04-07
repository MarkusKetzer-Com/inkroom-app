import { Hono } from 'hono'
import { renderJobCard, MetricsModalHTML, renderTimer, metricsModalLogic } from './ui-components.js'

const app = new Hono()

function evaluateColor(colorData, globalData) {
    let de = Number(colorData.de) || 0;
    let ds = Number(colorData.ds) || 0;
    let delta_c = Number(colorData.delta_c) || 0;
    let delta_h = Number(colorData.delta_h) || 0;
    let delta_l = Number(colorData.delta_l) || 0;

    let process_type = globalData.process_type || 'gravure';
    let viscosity = (globalData.viscosity !== '' && globalData.viscosity !== null && globalData.viscosity !== undefined) ? Number(globalData.viscosity) : null;

    let benchmark_en = '';
    let benchmark_tr = '';
    let status_en = '';
    let status_tr = '';

    if (de < 2.0 && ds >= 95 && ds <= 105) {
        benchmark_en = 'Zero Pull';
        benchmark_tr = 'Sıfır Çekim';
        status_en = 'PASS';
        status_tr = 'GEÇTİ';
    } else if (de < 2.0 && ds >= 90 && ds <= 110) {
        benchmark_en = 'In Tolerance';
        benchmark_tr = 'Tolerans Dahilinde';
        status_en = 'PASS';
        status_tr = 'GEÇTİ';
    } else if (ds < 86) {
        benchmark_en = 'Transfer Issue';
        benchmark_tr = 'Transfer Sorunu';
        status_en = 'FAIL';
        status_tr = 'KALDI';
    } else {
        benchmark_en = 'Fail';
        benchmark_tr = 'Hatalı Performans';
        status_en = 'FAIL';
        status_tr = 'KALDI';
    }

    let diagnosis_en = "No action required";
    let diagnosis_tr = "\u0130\u015flem gerekmez";

    const isGravure = process_type === 'gravure';
    const cylinderEN = isGravure ? 'cylinder' : 'anilox';
    const cylinderTR = isGravure ? 'silindir' : 'anilox';
    const cellEN = isGravure ? 'cell' : 'anilox';
    const cellTR = isGravure ? 'hücre' : 'anilox';
    const doctorEN = isGravure ? 'doctor blade' : 'chamber doctor blade';
    const doctorTR = isGravure ? 'rakel' : 'hazne rakel';

    const isViscosityHigh = viscosity !== null && viscosity > 27;
    const isViscosityLow = viscosity !== null && viscosity < 17;

    if (ds < 86) {
        const overConc = delta_c > 3
            ? (isGravure
                ? ' · Additionally: ink over-concentrated — add extender before restart'
                : ' · Additionally: ink over-concentrated — add extender')
            : '';
        const overConcTR = delta_c > 3
            ? (isGravure
                ? ' · Ayrıca: boya çok güçlü — yeniden başlamadan vernik ekle'
                : ' · Ayrıca: boya çok güçlü — vernik ekle')
            : '';
        diagnosis_en = "Transfer Problem — ink not releasing from " + cellEN +
            ". Check " + doctorEN + " pressure/angle · Lower viscosity · Check impression pressure · Inspect " + cylinderEN + " engraving" + overConc;
        diagnosis_tr = "Transfer Sorunu — boya " + cellTR +
            "den ayrılmıyor. " + doctorTR + " basıncı/açısı kontrol · Viskoziteyi düşür · Baskı basıncını kontrol · " + cylinderTR + " gravürünü incele" + overConcTR;
    } else if (ds > 110) {
        diagnosis_en = "Overdosing — " + cellEN + " volume too high or viscosity too low. Increase viscosity (add fresh ink) · Check " + cellEN + " volume · Reduce impression pressure";
        diagnosis_tr = "Aşırı Dozaj — " + cellTR + " hacmi fazla veya viskozite çok düşük. Viskoziteyi artır (taze boya ekle) · " + cellTR + " hacmini kontrol et · Baskı basıncını azalt";
    } else if (ds >= 86 && ds <= 95 && delta_c < 0 && Math.abs(delta_h) < 1.5) {
        diagnosis_en = "Volume Issue — insufficient ink film. Lower viscosity · Check solvent ratio · Increase ink feed";
        diagnosis_tr = "Miktar Sorunu — yetersiz boya filmi. Viskoziteyi düşür · Solvent oranını kontrol et · Boya beslemesini artır";
    } else if (delta_c < -3 && delta_h > 1.5) {
        diagnosis_en = "Contamination — foreign ink or solvent cross-contamination. Drain and clean ink pan · Check solvent supply lines · Inspect " + doctorEN + " for residue";
        diagnosis_tr = "Kontaminasyon — yabancı boya veya solvent karışımı. Boya teknesini boşalt ve temizle · Solvent hatlarını kontrol et · " + doctorTR + " kalıntı için kontrol et";
    } else if (delta_c < -3 && Math.abs(delta_h) <= 1.0 && ds >= 86 && ds <= 110) {
        diagnosis_en = "Recipe Issue — pigment concentration low. Check viscosity · Add fresh base ink · Verify solvent evaporation rate";
        diagnosis_tr = "Reçete Sorunu — pigment konsantrasyonu düşük. Viskoziteyi kontrol et · Taze boya ekle · Solvent buharlaşma hızını kontrol et";
    } else if (delta_c > 3 && ds >= 86 && ds <= 110) {
        diagnosis_en = "Recipe Issue — ink over-concentrated. Add extender/diluent · Increase solvent ratio · Check viscosity";
        diagnosis_tr = "Reçete Sorunu — boya çok güçlü. Vernik/medyum ekle · Solvent oranını artır · Viskoziteyi kontrol et";
    } else if (delta_h > 2.0 && delta_c < 2) {
        diagnosis_en = "Hue Drift — solvent shift or pigment batch change. Compare ink batch · Check solvent ratio · Measure substrate OBA influence";
        diagnosis_tr = "Ton Kayması — solvent değişimi veya pigment parti farkı. Boya partisini karşılaştır · Solvent oranını kontrol et · Substrat OBA etkisini ölç";
    } else if (isGravure && isViscosityHigh && ds < 95) {
        diagnosis_en = "Viscosity too high — solvent evaporation. Add solvent · Check drying temp · Reduce print speed if possible";
        diagnosis_tr = "Viskozite çok yüksek — solvent buharlaşması. Solvent ekle · Kurutma sıcaklığını kontrol et · Mümkünse baskı hızını azalt";
    } else if (isGravure && isViscosityLow && ds > 105) {
        diagnosis_en = "Viscosity too low — over-diluted. Add fresh base ink · Let solvent partially evaporate · Do not add more solvent";
        diagnosis_tr = "Viskozite çok düşük — aşırı inceltilmiş. Taze boya ekle · Solventin kısmen buharlaşmasına izin ver · Daha fazla solvent ekleme";
    } else if (de >= 2.0) {
        diagnosis_en = "General Deviation — check all parameters. Verify viscosity, print speed, drying temp, ink recipe and cylinder condition";
        diagnosis_tr = "Genel Sapma — tüm parametreleri kontrol et. Viskozite, baskı hızı, kurutma sıcaklığı, boya reçetesi ve silindir durumunu kontrol et";
    }

    if (de < 2.0 && ds >= 95 && ds <= 105) {
         diagnosis_en = "Ideal — Zero Pull. No action required";
         diagnosis_tr = "\u0130deal — Sıfır Çekim. \u0130\u015flem gerekmez";
    }

    return { benchmark_en, benchmark_tr, status_en, status_tr, diagnosis_en, diagnosis_tr };
}

// ── Main SPA ───────────────────────────────────────────────────────────────
app.get('/', (c) => {
  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inkroom — Color Quality Management</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #f5f5f7;
      --surface: #ffffff;
      --border: rgba(0,0,0,0.08);
      --border-subtle: rgba(0,0,0,0.06);
      --text-primary: #1d1d1f;
      --text-secondary: #6e6e73;
      --text-tertiary: #aeaeb2;
      --accent: #0071e3;
      --radius: 12px;
      --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    header {
      background: rgba(255,255,255,0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 0.5px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo {
      width: 32px; height: 32px;
      background: #1d1d1f;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .brand-name { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; }
    .brand-sub { font-size: 11px; color: var(--text-secondary); letter-spacing: -0.01em; margin-top: 1px; }
    .header-actions { display: flex; align-items: center; gap: 12px; }

    .lang-switcher {
      display: flex;
      background: rgba(0,0,0,0.06);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }
    .lang-btn {
      font-family: var(--font);
      font-size: 11px;
      font-weight: 500;
      padding: 4px 10px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: 0.02em;
    }
    .lang-btn.active {
      background: #fff;
      color: var(--text-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    .btn-primary {
      font-family: var(--font);
      font-size: 13px;
      font-weight: 500;
      background: var(--text-primary);
      color: #fff;
      border: none;
      border-radius: 980px;
      padding: 7px 16px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: -0.01em;
    }
    .btn-primary:hover { background: #3a3a3c; }
    .btn-ghost {
      font-family: var(--font);
      font-size: 13px;
      font-weight: 500;
      background: transparent;
      color: var(--text-secondary);
      border: 0.5px solid var(--border);
      border-radius: 980px;
      padding: 7px 16px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-ghost:hover { background: rgba(0,0,0,0.04); color: var(--text-primary); }

    main { max-width: 1400px; margin: 0 auto; padding: 24px; }

    /* Press section */
    .press-section { margin-bottom: 32px; }
    .press-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      padding: 0 4px;
    }
    .press-header-left { display: flex; align-items: baseline; gap: 10px; }
    .press-name { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; }
    .press-machine { font-size: 12px; color: var(--text-secondary); }
    .press-perf { display: flex; gap: 8px; flex-shrink: 0; }
    .perf-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .perf-badge small { font-weight: 400; opacity: 0.7; }
    .perf-ok     { background: #e8f5e2; color: #1d7324; }
    .perf-warn   { background: #fff3e0; color: #a35b00; }
    .perf-action { background: #fff0ec; color: #d84315; }
    .perf-crit   { background: #fce8e8; color: #c62828; }
    .perf-none   { background: rgba(0,0,0,0.04); color: var(--text-tertiary); }
    .perf-neutral { background: rgba(0,0,0,0.04); color: var(--text-tertiary); }

    /* Time column */
    .td-time { font-size: 11px; color: var(--text-tertiary); white-space: nowrap; }

    .press-row {
      display: flex;
      gap: 16px;
      padding-bottom: 8px;
      align-items: stretch;
    }

    .card {
      background: var(--surface);
      border-radius: var(--radius);
      border: 0.5px solid var(--border);
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 340px;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.07); }

    .card-head { padding: 20px 24px 16px; border-bottom: 0.5px solid var(--border-subtle); }
    .job-id { font-size: 12px; font-weight: 500; color: var(--text-secondary); letter-spacing: -0.01em; margin-bottom: 4px; }
    .job-title { font-size: 18px; font-weight: 600; letter-spacing: -0.025em; color: var(--text-primary); margin-bottom: 12px; line-height: 1.25; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge {
      font-size: 11px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .badge-ok     { background: #e8f5e2; color: #1d7324; }
    .badge-warn   { background: #fff3e0; color: #a35b00; }
    .badge-action { background: #fff0ec; color: #d84315; }
    .badge-crit   { background: #fce8e8; color: #c62828; }
    .badge-neutral{ background: rgba(0,0,0,0.06); color: #86868b; }

    /* Pulsing Timer */
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.02); }
      100% { opacity: 1; transform: scale(1); }
    }
    .live-timer.pulsing {
      display: inline-block;
      animation: pulse 2s infinite ease-in-out;
      color: var(--accent);
      font-weight: 600;
    }

    .card table { width: 100%; border-collapse: collapse; flex: 1; }
    .card th {
      text-align: left;
      padding: 9px 24px;
      font-size: 10px;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 0.5px solid var(--border-subtle);
      white-space: nowrap;
    }
    .card th:not(:first-child) { text-align: right; padding: 9px 16px; }
    .card th:last-child { text-align: center; padding-right: 24px; }
    .card td {
      padding: 10px 24px;
      font-size: 13px;
      color: var(--text-primary);
      border-top: 0.5px solid var(--border-subtle);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
    }
    .card td:not(:first-child) { text-align: right; padding: 10px 16px; }
    .card td:last-child { text-align: center; padding-right: 24px; }
    .card tbody tr:hover { background: rgba(0,0,0,0.015); }
    .card tbody tr.color-row-clickable { cursor: pointer; transition: background 0.15s; }
    .card tbody tr.color-row-clickable:hover { background: rgba(0,113,227,0.06); }

    .swatch {
      width: 9px; height: 9px;
      border-radius: 50%;
      display: inline-block;
      vertical-align: middle;
      margin-right: 7px;
      flex-shrink: 0;
    }
    .swatch-white { border: 0.5px solid rgba(0,0,0,0.2); }

    .density-warn { color: #c62828; font-weight: 600; }

    .table-responsive {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-top: 0;
    }

    .sctv-diff {
      font-size: 9px;
      font-weight: 500;
      padding: 0 2px;
      border-radius: 2px;
    }
    .sctv-ok   { color: #1d7324; border: 0.5px solid rgba(29, 115, 36, 0.2); background: rgba(29, 115, 36, 0.05); }
    .sctv-warn { color: #a35b00; border: 0.5px solid rgba(163, 91, 0, 0.2); background: rgba(163, 91, 0, 0.05); }
    .sctv-crit { color: #c62828; border: 0.5px solid rgba(198, 40, 40, 0.2); background: rgba(198, 40, 40, 0.05); }

    .card th {
      padding: 9px 6px;
      line-height: 1;
    }
    .card td {
      padding: 8px 6px;
      line-height:1.2;
      font-size: 12px;
    }
    .card th:first-child, .card td:first-child { padding-left: 16px; text-align: left; }
    .card th:nth-last-child(-n+2), .card td:nth-last-child(-n+2) { text-align: center; }
    .card th:last-child, .card td:last-child { padding-right: 16px; }

    .pill {
      display: inline-block;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 20px;
      letter-spacing: -0.005em;
      white-space: nowrap;
    }
    .pill-ok     { background: #e8f5e2; color: #1d7324; }
    .pill-warn   { background: #fff3e0; color: #a35b00; }
    .pill-action { background: #fff0ec; color: #d84315; }
    .pill-crit   { background: #fce8e8; color: #c62828; }
    .pill-neutral { background: rgba(0,0,0,0.06); color: #86868b; }

    .card-foot {
      padding: 13px 24px;
      border-top: 0.5px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: auto;
    }
    .card-foot a {
      font-size: 12px;
      font-weight: 500;
      color: var(--accent);
      text-decoration: none;
      cursor: pointer;
      padding: 2px 0;
    }
    .card-foot a:hover { text-decoration: underline; }
    .foot-sep { color: var(--border); font-size: 12px; padding: 0 6px; user-select: none; }

    .no-measurements {
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: var(--text-tertiary);
      letter-spacing: -0.01em;
    }

    .cockpit-section {
      padding: 16px 24px;
      border-bottom: 0.5px solid var(--border-subtle);
      background: rgba(0,0,0,0.015);
    }
    .meter-circle {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: conic-gradient(var(--meter-color, #1a7326) calc(var(--val) * 1%), rgba(0,0,0,0.06) 0);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .meter-inner {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 600; color: var(--meter-color, #1a7326);
    }
    .stop-icon {
      position: relative;
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px;
    }
    .stop-val {
      position: absolute;
      font-size: 10px; font-weight: 700; color: #d84315;
    }
    .progress-bar-wrap {
      padding: 0 24px 16px;
    }
    .progress-label {
      font-size: 11px;
      color: var(--text-secondary);
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .progress-track {
      height: 6px;
      background: rgba(0,0,0,0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .progress-fill-ok { background: #1d7324; }
    .progress-fill-warn { background: #a35b00; }
    .progress-fill-crit { background: #c62828; }

    .zero-pull-banner {
      background: #e8f5e2;
      color: #1d7324;
      text-align: center;
      padding: 10px 24px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      border-top: 0.5px solid rgba(29,115,36,0.15);
    }

    .diagnosis-hint {
      padding: 8px 24px;
      font-size: 11px;
      color: #d84315;
      background: #fff8f6;
      border-top: 0.5px solid rgba(216,67,21,0.1);
      line-height: 1.4;
    }
    .diagnosis-hint strong { font-weight: 600; }

    .card-actions {
      padding: 16px 24px;
      border-top: 0.5px solid var(--border-subtle);
      display: flex;
      gap: 10px;
      margin-top: auto;
    }
    .btn-action {
      font-family: var(--font);
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: 980px;
      padding: 9px 20px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: -0.01em;
      flex: 1;
      text-align: center;
    }
    .btn-action-primary {
      background: var(--accent);
      color: #fff;
    }
    .btn-action-primary:hover { background: #005bb5; }
    .btn-action-ghost {
      background: transparent;
      color: var(--text-secondary);
      border: 0.5px solid var(--border);
    }
    .btn-action-ghost:hover { background: rgba(0,0,0,0.04); color: var(--text-primary); }

    .add-card {
      background: rgba(0,0,0,0.02);
      border-radius: var(--radius);
      border: 1.5px dashed rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 180px;
      max-width: 200px;
      min-height: 280px;
      cursor: pointer;
      transition: all 0.2s ease;
      gap: 12px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .add-card:hover { border-color: var(--accent); background: rgba(0,113,227,0.03); }
    .add-icon-circle {
      width: 44px; height: 44px;
      border-radius: 50%;
      border: 0.5px solid rgba(0,0,0,0.12);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
      font-weight: 300;
      color: var(--text-tertiary);
      transition: all 0.2s;
    }
    .add-card:hover .add-icon-circle { border-color: var(--accent); color: var(--accent); }
    .add-card-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); text-align: center; }
    .add-card:hover .add-card-label { color: var(--accent); }

    .empty-press-msg {
      font-size: 13px;
      color: var(--text-tertiary);
      padding: 20px 0;
      flex-shrink: 0;
    }

    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 200;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: var(--surface);
      border-radius: var(--radius);
      border: 0.5px solid var(--border);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .modal-head {
      padding: 20px 24px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .modal-title { font-size: 17px; font-weight: 600; letter-spacing: -0.02em; }
    .modal-close {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: rgba(0,0,0,0.06);
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      color: var(--text-secondary);
      transition: background 0.15s;
    }
    .modal-close:hover { background: rgba(0,0,0,0.10); }
    .modal-body { padding: 0 24px 24px; }

    .field { margin-bottom: 16px; }
    .field label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
      margin-bottom: 6px;
    }
    .field input, .field select {
      width: 100%;
      font-family: var(--font);
      font-size: 14px;
      color: var(--text-primary);
      background: rgba(0,0,0,0.03);
      border: 0.5px solid rgba(0,0,0,0.12);
      border-radius: 10px;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.15s, background 0.15s;
      -webkit-appearance: none;
    }
    .field input:focus, .field select:focus {
      border-color: var(--accent);
      background: #fff;
      box-shadow: 0 0 0 3px rgba(0,113,227,0.12);
    }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .modal-actions { display: flex; gap: 10px; margin-top: 24px; }
    .modal-actions .btn-primary { flex: 1; justify-content: center; display: flex; align-items: center; gap: 6px; }
    .modal-actions .btn-ghost { flex: 1; justify-content: center; display: flex; align-items: center; }

    .color-entry {
      background: rgba(0,0,0,0.02);
      border: 0.5px solid rgba(0,0,0,0.08);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 10px;
      position: relative;
    }
    .color-entry-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .color-entry-head input[type="color"] {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: 0.5px solid rgba(0,0,0,0.15);
      padding: 0;
      cursor: pointer;
      background: none;
      flex-shrink: 0;
    }
    .remove-color-btn {
      position: absolute;
      top: 10px; right: 10px;
      width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(0,0,0,0.06);
      border: none;
      cursor: pointer;
      font-size: 12px;
      color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
    }
    .remove-color-btn:hover { background: #fce8e8; color: #c62828; }

    /* Performance Cockpit & Action Buttons */
    .cockpit-section {
      padding: 16px 24px;
      background: rgba(0,0,0,0.02);
      border-top: 0.5px solid var(--border-subtle);
    }
    .cockpit-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .cockpit-stat {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cockpit-label {
      font-size: 10px;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .cockpit-val {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }
    .live-timer {
      font-family: inherit;
      color: var(--accent);
      font-feature-settings: "tnum";
    }
    
    .efficiency-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 6px;
    }
    .eff-high { background: #e8f5e2; color: #1d7324; }
    .eff-mid  { background: #fff3e0; color: #a35b00; }
    .eff-low  { background: #fce8e8; color: #c62828; }

    .action-btn-wrap {
      padding: 12px 24px;
      border-top: 0.5px solid var(--border-subtle);
      display: flex;
      gap: 8px;
    }
    .btn-action-main {
      flex: 2;
      background: var(--accent);
      color: #fff;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      padding: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-action-main:hover { background: #005bb5; transform: scale(1.01); }
    .btn-action-main:active { transform: scale(0.98); }
    .btn-action-main.state-setup { background: #ff9500; }
    .btn-action-main.state-andruck { background: #5856d6; }
    .btn-action-main.state-active { background: #34c759; }

    .btn-action-sec {
      flex: 1;
      background: rgba(0,0,0,0.05);
      color: var(--text-secondary);
      font-weight: 500;
      border: 0.5px solid var(--border);
      border-radius: 10px;
      padding: 10px;
      cursor: pointer;
    }

    .cockpit-progress-bar {
      margin-top: 8px;
      height: 4px;
      background: rgba(0,0,0,0.05);
      border-radius: 2px;
      overflow: hidden;
    }
    .cockpit-progress-fill {
      height: 100%;
      background: var(--accent);
      transition: width 0.3s ease;
    }


    .modal-wide { max-width: 780px; }

    .detail-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .detail-table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 10px;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 0.5px solid var(--border);
    }
    .detail-table th:not(:first-child) { text-align: right; }
    .detail-table td {
      padding: 10px 12px;
      font-size: 13px;
      border-bottom: 0.5px solid var(--border-subtle);
      font-variant-numeric: tabular-nums;
    }
    .detail-table td:not(:first-child) { text-align: right; }

    /* Detail color groups */
    .detail-color-group {
      margin-bottom: 20px;
      border: 0.5px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .detail-color-name {
      font-size: 14px;
      font-weight: 600;
      padding: 12px 16px;
      background: rgba(0,0,0,0.02);
      border-bottom: 0.5px solid var(--border-subtle);
      letter-spacing: -0.01em;
    }
    .detail-color-name .swatch {
      width: 10px; height: 10px;
      border-radius: 50%;
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
    }
    .seq-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(0,0,0,0.06);
      color: var(--text-secondary);
    }
    .seq-first { background: #e8f5e2; color: #1d7324; }
    .edit-trail {
      font-size: 10px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .edit-trail s { color: #c62828; margin: 0 2px; }
    .edit-link {
      font-size: 11px;
      font-weight: 500;
      color: var(--accent);
      cursor: pointer;
      text-decoration: none;
    }
    .edit-link:hover { text-decoration: underline; }
    .save-link { color: #1d7324; }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #1d1d1f;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      padding: 10px 20px;
      border-radius: 980px;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 300;
      pointer-events: none;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .hidden { display: none !important; }
    #pantone-list { display: none; }

    /* Nav tabs */
    .nav-tabs {
      display: flex;
      background: rgba(0,0,0,0.06);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
      margin-right: 12px;
    }
    .nav-tab {
      font-family: var(--font);
      font-size: 12px;
      font-weight: 500;
      padding: 5px 14px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
      letter-spacing: -0.01em;
    }
    .nav-tab.active {
      background: #fff;
      color: var(--text-primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }

    /* Analytics page */
    .analytics-filters {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 24px;
      align-items: center;
    }
    .filter-select {
      font-family: var(--font);
      font-size: 12px;
      padding: 6px 12px;
      border: 0.5px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text-primary);
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
    }
    .filter-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,113,227,0.12); }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--text-primary);
    }
    .kpi-sub {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .kpi-help {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 10px;
      line-height: 1.45;
      border-top: 0.5px solid var(--border-subtle);
      padding-top: 10px;
    }

    .analytics-section {
      background: var(--surface);
      border: 0.5px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .analytics-section-head {
      padding: 16px 20px;
      border-bottom: 0.5px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .analytics-section-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .analytics-table {
      width: 100%;
      border-collapse: collapse;
    }
    .analytics-table th {
      text-align: left;
      padding: 10px 16px;
      font-size: 10px;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 0.5px solid var(--border-subtle);
      white-space: nowrap;
    }
    .analytics-table th:not(:first-child) { text-align: right; }
    .analytics-table td {
      padding: 10px 16px;
      font-size: 13px;
      border-bottom: 0.5px solid var(--border-subtle);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
    }
    .analytics-table td:not(:first-child) { text-align: right; }
    .analytics-table tbody tr:hover { background: rgba(0,0,0,0.015); }

    .press-compare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      padding: 20px;
    }
    .press-compare-card {
      border: 0.5px solid var(--border);
      border-radius: 10px;
      padding: 16px;
    }
    .press-compare-name {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      letter-spacing: -0.01em;
    }
    .press-compare-stat {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-secondary);
      padding: 4px 0;
    }
    .press-compare-val {
      font-weight: 600;
      color: var(--text-primary);
    }

    .chart-container {
      padding: 20px;
      height: 280px;
      position: relative;
    }

    .insight-card {
      padding: 14px 20px;
      border-bottom: 0.5px solid var(--border-subtle);
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .insight-card:last-child { border-bottom: none; }
    .insight-icon {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px;
      flex-shrink: 0;
    }
    .insight-warn .insight-icon { background: #fff3e0; color: #a35b00; }
    .insight-crit .insight-icon { background: #fce8e8; color: #c62828; }
    .insight-info .insight-icon { background: #e3f2fd; color: #1565c0; }
    .insight-text { font-size: 13px; color: var(--text-primary); line-height: 1.5; }
    .insight-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }

    /* SCTV CMYK Grid */
    .sctv-container {
      background: rgba(0,0,0,0.03);
      border: 0.5px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .sctv-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sctv-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sctv-row {
      display: grid;
      grid-template-columns: 80px 1fr;
      align-items: center;
      gap: 12px;
    }
    .sctv-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
    }
    .sctv-inputs {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .sctv-field {
      position: relative;
    }
    .sctv-field label {
      display: block;
      font-size: 9px;
      font-weight: 500;
      color: var(--text-tertiary);
      margin-bottom: 2px;
      text-align: center;
    }
    .sctv-field input {
      width: 100%;
      font-family: var(--font);
      font-size: 12px;
      padding: 6px 4px;
      text-align: center;
      background: #fff;
      border: 0.5px solid rgba(0,0,0,0.1);
      border-radius: 6px;
      outline: none;
    }
    .sctv-deviation {
      position: absolute;
      top: -2px;
      right: -2px;
      font-size: 8px;
      font-weight: 600;
      background: #fff;
      padding: 0 2px;
      border-radius: 4px;
      display: none;
    }
    .sctv-field input:focus + .sctv-deviation, 
    .sctv-field input:not(:placeholder-shown) + .sctv-deviation {
      display: block;
    }

    @media (max-width: 480px) {
      .sctv-row { grid-template-columns: 1fr; gap: 4px; }
      .sctv-inputs { gap: 4px; }
      .sctv-field label { font-size: 8px; }
    }

    /* ── Recipe Builder Toggles ──────────────────────────── */
    .recipe-section {
      margin-bottom: 20px;
    }
    .recipe-section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .recipe-toggles {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .recipe-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(0,0,0,0.02);
      border: 0.5px solid rgba(0,0,0,0.08);
      border-radius: 10px;
      transition: all 0.15s;
    }
    .recipe-toggle-row:hover {
      background: rgba(0,0,0,0.04);
    }
    .recipe-toggle-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }
    .recipe-toggle-label .recipe-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .recipe-icon-white {
      background: #f5f5f5;
      border: 1px solid rgba(0,0,0,0.15);
      color: #999;
    }
    .recipe-icon-cmyk {
      background: linear-gradient(135deg, #00a3e0, #e9008c, #ffed00, #1d1d1f);
      color: #fff;
      font-size: 9px;
      letter-spacing: -0.03em;
    }
    .recipe-toggle-hint {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 1px;
    }
    .toggle-pill {
      position: relative;
      width: 44px;
      height: 26px;
      border-radius: 13px;
      background: rgba(0,0,0,0.12);
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
      border: none;
      padding: 0;
    }
    .toggle-pill.active {
      background: #34c759;
    }
    .toggle-pill::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .toggle-pill.active::after {
      transform: translateX(18px);
    }
    .recipe-toggle-units {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-tertiary);
      min-width: 30px;
      text-align: right;
      margin-right: 8px;
      transition: color 0.2s;
    }
    .recipe-toggle-row.is-active .recipe-toggle-units {
      color: #34c759;
    }

    /* Print Unit Counter */
    .print-unit-box {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.08);
      background: rgba(0,0,0,0.02);
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s;
    }
    .print-unit-box.pu-ok {
      background: rgba(52,199,89,0.06);
      border-color: rgba(52,199,89,0.25);
    }
    .print-unit-box.pu-warn {
      background: rgba(255,59,48,0.06);
      border-color: rgba(255,59,48,0.25);
    }
    .pu-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .pu-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .pu-value {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      font-variant-numeric: tabular-nums;
    }
    .pu-breakdown {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 2px;
    }
    .pu-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .pu-capacity {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .pu-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
    }
    .pu-status-ok {
      background: #e8f5e2;
      color: #1d7324;
    }
    .pu-status-warn {
      background: #fce8e8;
      color: #c62828;
    }

  </style>
</head>
<body>
  <datalist id="pantone-list"></datalist>

  <!-- Header -->
  <header>
    <div class="header-inner">
      <div class="header-brand">
        <div class="brand-logo">IK</div>
        <div>
          <div class="brand-name">Inkroom</div>
          <div class="brand-sub">Color Quality Management</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="nav-tabs">
          <button id="nav-dashboard" class="nav-tab active" data-en="Dashboard" data-tr="Kontrol Paneli" onclick="switchView('dashboard')">Dashboard</button>
          <button id="nav-analytics" class="nav-tab" data-en="Analytics" data-tr="Analitik" onclick="switchView('analytics')">Analytics</button>
        </div>
        <div class="lang-switcher">
          <button id="lang-en-btn" class="lang-btn active">EN</button>
          <button id="lang-tr-btn" class="lang-btn">TR</button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main>
    <div id="dashboard-view">
      <div id="dashboard"></div>
    </div>
    <div id="analytics-view" class="hidden">
      <div id="analytics"></div>
    </div>
  </main>

  <!-- New Job Modal -->
  <div id="new-job-overlay" class="modal-overlay">
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title" data-en="New Job" data-tr="Yeni İş">New Job</span>
        <button class="modal-close" onclick="closeNewJobModal()">✕</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="nj-press-id" value="">
        <input type="hidden" id="nj-max-colors" value="8">
        <div class="field">
          <label data-en="Job Number" data-tr="İş Numarası">Job Number</label>
          <input type="text" id="nj-number" placeholder="e.g. JOB-2024-001">
        </div>
        <div class="field">
          <label data-en="Product Name" data-tr="Ürün Adı">Product Name</label>
          <input type="text" id="nj-title" placeholder="e.g. Coca-Cola Red Label">
        </div>

        <!-- Recipe Section -->
        <div class="recipe-section">
          <div class="recipe-section-title">
            <span>🎨</span>
            <span data-en="Recipe / Print Units" data-tr="Rezeptur / Druckwerke">Recipe / Print Units</span>
          </div>
          <div class="recipe-toggles">
            <div class="recipe-toggle-row" id="nj-white-row">
              <div class="recipe-toggle-label">
                <span class="recipe-icon recipe-icon-white">W</span>
                <div>
                  <div data-en="White (Base)" data-tr="Weiß (Basis)">White (Base)</div>
                  <div class="recipe-toggle-hint" data-en="Opaque white base layer" data-tr="Deckweiß-Grundschicht">Opaque white base layer</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="recipe-toggle-units" id="nj-white-units">+1</span>
                <button class="toggle-pill" id="nj-white-toggle" type="button" onclick="toggleRecipe('white')"></button>
              </div>
            </div>
            <div class="recipe-toggle-row" id="nj-cmyk-row">
              <div class="recipe-toggle-label">
                <span class="recipe-icon recipe-icon-cmyk">CMYK</span>
                <div>
                  <div>CMYK</div>
                  <div class="recipe-toggle-hint" data-en="Cyan, Magenta, Yellow, Black" data-tr="Cyan, Magenta, Gelb, Schwarz">Cyan, Magenta, Yellow, Black</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="recipe-toggle-units" id="nj-cmyk-units">+4</span>
                <button class="toggle-pill" id="nj-cmyk-toggle" type="button" onclick="toggleRecipe('cmyk')"></button>
              </div>
            </div>
            <div class="recipe-toggle-row" id="nj-varnish-row">
              <div class="recipe-toggle-label">
                <span class="recipe-icon" style="background:#e0f7fa; color:#00796b; border:1px solid #b2ebf2;">V</span>
                <div>
                  <div data-en="Varnish (Lack)" data-tr="Lack (Varnish)">Varnish (Lack)</div>
                  <div class="recipe-toggle-hint" data-en="Overprint varnish/coating" data-tr="Überdrucklack / Schutzlack">Overprint varnish/coating</div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span class="recipe-toggle-units" id="nj-varnish-units">+1</span>
                <button class="toggle-pill" id="nj-varnish-toggle" type="button" onclick="toggleRecipe('varnish')"></button>
              </div>
            </div>
          </div>
        </div>

        <!-- Spot Colors -->
        <div class="field">
          <label data-en="Spot Colors" data-tr="Sonderfarben">Spot Colors</label>
          <div id="nj-colors-container" style="display:flex; flex-direction:column; gap:8px;"></div>
          <button class="btn-ghost" style="width:100%;margin-top:8px;" onclick="addJobColorEntry()" data-en="+ Add Spot Color" data-tr="+ Sonderfarbe hinzufügen">+ Add Spot Color</button>
        </div>

        <!-- Print Unit Counter -->
        <div class="print-unit-box" id="nj-pu-box">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%;">
            <div>
              <div class="pu-label" data-en="Total Print Units" data-tr="Toplam Baskı Üniteleri">Total Print Units</div>
              <div class="pu-value" id="nj-pu-value">0</div>
              <div class="pu-breakdown" id="nj-pu-breakdown">No selection</div>
            </div>
            <div style="text-align:right;">
              <div class="pu-label" data-en="Target Setup Time" data-tr="Hedef Setup Süresi">Target Setup Time</div>
              <div class="pu-value" id="nj-setup-target" style="color:var(--accent);">-- Min</div>
              <div class="pu-status" id="nj-pu-status" style="margin-top:4px;"></div>
            </div>
          </div>
        </div>

        <div class="field" style="margin-top:16px;">
          <label data-en="Target Quantity" data-tr="Zielmenge">Target Quantity</label>
          <input type="number" id="nj-target" placeholder="50000">
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" onclick="closeNewJobModal()" data-en="Cancel" data-tr="Abbrechen">Cancel</button>
          <button class="btn-primary" id="nj-submit-btn" onclick="submitNewJob()" data-en="Create Job" data-tr="Job erstellen">Create Job</button>
        </div>
      </div>
    </div>
  </div>

  <!-- New Measurement Modal -->
  <div id="new-meas-overlay" class="modal-overlay">
    <div class="modal">
      <div class="modal-head">
        <span class="modal-title" id="new-meas-title" data-en="New Measurement" data-tr="Yeni Olcum">New Measurement</span>
        <button class="modal-close" onclick="closeNewMeasurement()">X</button>
      </div>
      <div class="modal-body">
        <div class="field-row">
          <div class="field">
            <label data-en="Machine" data-tr="Makine">Machine</label>
            <input type="text" id="nm-machine" placeholder="e.g. ROTO-1">
          </div>
          <div class="field">
            <label data-en="Process Type" data-tr="Surec Tipi">Process Type</label>
            <select id="nm-process">
              <option value="gravure">Gravure</option>
              <option value="flexo">Flexo</option>
            </select>
          </div>
        </div>

        <!-- CMYK SCTV Block -->
        <div class="sctv-container">
          <div class="sctv-title">
            <span style="width:12px; height:12px; border-radius:3px; background: linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #000000);"></span>
            CMYK SCTV (Tone Value)
          </div>
          <div class="sctv-grid">
            <!-- Cyan -->
            <div class="sctv-row">
              <div class="sctv-label" style="color:#00a3e0;">Cyan</div>
              <div class="sctv-inputs">
                <div class="sctv-field"><label>5%</label><input type="number" step="0.1" placeholder="-" data-target="5" oninput="updateSctvDeviation(this)" id="sctv-c-5"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>10%</label><input type="number" step="0.1" placeholder="-" data-target="10" oninput="updateSctvDeviation(this)" id="sctv-c-10"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>25%</label><input type="number" step="0.1" placeholder="-" data-target="25" oninput="updateSctvDeviation(this)" id="sctv-c-25"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>50%</label><input type="number" step="0.1" placeholder="-" data-target="50" oninput="updateSctvDeviation(this)" id="sctv-c-50"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>75%</label><input type="number" step="0.1" placeholder="-" data-target="75" oninput="updateSctvDeviation(this)" id="sctv-c-75"><span class="sctv-deviation"></span></div>
              </div>
            </div>
            <!-- Magenta -->
            <div class="sctv-row">
              <div class="sctv-label" style="color:#e9008c;">Magenta</div>
              <div class="sctv-inputs">
                <div class="sctv-field"><label>5%</label><input type="number" step="0.1" placeholder="-" data-target="5" oninput="updateSctvDeviation(this)" id="sctv-m-5"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>10%</label><input type="number" step="0.1" placeholder="-" data-target="10" oninput="updateSctvDeviation(this)" id="sctv-m-10"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>25%</label><input type="number" step="0.1" placeholder="-" data-target="25" oninput="updateSctvDeviation(this)" id="sctv-m-25"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>50%</label><input type="number" step="0.1" placeholder="-" data-target="50" oninput="updateSctvDeviation(this)" id="sctv-m-50"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>75%</label><input type="number" step="0.1" placeholder="-" data-target="75" oninput="updateSctvDeviation(this)" id="sctv-m-75"><span class="sctv-deviation"></span></div>
              </div>
            </div>
            <!-- Yellow -->
            <div class="sctv-row">
              <div class="sctv-label" style="color:#ffed00;">Yellow</div>
              <div class="sctv-inputs">
                <div class="sctv-field"><label>5%</label><input type="number" step="0.1" placeholder="-" data-target="5" oninput="updateSctvDeviation(this)" id="sctv-y-5"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>10%</label><input type="number" step="0.1" placeholder="-" data-target="10" oninput="updateSctvDeviation(this)" id="sctv-y-10"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>25%</label><input type="number" step="0.1" placeholder="-" data-target="25" oninput="updateSctvDeviation(this)" id="sctv-y-25"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>50%</label><input type="number" step="0.1" placeholder="-" data-target="50" oninput="updateSctvDeviation(this)" id="sctv-y-50"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>75%</label><input type="number" step="0.1" placeholder="-" data-target="75" oninput="updateSctvDeviation(this)" id="sctv-y-75"><span class="sctv-deviation"></span></div>
              </div>
            </div>
            <!-- Black -->
            <div class="sctv-row">
              <div class="sctv-label" style="color:#000000;">Black</div>
              <div class="sctv-inputs">
                <div class="sctv-field"><label>5%</label><input type="number" step="0.1" placeholder="-" data-target="5" oninput="updateSctvDeviation(this)" id="sctv-k-5"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>10%</label><input type="number" step="0.1" placeholder="-" data-target="10" oninput="updateSctvDeviation(this)" id="sctv-k-10"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>25%</label><input type="number" step="0.1" placeholder="-" data-target="25" oninput="updateSctvDeviation(this)" id="sctv-k-25"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>50%</label><input type="number" step="0.1" placeholder="-" data-target="50" oninput="updateSctvDeviation(this)" id="sctv-k-50"><span class="sctv-deviation"></span></div>
                <div class="sctv-field"><label>75%</label><input type="number" step="0.1" placeholder="-" data-target="75" oninput="updateSctvDeviation(this)" id="sctv-k-75"><span class="sctv-deviation"></span></div>
              </div>
            </div>
          </div>
        </div>

        <div id="nm-colors-container"></div>

        <button class="btn-ghost" style="width:100%;margin-top:4px;" onclick="addColorEntry()" data-en="+ Add color" data-tr="+ Renk ekle">+ Add color</button>
        <div class="modal-actions">
          <button class="btn-ghost" onclick="closeNewMeasurement()" data-en="Cancel" data-tr="Iptal">Cancel</button>
          <button class="btn-primary" onclick="submitNewMeasurement()" data-en="Save" data-tr="Kaydet">Save</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Correction Modal (compact, for re-measuring a single color) -->
  <div id="correction-overlay" class="modal-overlay">
    <div class="modal" style="max-width:380px;">
      <div class="modal-head">
        <span class="modal-title" id="corr-title">Correction</span>
        <button class="modal-close" onclick="closeCorrection()">X</button>
      </div>
      <div class="modal-body">
        <div id="corr-color-preview" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <span id="corr-swatch" class="swatch" style="width:20px;height:20px;border-radius:50%;"></span>
          <span id="corr-color-label" style="font-size:15px;font-weight:600;letter-spacing:-0.02em;"></span>
        </div>
        <input type="hidden" id="corr-job-id">
        <input type="hidden" id="corr-color-name">
        <input type="hidden" id="corr-color-hex">
        <div class="field-row-3">
          <div class="field" style="margin:0;">
            <label>dE2000</label>
            <input type="number" step="0.01" id="corr-de" placeholder="0.00">
          </div>
          <div class="field" style="margin:0;">
            <label>D/S</label>
            <input type="number" step="1" id="corr-ds" placeholder="100">
          </div>
          <div class="field" style="margin:0;">
            <label>dC*</label>
            <input type="number" step="0.01" id="corr-dc" placeholder="0.00">
          </div>
        </div>

        <!-- SCTV fields for CMYK colors -->
        <div id="corr-sctv-container" style="display:none; margin-top:16px; padding-top:16px; border-top:0.5px solid var(--border-subtle);">
          <div style="font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.02em;">SCTV (Tone Value)</div>
          <div class="sctv-inputs">
            <div class="sctv-field"><label>5%</label><input type="number" step="0.1" placeholder="-" data-target="5" oninput="updateSctvDeviation(this)" id="corr-sctv-5"><span class="sctv-deviation"></span></div>
            <div class="sctv-field"><label>10%</label><input type="number" step="0.1" placeholder="-" data-target="10" oninput="updateSctvDeviation(this)" id="corr-sctv-10"><span class="sctv-deviation"></span></div>
            <div class="sctv-field"><label>25%</label><input type="number" step="0.1" placeholder="-" data-target="25" oninput="updateSctvDeviation(this)" id="corr-sctv-25"><span class="sctv-deviation"></span></div>
            <div class="sctv-field"><label>50%</label><input type="number" step="0.1" placeholder="-" data-target="50" oninput="updateSctvDeviation(this)" id="corr-sctv-50"><span class="sctv-deviation"></span></div>
            <div class="sctv-field"><label>75%</label><input type="number" step="0.1" placeholder="-" data-target="75" oninput="updateSctvDeviation(this)" id="corr-sctv-75"><span class="sctv-deviation"></span></div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" onclick="closeCorrection()" data-en="Cancel" data-tr="Iptal">Cancel</button>
          <button class="btn-primary" onclick="submitCorrection()" data-en="Save Correction" data-tr="Korrektur speichern">Save Correction</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Job Detail Modal -->
  <div id="detail-overlay" class="modal-overlay">
    <div class="modal modal-wide">
      <div class="modal-head">
        <span class="modal-title" id="detail-modal-title">Job Detail</span>
        <button class="modal-close" onclick="closeDetail()">X</button>
      </div>
      <div class="modal-body">
        <div id="detail-content"></div>
      </div>
    </div>
  </div>

  ${MetricsModalHTML}

  <!-- Toast -->
  <div id="toast" class="toast"></div>

  <script>
    // ── Globals ──────────────────────────────────────────────────────────
    var currentLang = localStorage.getItem('inkroom_lang') || 'en';
    var currentMeasJobId = null;
    var currentMeasJobTitle = '';
    var jobsLookup = {};

    // ── Language ─────────────────────────────────────────────────────────
    function applyLang(lang) {
      currentLang = lang;
      localStorage.setItem('inkroom_lang', lang);
      document.querySelectorAll('[data-en]').forEach(function(el) {
        el.textContent = el.getAttribute('data-' + lang);
      });
      document.getElementById('lang-en-btn').classList.toggle('active', lang === 'en');
      document.getElementById('lang-tr-btn').classList.toggle('active', lang === 'tr');
    }

    function onLangChange(lang) {
      applyLang(lang);
      if (currentView === 'analytics') loadAnalytics();
      else loadDashboard();
    }
    document.getElementById('lang-en-btn').addEventListener('click', function() { onLangChange('en'); });
    document.getElementById('lang-tr-btn').addEventListener('click', function() { onLangChange('tr'); });

    // ── Toast ─────────────────────────────────────────────────────────────
    function showToast(msg) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(function() { t.classList.remove('show'); }, 2400);
    }

    // ── HTML escaping ─────────────────────────────────────────────────────
    function escapeHtml(str) {
      if (str == null) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ── Tier helpers ──────────────────────────────────────────────────────
    function getTier(de) {
      if (de == null || isNaN(de)) return 'neutral';
      if (de <= 1.0) return 'ok';
      if (de <= 2.0) return 'warn';
      if (de <= 3.0) return 'action';
      return 'crit';
    }

    // ── Pantone datalist ──────────────────────────────────────────────────
    (function buildPantoneList() {
      var base = ["Yellow","Yellow 012","Orange 021","Warm Red","Red 032","Rubine Red","Rhodamine Red","Purple","Violet","Blue 072","Reflex Blue","Process Blue","Green","Black"];
      var nums = ["100","101","102","103","104","105","106","107","108","109","110","111","112","113","114","115","116","117","118","119","120","121","122","123","124","125","126","130","131","132","134","135","136","137","138","139","141","142","143","144","145","146","148","149","150","151","152","153","154","155","156","157","158","159","160","161","162","163","164","165","166","167","168","176","177","178","179","180","181","185","186","187","188","190","191","192","193","194","195","200","201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","218","219","223","224","225","226","227","228","229","230","231","232","233","234","235","236","237","238","239","240","241","242","243","244","245","246","247","248","249","250","251","252","253","254","255","256","257","258","259","260","261","262","263","264","265","266","267","268","269","270","271","272","273","274","275","276","277","278","279","280","281","282","283","284","285","286","287","288","289","290","291","292","293","294","295","296","300","301","302","303","485","COOL GRAY 1","COOL GRAY 2","COOL GRAY 3","COOL GRAY 4","COOL GRAY 5","COOL GRAY 6","COOL GRAY 7","COOL GRAY 8","COOL GRAY 9","COOL GRAY 10","COOL GRAY 11","WARM GRAY 1","WARM GRAY 2","WARM GRAY 3","WARM GRAY 4","WARM GRAY 5","WARM GRAY 6","WARM GRAY 7","WARM GRAY 8","WARM GRAY 9","WARM GRAY 10","WARM GRAY 11"];
      var list = document.getElementById('pantone-list');
      var all = [];
      base.forEach(function(c) { all.push('Pantone ' + c + ' C'); all.push('Pantone ' + c + ' U'); });
      nums.forEach(function(n) { all.push('Pantone ' + n + ' C'); all.push('Pantone ' + n + ' U'); });
      all.sort().forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p;
        list.appendChild(opt);
      });
    })();

    // ── Color row rendering ───────────────────────────────────────────────
    function renderColorRow(c, jobId) {
      var hex = c.color_hex || '#888888';
      var swatchClass = 'swatch';
      var isWhite = hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff';
      if (isWhite) swatchClass += ' swatch-white';

      // 1. Status dE calculation
      var tierDE = getTier(Number(c.de));
      var deClass = 'de-' + tierDE;
      var deVal = c.de != null ? Number(c.de).toFixed(2) : '-';
      var dsNum = Number(c.ds);
      var dsVal = c.ds != null ? dsNum : '-';
      var dsCls = (!isNaN(dsNum) && dsNum <= 100) ? 'density-warn' : '';
      var dcNum = Number(c.delta_c);
      var dcVal = c.delta_c != null ? (dcNum >= 0 ? '+' : '') + dcNum.toFixed(2) : '-';

      // 2. SCTV & Status TV calculation
      var sctvCells = '';
      var maxSctvDev = 0;
      var hasSctv = false;
      [5, 10, 25, 50, 75].forEach(function(targetPct) {
        var val = c['sctv_' + targetPct];
        if (val == null) {
          sctvCells += '<td>-</td>';
        } else {
          hasSctv = true;
          var num = Number(val);
          var diff = num - targetPct;
          var absDiff = Math.abs(diff);
          if (absDiff > maxSctvDev) maxSctvDev = absDiff;
          
          var diffCls = absDiff <= 2.0 ? 'sctv-ok' : (absDiff <= 4.0 ? 'sctv-warn' : 'sctv-crit');
          var diffText = (diff >= 0 ? '+' : '') + diff.toFixed(1);
          sctvCells += '<td>' + num.toFixed(1) + '<br><span class="sctv-diff ' + diffCls + '">' + diffText + '</span></td>';
        }
      });

      var tierTV = 'neutral';
      if (hasSctv) {
        tierTV = maxSctvDev <= 2.0 ? 'ok' : (maxSctvDev <= 4.0 ? 'warn' : 'crit');
      }

      var pillLabels = { ok: { en: 'OK', tr: 'TAMAM' }, warn: { en: 'Warn', tr: 'Uyari' }, action: { en: 'Action', tr: 'Eylem' }, crit: { en: 'Critical', tr: 'Kritik' }, neutral: { en: '-', tr: '-' } };
      var pillTV = pillLabels[tierTV] ? (currentLang === 'tr' ? pillLabels[tierTV].tr : pillLabels[tierTV].en) : '-';
      var pillDE = pillLabels[tierDE] ? (currentLang === 'tr' ? pillLabels[tierDE].tr : pillLabels[tierDE].en) : '-';

      var safeColorName = (c.color_name || '').replace(/'/g, "\\'");
      var safeHex = (hex || '').replace(/'/g, "\\'");
      var sctvData = JSON.stringify({
        sctv_5: c.sctv_5, sctv_10: c.sctv_10, sctv_25: c.sctv_25, sctv_50: c.sctv_50, sctv_75: c.sctv_75
      }).replace(/"/g, '&quot;');
      var clickAttr = jobId ? ' onclick="openCorrection(' + jobId + ",'" + safeColorName + "','" + safeHex + "','" + sctvData + "')" + '" style="cursor:pointer;"' : '';

      return '<tr class="color-row-clickable"' + clickAttr + '>' +
        '<td><span class="' + swatchClass + '" style="background:' + hex + '"></span>' + escapeHtml(c.color_name || '-') + '</td>' +
        '<td><span class="' + deClass + '">' + deVal + '</span></td>' +
        '<td' + (dsCls ? ' class="' + dsCls + '"' : '') + '>' + dsVal + '</td>' +
        '<td>' + dcVal + '</td>' +
        sctvCells +
        '<td><span class="pill pill-' + tierTV + '">' + pillTV + '</span></td>' +
        '<td><span class="pill pill-' + tierDE + '">' + pillDE + '</span></td>' +
        '</tr>';
    }

    // ── Render job tile (single active job, operator-focused) ───────────
    ${renderJobCard}

    // ── Group flat dashboard rows into press->jobs->measurements ─────────
    function groupByPress(rows) {
      var pressMap = {};
      var pressOrder = [];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var pid = r.press_id;
        if (!pressMap[pid]) {
          pressMap[pid] = {
            id: pid,
            name: r.press_name,
            machine: r.press_machine,
            max_colors: r.max_colors,
            status: r.press_status,
            sort_order: r.sort_order,
            jobs: {}
          };
          pressOrder.push(pid);
        }
        if (r.job_id) {
          if (!pressMap[pid].jobs[r.job_id]) {
            pressMap[pid].jobs[r.job_id] = {
              id: r.job_id,
              job_number: r.job_number,
              job_title: r.job_title,
              print_method: r.print_method,
              color_count: r.color_count,
              status: r.job_status,
              setup_start_at: r.setup_start_at,
              first_pull_at: r.first_pull_at,
              prod_start_at: r.prod_start_at,
              curr_units: r.curr_units,
              target_units: r.target_units,
              actual_stops: r.actual_stops,
              actual_waste: r.actual_waste,
              setup_target_min: r.setup_target_min,
              measurements: []
            };
          }
          if (r.color_name) {
            pressMap[pid].jobs[r.job_id].measurements.push({
              color_name: r.color_name,
              color_hex: r.color_hex,
              de: r.de,
              ds: r.ds,
              delta_c: r.delta_c,
              measured_at: r.measured_at
            });
          }
        }
      }
      var result = [];
      for (var k = 0; k < pressOrder.length; k++) {
        var press = pressMap[pressOrder[k]];
        var jobsArr = [];
        var jobKeys = Object.keys(press.jobs);
        for (var j = 0; j < jobKeys.length; j++) {
          var job = press.jobs[jobKeys[j]];
          
          // Ensure CMYK fix rows
          var cmykNames = ['Cyan', 'Magenta', 'Yellow', 'Black'];
          var cmykHex = { 'Cyan': '#00a3e0', 'Magenta': '#e9008c', 'Yellow': '#ffed00', 'Black': '#000000' };
          var finalMeasurements = [];
          
          cmykNames.forEach(function(name) {
            var found = job.measurements.find(function(m) { return m.color_name === name; });
            if (found) {
              finalMeasurements.push(found);
            } else {
              finalMeasurements.push({ color_name: name, color_hex: cmykHex[name], de: null, ds: null, delta_c: null });
            }
          });
          
          // Add other spot colors
          job.measurements.forEach(function(m) {
            if (!cmykNames.includes(m.color_name)) {
              finalMeasurements.push(m);
            }
          });
          
          job.measurements = finalMeasurements;
          jobsArr.push(job);
        }
        result.push({
          id: press.id,
          name: press.name,
          machine: press.machine,
          max_colors: press.max_colors,
          status: press.status,
          sort_order: press.sort_order,
          jobs: jobsArr
        });
      }
      return result;
    }

    // ── Render dashboard ──────────────────────────────────────────────────
    function renderPerfBadge(perfData, label) {
      if (!perfData) return '<span class="perf-badge perf-none">' + label + ': —</span>';
      var rate = perfData.rate;
      var tier = rate >= 80 ? 'ok' : (rate >= 60 ? 'warn' : (rate >= 40 ? 'action' : 'crit'));
      return '<span class="perf-badge perf-' + tier + '">' + label + ': ' + rate + '% <small>(' + perfData.pass + '/' + perfData.total + ')</small></span>';
    }

    function renderDashboard(data) {
      var container = document.getElementById('dashboard');
      var presses = data.presses || [];
      // Cache presses for New Job modal capacity validation
      window._pressesCache = presses;

      if (presses.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:80px 24px;">' +
          '<p style="font-size:19px;font-weight:600;letter-spacing:-0.025em;margin-bottom:8px;">' +
          (currentLang === 'tr' ? 'Baskı makinesi bulunamadi' : 'No presses found') + '</p>' +
          '<p style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">' +
          (currentLang === 'tr' ? 'Once /api/migrate adresini calistirin.' : 'Run /api/migrate first to set up presses.') + '</p>' +
          '</div>';
        return;
      }

      jobsLookup = {};
      var html = '';

      for (var pi = 0; pi < presses.length; pi++) {
        var press = presses[pi];
        var perf = press.perf || {};

        html += '<div class="press-section">';
        html += '<div class="press-header">';
        html += '<div class="press-header-left">';
        html += '<span class="press-name">' + (press.name || '') + '</span>';
        html += '<span class="press-machine">' + (press.machine || '') + ' — ' + (press.max_colors || 8) + ' ' + (currentLang === 'tr' ? 'renk' : 'color') + '</span>';
        html += '</div>';
        html += '<div class="press-perf">';
        html += renderPerfBadge(perf.h24, currentLang === 'tr' ? '24s' : '24h');
        html += renderPerfBadge(perf.d7, currentLang === 'tr' ? '7g' : '7d');
        html += renderPerfBadge(perf.d30, currentLang === 'tr' ? '30g' : '30d');
        html += '<button class="btn-ghost" style="padding:3px 12px;font-size:11px;" onclick="openNewJobModal(' + press.id + ')">+ ' + (currentLang === 'tr' ? 'Neuer Job' : 'New Job') + '</button>';
        html += '</div>';
        html += '</div>';

        html += '<div class="press-row">';

        // Only show the most recent (current) job
        var jobs = press.jobs || [];
        if (jobs.length === 0) {
          // No active job — show add card full width
          var addLabel = currentLang === 'tr' ? 'Yeni is ekle' : 'Add new job';
          html += '<div class="add-card" style="flex:1;max-width:none;min-height:200px;" onclick="openNewJobModal(' + press.id + ')">';
          html += '<div class="add-icon-circle">+</div>';
          html += '<span class="add-card-label">' + addLabel + '</span>';
          html += '</div>';
        } else {
          var job = jobs[0]; // current/latest job
          jobsLookup[job.id] = job;
          html += renderJobCard(job);
        }

        html += '</div>'; // press-row
        html += '</div>'; // press-section
      }

      container.innerHTML = html;
    }

    // ── Load dashboard ────────────────────────────────────────────────────
    async function loadDashboard() {
      try {
        var res = await fetch('/api/dashboard');
        if (!res.ok) {
          console.error('Dashboard API error:', res.status);
          renderDashboard({ presses: [] });
          return;
        }
        var data = await res.json();
        renderDashboard(data);
      } catch (e) {
        console.error('Failed to load dashboard:', e);
        renderDashboard({ presses: [] });
      }
    }

    // ── New Job modal ─────────────────────────────────────────────────────
    function openNewJobModal(pressId) {
      document.getElementById('nj-press-id').value = pressId || '';
      document.getElementById('nj-number').value = '';
      document.getElementById('nj-title').value = '';
      var cont = document.getElementById('nj-colors-container');
      if(cont) cont.innerHTML = '';
      addJobColorEntry();
      document.getElementById('nj-target').value = '';

      // Reset recipe toggles
      var whiteToggle = document.getElementById('nj-white-toggle');
      var cmykToggle = document.getElementById('nj-cmyk-toggle');
      var varnishToggle = document.getElementById('nj-varnish-toggle');
      if (whiteToggle) whiteToggle.classList.remove('active');
      if (cmykToggle) cmykToggle.classList.remove('active');
      if (varnishToggle) varnishToggle.classList.remove('active');
      document.getElementById('nj-white-row').classList.remove('is-active');
      document.getElementById('nj-cmyk-row').classList.remove('is-active');
      document.getElementById('nj-varnish-row').classList.remove('is-active');

      // Get max_colors for this press from dashboard data
      var maxColors = 8;
      if (pressId && window._pressesCache) {
        for (var i = 0; i < window._pressesCache.length; i++) {
          if (window._pressesCache[i].id == pressId) {
            maxColors = window._pressesCache[i].max_colors || 8;
            break;
          }
        }
      }
      document.getElementById('nj-max-colors').value = maxColors;
      document.getElementById('nj-pu-status').setAttribute('data-max', maxColors);
      document.getElementById('nj-pu-status').setAttribute('data-press-id', pressId);

      updatePrintUnitDisplay();
      document.getElementById('new-job-overlay').classList.add('open');
      setTimeout(function() { document.getElementById('nj-number').focus(); }, 80);
    }

    function closeNewJobModal() {
      document.getElementById('new-job-overlay').classList.remove('open');
    }

    function toggleRecipe(type) {
      var toggle = document.getElementById('nj-' + type + '-toggle');
      var row = document.getElementById('nj-' + type + '-row');
      toggle.classList.toggle('active');
      row.classList.toggle('is-active');
      updatePrintUnitDisplay();
    }

    function calculatePrintUnits() {
      var units = 0;
      var parts = [];
      var whiteOn = document.getElementById('nj-white-toggle').classList.contains('active');
      var cmykOn = document.getElementById('nj-cmyk-toggle').classList.contains('active');
      var varnishOn = document.getElementById('nj-varnish-toggle').classList.contains('active');
      if (whiteOn) { units += 1; parts.push('W:1'); }
      if (cmykOn)  { units += 4; parts.push('CMYK:4'); }
      var spotInputs = document.querySelectorAll('#nj-colors-container .nj-color-name');
      var spotCount = 0;
      for (var i = 0; i < spotInputs.length; i++) {
        if (spotInputs[i].value.trim()) spotCount++;
      }
      if (spotCount > 0) { units += spotCount; parts.push('Spot:' + spotCount); }
      if (varnishOn) { units += 1; parts.push('V:1'); }
      return { total: units, parts: parts, hasWhite: whiteOn, hasCmyk: cmykOn, hasVarnish: varnishOn, spotCount: spotCount };
    }

    function updatePrintUnitDisplay() {
      var calc = calculatePrintUnits();
      document.getElementById('nj-pu-value').textContent = calc.total;
      document.getElementById('nj-pu-breakdown').textContent = calc.parts.length > 0 ? calc.parts.join(' + ') : (currentLang === 'tr' ? 'Seçim yok' : 'No selection');
      
      var maxColors = parseInt(document.getElementById('nj-pu-status').getAttribute('data-max') || 8);
      var statusEl = document.getElementById('nj-pu-status');
      
      // Setup Time Calculation: (Prev_Units + New_Units) * 2
      var prevUnits = 8; // Default
      var pressId = document.getElementById('nj-pu-status').getAttribute('data-press-id');
      if (pressId && window._pressesCache) {
        var press = window._pressesCache.find(function(p) { return p.id == pressId; });
        if (press && press.jobs) {
          var jobKeys = Object.keys(press.jobs);
          if (jobKeys.length > 0) {
            // Get the most recent job's units
            var lastJob = press.jobs[jobKeys[jobKeys.length - 1]];
            prevUnits = lastJob.print_units || lastJob.color_count || 8;
          }
        }
      }
      var targetMin = (prevUnits + calc.total) * 2;
      document.getElementById('nj-setup-target').textContent = targetMin + ' Min';
      document.getElementById('nj-setup-target').setAttribute('data-val', targetMin);

      if (calc.total > maxColors) {
        statusEl.textContent = '⚠ ' + (currentLang === 'tr' ? 'Kapasite aşıldı' : 'Exceeds capacity');
        statusEl.className = 'pu-status pu-status-warn';
      } else if (calc.total > 0) {
        statusEl.textContent = '✓ OK';
        statusEl.className = 'pu-status pu-status-ok';
      } else {
        statusEl.textContent = '';
        statusEl.className = 'pu-status';
      }
    }

    async function submitNewJob() {
      var job_number = document.getElementById('nj-number').value.trim();
      var job_title = document.getElementById('nj-title').value.trim();
      var colors_arr = [];
      var colorInputs = document.querySelectorAll('#nj-colors-container .nj-color-name');
      for (var i = 0; i < colorInputs.length; i++) {
        var val = colorInputs[i].value.trim();
        if (val) colors_arr.push(val);
      }
      var target_units = parseInt(document.getElementById('nj-target').value) || 0;
      var press_id = parseInt(document.getElementById('nj-press-id').value) || null;
      var calc = calculatePrintUnits();
      var setupTargetMin = parseInt(document.getElementById('nj-setup-target').getAttribute('data-val')) || 0;

      if (!job_number || !job_title) {
        showToast(currentLang === 'tr' ? 'İş numarası ve başlığı gereklidir' : 'Job number and title are required');
        return;
      }

      // Warn if exceeding capacity (but allow override)
      var maxColors = parseInt(document.getElementById('nj-max-colors').value) || 8;
      if (calc.total > maxColors) {
        if (!confirm((currentLang === 'tr'
          ? 'Achtung: ' + calc.total + ' Druckwerke benötigt, aber Maschine hat nur ' + maxColors + '. Trotzdem erstellen?'
          : 'Warning: ' + calc.total + ' print units required, but machine only supports ' + maxColors + '. Create anyway?'))) {
          return;
        }
      }

      try {
        var res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_number: job_number,
            job_title: job_title,
            colors: colors_arr,
            color_count: colors_arr.length,
            press_id: press_id,
            target_units: target_units,
            has_white: calc.hasWhite ? 1 : 0,
            has_cmyk: calc.hasCmyk ? 1 : 0,
            has_varnish: calc.hasVarnish ? 1 : 0,
            print_units: calc.total,
            setup_target_min: setupTargetMin
          })
        });
        var data = await res.json();
        if (data.error) { showToast('Error: ' + data.error); return; }
        closeNewJobModal();
        showToast(currentLang === 'tr' ? 'Job erstellt' : 'Job created');
        loadDashboard();
      } catch (e) {
        showToast(currentLang === 'tr' ? 'Fehler aufgetreten' : 'An error occurred');
      }
    }

    function addJobColorEntry() {
      var container = document.getElementById('nj-colors-container');
      var entry = document.createElement('div');
      entry.className = 'color-entry';
      var colorLabel = currentLang === 'tr' ? 'z.B. Pantone 485 C' : 'e.g. Pantone 485 C';
      entry.innerHTML =
        '<button class="remove-color-btn" onclick="removeJobColorEntry(this)" title="Remove">✕</button>' +
        '<div class="color-entry-head" style="margin-bottom:0;">' +
          '<div style="flex:1;">' +
            '<input type="text" list="pantone-list" class="nj-color-name" placeholder="' + colorLabel + '" style="width:100%;font-family:var(--font);font-size:14px;color:var(--text-primary);background:rgba(0,0,0,0.03);border:0.5px solid rgba(0,0,0,0.12);border-radius:10px;padding:8px 12px;outline:none;">' +
          '</div>' +
        '</div>';

      var nameInput = entry.querySelector('.nj-color-name');
      nameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addJobColorEntry();
        }
      });
      nameInput.addEventListener('input', function() {
        updatePrintUnitDisplay();
      });
      container.appendChild(entry);
      
      if (container.children.length > 1) {
        setTimeout(function() { nameInput.focus(); }, 20);
      }
      updatePrintUnitDisplay();
    }

    function removeJobColorEntry(btn) {
      var container = document.getElementById('nj-colors-container');
      btn.closest('.color-entry').remove();
      updatePrintUnitDisplay();
    }

    // ── New Measurement modal (deprecated/legacy fallback) ────────────────
    function openNewMeasurement(jobId) {
      currentMeasJobId = jobId;
      var jobTitle = (jobsLookup[jobId] && jobsLookup[jobId].job_title) || '';
      currentMeasJobTitle = jobTitle;
      document.getElementById('new-meas-title').textContent = jobTitle || (currentLang === 'tr' ? 'Yeni Olcum' : 'New Measurement');
      var savedMachine = localStorage.getItem('inkroom_machine') || '';
      document.getElementById('nm-machine').value = savedMachine;
      var container = document.getElementById('nm-colors-container');
      container.innerHTML = '';
      addColorEntry();
      document.getElementById('new-meas-overlay').classList.add('open');
    }

    function closeNewMeasurement() {
      document.getElementById('new-meas-overlay').classList.remove('open');
      currentMeasJobId = null;
      // Clear SCTV inputs
      document.querySelectorAll('.sctv-field input').forEach(function(el) { el.value = ''; updateSctvDeviation(el); });
    }

    function updateSctvDeviation(el) {
      var val = parseFloat(el.value);
      var target = parseFloat(el.getAttribute('data-target'));
      var devEl = el.nextElementSibling;
      if (isNaN(val)) {
        devEl.style.display = 'none';
        return;
      }
      var dev = val - target;
      devEl.textContent = (dev >= 0 ? '+' : '') + dev.toFixed(1);
      devEl.style.color = Math.abs(dev) <= 2.0 ? '#1d7324' : '#c62828';
      devEl.style.display = 'block';
    }


    function addColorEntry() {
      var container = document.getElementById('nm-colors-container');
      var entry = document.createElement('div');
      entry.className = 'color-entry';
      var colorLabel = currentLang === 'tr' ? 'Renk adi' : 'Color name';
      entry.innerHTML =
        '<button class="remove-color-btn" onclick="removeColorEntry(this)" title="Remove">x</button>' +
        '<div class="color-entry-head">' +
          '<input type="color" value="#888888" title="Color hex">' +
          '<div style="flex:1;">' +
            '<input type="text" list="pantone-list" placeholder="' + colorLabel + '" style="width:100%;font-family:var(--font);font-size:14px;color:var(--text-primary);background:rgba(0,0,0,0.03);border:0.5px solid rgba(0,0,0,0.12);border-radius:10px;padding:8px 12px;outline:none;">' +
          '</div>' +
        '</div>' +
        '<div class="field-row-3">' +
          '<div class="field" style="margin:0;"><label>dE2000</label><input type="number" step="0.01" placeholder="0.00" class="nm-de" style="width:100%;font-family:var(--font);font-size:14px;color:var(--text-primary);background:rgba(0,0,0,0.03);border:0.5px solid rgba(0,0,0,0.12);border-radius:10px;padding:8px 12px;outline:none;"></div>' +
          '<div class="field" style="margin:0;"><label>D/S</label><input type="number" step="1" placeholder="100" class="nm-ds" style="width:100%;font-family:var(--font);font-size:14px;color:var(--text-primary);background:rgba(0,0,0,0.03);border:0.5px solid rgba(0,0,0,0.12);border-radius:10px;padding:8px 12px;outline:none;"></div>' +
          '<div class="field" style="margin:0;"><label>dC*</label><input type="number" step="0.01" placeholder="0.00" class="nm-dc" style="width:100%;font-family:var(--font);font-size:14px;color:var(--text-primary);background:rgba(0,0,0,0.03);border:0.5px solid rgba(0,0,0,0.12);border-radius:10px;padding:8px 12px;outline:none;"></div>' +
        '</div>';

      var dcInput = entry.querySelector('.nm-dc');
      dcInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addColorEntry();
          var entries = document.getElementById('nm-colors-container').children;
          var lastEntry = entries[entries.length - 1];
          var nameInput = lastEntry.querySelector('input[list="pantone-list"]');
          if (nameInput) nameInput.focus();
        }
      });

      container.appendChild(entry);
      var nameInput = entry.querySelector('input[list="pantone-list"]');
      if (nameInput) setTimeout(function() { nameInput.focus(); }, 50);
    }

    function removeColorEntry(btn) {
      var container = document.getElementById('nm-colors-container');
      if (container.children.length <= 1) return;
      btn.closest('.color-entry').remove();
    }

    async function submitNewMeasurement() {
      if (!currentMeasJobId) return;
      var machine = document.getElementById('nm-machine').value.trim();
      var process_type = document.getElementById('nm-process').value;
      if (machine) localStorage.setItem('inkroom_machine', machine);

      var entries = document.getElementById('nm-colors-container').querySelectorAll('.color-entry');
      var colors = [];
      entries.forEach(function(entry) {
        var color_hex = entry.querySelector('input[type="color"]').value;
        var color_name = entry.querySelector('input[list="pantone-list"]').value.trim();
        var de = parseFloat(entry.querySelector('.nm-de').value);
        var ds = parseFloat(entry.querySelector('.nm-ds').value);
        var delta_c = parseFloat(entry.querySelector('.nm-dc').value);
        if (color_name) {
          colors.push({ color_name: color_name, color_hex: color_hex, de: isNaN(de) ? null : de, ds: isNaN(ds) ? null : ds, delta_c: isNaN(delta_c) ? null : delta_c, machine: machine, process_type: process_type });
        }
      });

      // Gather SCTV values for fixed process colors (separately)
      var cmykInfo = {
        'c': { name: 'Cyan', hex: '#00a3e0' },
        'm': { name: 'Magenta', hex: '#e9008c' },
        'y': { name: 'Yellow', hex: '#ffed00' },
        'k': { name: 'Black', hex: '#000000' }
      };

      Object.keys(cmykInfo).forEach(function(p) {
        var sctvValues = {};
        var hasSctv = false;
        [5,10,25,50,75].forEach(function(v) {
          var val = parseFloat(document.getElementById('sctv-' + p + '-' + v).value);
          if (!isNaN(val)) {
            sctvValues['sctv_' + v] = val;
            hasSctv = true;
          }
        });
        
        if (hasSctv) {
          colors.push(Object.assign({ 
            color_name: cmykInfo[p].name, 
            color_hex: cmykInfo[p].hex, 
            de: 0, ds: 100, delta_c: 0, 
            machine: machine, process_type: process_type 
          }, sctvValues));
        }
      });

      if (colors.length === 0) {
        showToast(currentLang === 'tr' ? 'En az bir renk veya SCTV girin' : 'Enter at least one color or SCTV');
        return;
      }

      try {

        for (var i = 0; i < colors.length; i++) {

          await fetch('/api/jobs/' + currentMeasJobId + '/measurements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(colors[i])
          });
        }
        closeNewMeasurement();
        showToast(currentLang === 'tr' ? 'Olcumler kaydedildi' : 'Measurements saved');
        loadDashboard();
      } catch (e) {
        showToast(currentLang === 'tr' ? 'Hata olustu' : 'An error occurred');
      }
    }

    // ── Job detail modal ──────────────────────────────────────────────────
    var currentDetailJobId = null;

    async function openJobDetail(jobId) {
      document.getElementById('detail-overlay').classList.add('open');
      currentDetailJobId = jobId;
      document.getElementById('detail-content').innerHTML = '<p style="padding:16px;color:var(--text-secondary);font-size:13px;">' + (currentLang === 'tr' ? 'Yukleniyor...' : 'Loading...') + '</p>';
      try {
        var job = jobsLookup[jobId] || {};
        document.getElementById('detail-modal-title').textContent = (job.job_number || '') + ' — ' + (job.job_title || '');

        var res = await fetch('/api/jobs/' + jobId + '/history');
        var data = await res.json();

        if (data.error) {
          var errEl = document.createElement('p'); errEl.style.cssText = 'color:#c62828;font-size:13px;'; errEl.textContent = data.error; document.getElementById('detail-content').replaceChildren(errEl);
          return;
        }

        var colors = data.colors || {};
        var colorOrder = data.colorOrder || [];

        var html = '';

        var tsToDate = function(ts) { return new Date(ts + (ts.endsWith('Z')?'':'Z')); };
        var msToMin = function(ms) { return Math.max(0, ms / 1000 / 60); };

        var status = job.job_state || 'ready';
        var cc = job.color_count || 0;
        var targetMin = cc * 2;
        
        var mechHtml = '';
        if (status !== 'ready' && job.setup_start_at) {
          var setupStart = tsToDate(job.setup_start_at);
          var setupEnd = job.first_pull_at ? tsToDate(job.first_pull_at) : new Date();
          var mechMin = msToMin(setupEnd - setupStart);
          var mechDiff = Math.round(mechMin - targetMin);
          var isMechOk = mechDiff <= 0;
          var mechText = isMechOk ? 'OK (' + Math.round(mechMin) + ' Min)' : '+' + mechDiff + ' Min Delay';
          mechHtml = '<div style="flex:1; background:' + (isMechOk ? '#e8f5e9' : '#ffebee') + '; border:1px solid ' + (isMechOk ? '#a5d6a7' : '#ef9a9a') + '; border-radius:8px; padding:12px;">' +
            '<div style="font-size:10px; font-weight:600; color:' + (isMechOk ? '#2e7d32' : '#c62828') + '; margin-bottom:4px;">MECH SETUP</div>' +
            '<div style="font-size:14px; font-weight:700; color:' + (isMechOk ? '#1b5e20' : '#b71c1c') + ';">' + mechText + '</div></div>';
        } else {
          mechHtml = '<div style="flex:1; background:var(--bg-secondary); border:1px solid var(--border); border-radius:8px; padding:12px; opacity:0.6;">' +
            '<div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">MECH SETUP</div>' +
            '<div style="font-size:14px; font-weight:700; color:var(--text-primary);">-</div></div>';
        }

        var adminHtml = '';
        var stops = job.actual_stops || 0;
        var waste = job.actual_waste || 0;
        if ((status === 'andruck' || status === 'active' || status === 'completed') && job.first_pull_at) {
          var fpStart = tsToDate(job.first_pull_at);
          var fpEnd = job.production_start_at ? tsToDate(job.production_start_at) : new Date();
          var adminMin = msToMin(fpEnd - fpStart);
          var adminOk = stops <= 2 && waste <= 1000 && adminMin <= 20;
          var devText = [];
          if (adminMin > 20) devText.push('+' + Math.round(adminMin - 20) + ' Min');
          if (stops > 2) devText.push('+' + (stops - 2) + ' Stops');
          if (waste > 1000) devText.push('+' + (waste - 1000) + 'm Waste');
          var adminText = adminOk ? 'OK (' + Math.round(adminMin) + 'm)' : devText.join(', ');
          
          adminHtml = '<div style="flex:1; background:' + (adminOk ? '#e8f5e9' : '#ffebee') + '; border:1px solid ' + (adminOk ? '#a5d6a7' : '#ef9a9a') + '; border-radius:8px; padding:12px;">' +
            '<div style="font-size:10px; font-weight:600; color:' + (adminOk ? '#2e7d32' : '#c62828') + '; margin-bottom:4px;">ADMIN (ANDRUCK)</div>' +
            '<div style="font-size:13px; font-weight:700; color:' + (adminOk ? '#1b5e20' : '#b71c1c') + ';">' + adminText + '</div></div>';
        } else {
          adminHtml = '<div style="flex:1; background:var(--bg-secondary); border:1px solid var(--border); border-radius:8px; padding:12px; opacity:0.6;">' +
            '<div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">ADMIN (ANDRUCK)</div>' +
            '<div style="font-size:14px; font-weight:700; color:var(--text-primary);">-</div></div>';
        }

        var prodHtml = '';
        var units = job.curr_units || 0;
        // production target speeds
        if ((status === 'active' || status === 'completed') && job.production_start_at) {
          var pStart = tsToDate(job.production_start_at);
          var pEnd = job.completed_at ? tsToDate(job.completed_at) : new Date();
          var pMin = msToMin(pEnd - pStart);
          var speed = pMin > 0 ? Math.round(units / pMin) : 0;
          var speedOk = speed >= 300;
          prodHtml = '<div style="flex:1; background:' + (speedOk ? '#e8f5e9' : (speed >= 200 ? '#fff3e0' : '#ffebee')) + '; border:1px solid ' + (speedOk ? '#a5d6a7' : (speed >= 200 ? '#ffcc80' : '#ef9a9a')) + '; border-radius:8px; padding:12px;">' +
            '<div style="font-size:10px; font-weight:600; color:' + (speedOk ? '#2e7d32' : (speed >= 200 ? '#e65100' : '#c62828')) + '; margin-bottom:4px;">PROD SPEED</div>' +
            '<div style="font-size:14px; font-weight:700; color:' + (speedOk ? '#1b5e20' : (speed >= 200 ? '#e65100' : '#b71c1c')) + ';">' + speed + ' m/min</div></div>';
        } else {
          prodHtml = '<div style="flex:1; background:var(--bg-secondary); border:1px solid var(--border); border-radius:8px; padding:12px; opacity:0.6;">' +
            '<div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">PROD SPEED</div>' +
            '<div style="font-size:14px; font-weight:700; color:var(--text-primary);">-</div></div>';
        }

        html += '<div style="display:flex; gap:12px; margin:16px;">' + mechHtml + adminHtml + prodHtml + '</div>';

        if (colorOrder.length === 0) {
          html += '<p style="color:var(--text-tertiary);font-size:13px;padding:20px 0;">' + (currentLang === 'tr' ? 'Henuz olcum yok.' : 'No measurements yet.') + '</p>';
        } else {
          for (var ci = 0; ci < colorOrder.length; ci++) {
            var colorName = colorOrder[ci];
            var rows = colors[colorName] || [];
            var lastHex = '#888888';
            for (var ri = rows.length - 1; ri >= 0; ri--) { if (rows[ri].color_hex) { lastHex = rows[ri].color_hex; break; } }

            html += '<div class="detail-color-group">';
            html += '<div class="detail-color-name" style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div><span class="swatch" style="background:' + lastHex + '"></span>' + escapeHtml(colorName) + '</div>' +
                    '<div style="font-weight:normal;">' +
                      '<a onclick="renameJobColor(' + jobId + ', &quot;' + escapeHtml(colorName) + '&quot;)" style="cursor:pointer; margin-right:16px; font-size:14px; opacity:0.6;" title="' + (currentLang === 'tr' ? 'Düzenle' : 'Edit') + '">✏️</a>' +
                      '<a onclick="deleteJobColor(' + jobId + ', &quot;' + escapeHtml(colorName) + '&quot;)" style="cursor:pointer; font-size:14px; opacity:0.6;" title="' + (currentLang === 'tr' ? 'Sil' : 'Delete') + '">🗑️</a>' +
                    '</div></div>';
            html += '<table class="detail-table"><thead><tr>';
            html += '<th>#</th><th>dE</th><th>D/S</th><th>dC*</th>';
            html += '<th>' + (currentLang === 'tr' ? 'Durum' : 'Status') + '</th>';
            html += '<th>' + (currentLang === 'tr' ? 'Zaman' : 'Time') + '</th>';
            html += '<th></th>';
            html += '</tr></thead><tbody>';

            for (var mi = 0; mi < rows.length; mi++) {
              var m = rows[mi];
              var seq = m.measurement_seq || 1;
              var tier = getTier(Number(m.de));
              var deClass = 'de-' + tier;
              var deVal = m.de != null ? Number(m.de).toFixed(2) : '-';
              var dsVal = m.ds != null ? Number(m.ds) : '-';
              var dsNum = Number(m.ds);
              var dsCls = (!isNaN(dsNum) && dsNum <= 100) ? ' class="density-warn"' : '';
              var dcNum = Number(m.delta_c);
              var dcVal = m.delta_c != null ? (dcNum >= 0 ? '+' : '') + dcNum.toFixed(2) : '-';
              var pillLabels = { ok: { en: 'OK', tr: 'TAMAM' }, warn: { en: 'Warn', tr: 'Uyari' }, action: { en: 'Action', tr: 'Eylem' }, crit: { en: 'Critical', tr: 'Kritik' }, neutral: { en: '-', tr: '-' } };
              var pillText = pillLabels[tier] ? (currentLang === 'tr' ? pillLabels[tier].tr : pillLabels[tier].en) : '-';

              // Format timestamp
              var timeStr = '-';
              if (m.created_at) {
                try {
                  var dt = new Date(m.created_at + 'Z');
                  timeStr = String(dt.getDate()).padStart(2,'0') + '.' + String(dt.getMonth()+1).padStart(2,'0') + ' ' + String(dt.getHours()).padStart(2,'0') + ':' + String(dt.getMinutes()).padStart(2,'0');
                } catch(e) {}
              }

              // Edited indicator
              var editedHtml = '';
              if (m.edited_at) {
                try {
                  var oldVals = JSON.parse(m.edited_from || '{}');
                  var editDt = new Date(m.edited_at + 'Z');
                  var editTime = String(editDt.getDate()).padStart(2,'0') + '.' + String(editDt.getMonth()+1).padStart(2,'0') + ' ' + String(editDt.getHours()).padStart(2,'0') + ':' + String(editDt.getMinutes()).padStart(2,'0');
                  editedHtml = '<div class="edit-trail">' + (currentLang === 'tr' ? 'Duzenlendi' : 'Edited') + ' ' + editTime;
                  if (oldVals.de != null) editedHtml += ' <s>dE ' + Number(oldVals.de).toFixed(2) + '</s>';
                  if (oldVals.ds != null) editedHtml += ' <s>D/S ' + oldVals.ds + '</s>';
                  if (oldVals.delta_c != null) editedHtml += ' <s>dC* ' + Number(oldVals.delta_c).toFixed(2) + '</s>';
                  editedHtml += '</div>';
                } catch(e) {}
              }

              var seqLabel = seq === 1 ? '<span class="seq-badge seq-first">#1</span>' : '<span class="seq-badge">#' + seq + '</span>';

              html += '<tr id="mrow-' + m.id + '">';
              html += '<td>' + seqLabel + '</td>';
              html += '<td><span class="' + deClass + '" id="mde-' + m.id + '">' + deVal + '</span></td>';
              html += '<td' + dsCls + ' id="mds-' + m.id + '">' + dsVal + '</td>';
              html += '<td id="mdc-' + m.id + '">' + dcVal + '</td>';
              html += '<td><span class="pill pill-' + tier + '">' + pillText + '</span></td>';
              html += '<td class="td-time">' + timeStr + editedHtml + '</td>';
              html += '<td><a class="edit-link" onclick="startEditRow(' + m.id + ', ' + (m.de||0) + ', ' + (m.ds||0) + ', ' + (m.delta_c||0) + ')">' + (currentLang === 'tr' ? 'Duzenle' : 'Edit') + '</a></td>';
              html += '</tr>';
            }

            html += '</tbody></table>';
            html += '</div>';
          }
        }

        html += '<div style="margin-top:20px;display:flex;gap:10px;">';
        html += '<button class="btn-primary" onclick="closeDetail();openNewMeasurement(' + jobId + ');">' + (currentLang === 'tr' ? '+ Yeni Olcum' : '+ New Measurement') + '</button>';
        html += '</div>';

        document.getElementById('detail-content').innerHTML = html;
      } catch (e) {
        var errEl2 = document.createElement('p'); errEl2.style.cssText = 'color:#c62828;font-size:13px;'; errEl2.textContent = 'Error: ' + e.message; document.getElementById('detail-content').replaceChildren(errEl2);
      }
    }

    function startEditRow(id, de, ds, dc) {
      var row = document.getElementById('mrow-' + id);
      if (!row) return;
      var deCell = document.getElementById('mde-' + id);
      var dsCell = document.getElementById('mds-' + id);
      var dcCell = document.getElementById('mdc-' + id);
      if (!deCell || !dsCell || !dcCell) return;

      deCell.innerHTML = '<input type="number" step="0.01" value="' + de + '" id="ede-' + id + '" style="width:60px;font-size:12px;padding:3px 6px;border:0.5px solid var(--border);border-radius:6px;font-family:var(--font);">';
      dsCell.innerHTML = '<input type="number" step="1" value="' + ds + '" id="eds-' + id + '" style="width:60px;font-size:12px;padding:3px 6px;border:0.5px solid var(--border);border-radius:6px;font-family:var(--font);">';
      dcCell.innerHTML = '<input type="number" step="0.01" value="' + dc + '" id="edc-' + id + '" style="width:60px;font-size:12px;padding:3px 6px;border:0.5px solid var(--border);border-radius:6px;font-family:var(--font);">';

      // Replace edit link with save/cancel
      var lastTd = row.querySelector('td:last-child');
      lastTd.innerHTML = '<a class="edit-link save-link" onclick="saveEditRow(' + id + ')">' + (currentLang === 'tr' ? 'Kaydet' : 'Save') + '</a>' +
        ' <a class="edit-link" onclick="openJobDetail(currentDetailJobId)" style="color:var(--text-tertiary);">' + (currentLang === 'tr' ? 'Iptal' : 'Cancel') + '</a>';
    }

    async function saveEditRow(id) {
      var de = parseFloat(document.getElementById('ede-' + id).value);
      var ds = parseFloat(document.getElementById('eds-' + id).value);
      var dc = parseFloat(document.getElementById('edc-' + id).value);

      try {
        var res = await fetch('/api/benchmarks/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ de: de, ds: ds, delta_c: dc })
        });
        var data = await res.json();
        if (data.ok) {
          showToast(currentLang === 'tr' ? 'Degerler guncellendi' : 'Values updated');
          openJobDetail(currentDetailJobId);
          loadDashboard();
        } else {
          showToast('Error: ' + (data.error || 'Unknown'));
        }
      } catch(e) {
        showToast('Error saving');
      }
    }

    function closeDetail() {
      document.getElementById('detail-overlay').classList.remove('open');
    }

    // ── Correction modal (re-measure a single color) ──────────────────────
    function openCorrection(jobId, colorName, colorHex, sctvDataJson) {
      document.getElementById('corr-job-id').value = jobId;
      document.getElementById('corr-color-name').value = colorName;
      document.getElementById('corr-color-hex').value = colorHex || '#888888';
      document.getElementById('corr-swatch').style.background = colorHex || '#888888';
      document.getElementById('corr-color-label').textContent = colorName;
      document.getElementById('corr-title').textContent = (currentLang === 'tr' ? 'Korrektur: ' : 'Correction: ') + colorName;
      document.getElementById('corr-de').value = '';
      document.getElementById('corr-ds').value = '';
      document.getElementById('corr-dc').value = '';
      
      // SCTV Handling
      var sctvContainer = document.getElementById('corr-sctv-container');
      var isCmyk = ['Cyan', 'Magenta', 'Yellow', 'Black'].includes(colorName);
      sctvContainer.style.display = isCmyk ? 'block' : 'none';
      
      if (isCmyk && sctvDataJson) {
        try {
          var sctv = JSON.parse(sctvDataJson);
          [5, 10, 25, 50, 75].forEach(function(v) {
            var input = document.getElementById('corr-sctv-' + v);
            input.value = sctv['sctv_' + v] || '';
            updateSctvDeviation(input);
          });
        } catch(e) {}
      } else {
        [5, 10, 25, 50, 75].forEach(function(v) { document.getElementById('corr-sctv-' + v).value = ''; });
      }

      document.getElementById('correction-overlay').classList.add('open');
      setTimeout(function() { document.getElementById('corr-de').focus(); }, 80);
    }

    function closeCorrection() {
      document.getElementById('correction-overlay').classList.remove('open');
    }

    async function submitCorrection() {
      var jobId = document.getElementById('corr-job-id').value;
      var colorName = document.getElementById('corr-color-name').value;
      var colorHex = document.getElementById('corr-color-hex').value;
      var de = parseFloat(document.getElementById('corr-de').value);
      var ds = parseFloat(document.getElementById('corr-ds').value);
      var dc = parseFloat(document.getElementById('corr-dc').value);

      if (isNaN(de)) {
        showToast(currentLang === 'tr' ? 'dE deger gerekli' : 'dE value required');
        return;
      }

      var payload = {
        color_name: colorName,
        color_hex: colorHex,
        de: de,
        ds: isNaN(ds) ? null : ds,
        delta_c: isNaN(dc) ? null : dc,
        machine: localStorage.getItem('inkroom_machine') || '',
        process_type: 'gravure'
      };

      // Add SCTV if it's a CMYK color
      if (['Cyan', 'Magenta', 'Yellow', 'Black'].includes(colorName)) {
        [5, 10, 25, 50, 75].forEach(function(v) {
          var val = parseFloat(document.getElementById('corr-sctv-' + v).value);
          if (!isNaN(val)) payload['sctv_' + v] = val;
        });
      }

      try {
        var res = await fetch('/api/jobs/' + jobId + '/measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.error) { showToast('Error: ' + data.error); return; }
        closeCorrection();
        showToast(currentLang === 'tr' ? 'Korrektur gespeichert' : 'Correction saved');
        loadDashboard();
      } catch(e) {
        showToast(currentLang === 'tr' ? 'Hata olustu' : 'An error occurred');
      }
    }

    // ── Close modals on overlay click ────────────────────────────────────
    document.getElementById('new-job-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeNewJobModal(); });
    document.getElementById('new-meas-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeNewMeasurement(); });
    document.getElementById('detail-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeDetail(); });
    document.getElementById('correction-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeCorrection(); });
    document.getElementById('metrics-overlay').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeMetricsModal(); });

    // ── Metrics Modal ────────────────────────────────────────────────────────
    ${renderTimer}
    ${metricsModalLogic}

    // ── Escape closes modals ─────────────────────────────────────────────
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { 
        closeNewJobModal(); closeNewMeasurement(); closeDetail(); closeCorrection(); closeMetricsModal();
      }
    });

    // ── Enter submits new job / correction ───────────────────────────────
    document.getElementById('new-job-overlay').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.target.matches('select')) submitNewJob();
    });
    document.getElementById('correction-overlay').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submitCorrection();
    });
    document.getElementById('metrics-overlay').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submitMetrics();
    });

    // ── View switching ──────────────────────────────────────────────────
    var currentView = 'dashboard';

    function switchView(view) {
      currentView = view;
      document.getElementById('dashboard-view').classList.toggle('hidden', view !== 'dashboard');
      document.getElementById('analytics-view').classList.toggle('hidden', view !== 'analytics');
      document.getElementById('nav-dashboard').classList.toggle('active', view === 'dashboard');
      document.getElementById('nav-analytics').classList.toggle('active', view === 'analytics');
      if (view === 'analytics') loadAnalytics();
    }

    // ── Analytics ────────────────────────────────────────────────────────
    var chartInstance = null;

    function buildFilterBar() {
      var periodLabel = currentLang === 'tr' ? 'Donem' : 'Period';
      var pressLabel = currentLang === 'tr' ? 'Makine' : 'Press';
      return '<div class="analytics-filters">' +
        '<select id="af-period" class="filter-select" onchange="loadAnalytics()">' +
          '<option value="7">' + (currentLang === 'tr' ? 'Son 7 gun' : 'Last 7 days') + '</option>' +
          '<option value="30" selected>' + (currentLang === 'tr' ? 'Son 30 gun' : 'Last 30 days') + '</option>' +
          '<option value="90">' + (currentLang === 'tr' ? 'Son 90 gun' : 'Last 90 days') + '</option>' +
          '<option value="365">' + (currentLang === 'tr' ? 'Son 1 yil' : 'Last year') + '</option>' +
        '</select>' +
        '<select id="af-press" class="filter-select" onchange="loadAnalytics()">' +
          '<option value="all">' + (currentLang === 'tr' ? 'Tum makineler' : 'All presses') + '</option>' +
        '</select>' +
      '</div>';
    }

    function renderKPIs(data) {
      var k = data.kpis || {};
      var isTR = currentLang === 'tr';
      return '<div class="kpi-row">' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">' + (isTR ? 'Ilk Gecis Orani' : 'First-Pass Rate') + '</div>' +
          '<div class="kpi-value" style="color:' + (k.fpr >= 80 ? '#1d7324' : k.fpr >= 60 ? '#a35b00' : '#c62828') + '">' + (k.fpr != null ? k.fpr + '%' : '-') + '</div>' +
          '<div class="kpi-sub">' + (k.fpr_pass || 0) + '/' + (k.fpr_total || 0) + ' ' + (isTR ? 'renk dE < 2.0' : 'colors dE < 2.0') + '</div>' +
          '<div class="kpi-help">' + (isTR ? 'Ilk denemede tolerans icinde olan renklerin yuzdesi (dE < 2.0). Yuksek olmasi iyi. Hedef: %80+' : 'How many colors were within tolerance (dE < 2.0) on the first try. Higher is better. Target: 80%+') + '</div>' +
        '</div>' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">' + (isTR ? 'Ort. dE' : 'Avg dE') + '</div>' +
          '<div class="kpi-value">' + (k.avg_de != null ? k.avg_de.toFixed(2) : '-') + '</div>' +
          '<div class="kpi-sub">' + (k.total_measurements || 0) + ' ' + (isTR ? 'olcum' : 'measurements') + '</div>' +
          '<div class="kpi-help">' + (isTR ? 'Tum olcumlerdeki ortalama renk sapmasi. Dusuk olmasi iyi. 1.0 alti = mukemmel, 2.0 alti = kabul edilebilir.' : 'Average color deviation across all measurements. Lower is better. Under 1.0 = excellent, under 2.0 = acceptable.') + '</div>' +
        '</div>' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">' + (isTR ? 'Duzeltme/Is' : 'Corrections/Job') + '</div>' +
          '<div class="kpi-value">' + (k.corrections_per_job != null ? k.corrections_per_job.toFixed(1) : '-') + '</div>' +
          '<div class="kpi-sub">' + (isTR ? 'Ort. tekrar olcum' : 'Avg re-measurements') + '</div>' +
          '<div class="kpi-help">' + (isTR ? 'Is basina ortalama tekrar olcum sayisi. 0 = her renk ilk denemede dogru.' : 'Average number of re-measurements needed per job. 0 means every color was right on the first try.') + '</div>' +
        '</div>' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">Cpk</div>' +
          '<div class="kpi-value" style="color:' + (k.cpk >= 1.33 ? '#1d7324' : k.cpk >= 1.0 ? '#a35b00' : '#c62828') + '">' + (k.cpk != null ? k.cpk.toFixed(2) : '-') + '</div>' +
          '<div class="kpi-sub">' + (k.cpk >= 1.33 ? (isTR ? 'Guvenilir' : 'Capable') : k.cpk >= 1.0 ? (isTR ? 'Sinirda' : 'Marginal') : (isTR ? 'Yetersiz' : 'Incapable')) + '</div>' +
          '<div class="kpi-help">' + (isTR ? 'Renklerin ne kadar tutarli sekilde tolerans icinde kaldigini gosterir. 1.33 ustu = guvenilir proses, 1.0 alti = cok fazla degiskenlik.' : 'Shows how consistently colors stay within tolerance. Above 1.33 = reliable process, below 1.0 = too much variation.') + '</div>' +
        '</div>' +
      '</div>';
    }

    function renderProblemColors(data) {
      var colors = data.problem_colors || [];
      if (colors.length === 0) return '';
      var html = '<div class="analytics-section">';
      html += '<div class="analytics-section-head"><span class="analytics-section-title">' + (currentLang === 'tr' ? 'Sorunlu Renkler' : 'Problem Colors') + '</span></div>';
      html += '<table class="analytics-table"><thead><tr>';
      html += '<th>' + (currentLang === 'tr' ? 'Renk' : 'Color') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Olcum' : 'Measurements') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Ort. dE' : 'Avg dE') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Max dE' : 'Max dE') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Basarisiz %' : 'Fail %') + '</th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < colors.length; i++) {
        var c = colors[i];
        var tier = getTier(c.avg_de);
        html += '<tr>';
        html += '<td><span class="swatch" style="background:' + (c.color_hex || '#888') + '"></span>' + escapeHtml(c.color_name || '-') + '</td>';
        html += '<td>' + c.count + '</td>';
        html += '<td><span class="de-' + tier + '">' + c.avg_de.toFixed(2) + '</span></td>';
        html += '<td><span class="de-' + getTier(c.max_de) + '">' + c.max_de.toFixed(2) + '</span></td>';
        html += '<td>' + c.fail_pct + '%</td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      return html;
    }

    function renderProblemJobs(data) {
      var jobs = data.problem_jobs || [];
      if (jobs.length === 0) return '';
      var html = '<div class="analytics-section">';
      html += '<div class="analytics-section-head"><span class="analytics-section-title">' + (currentLang === 'tr' ? 'Sorunlu Isler' : 'Problem Jobs') + '</span></div>';
      html += '<table class="analytics-table"><thead><tr>';
      html += '<th>' + (currentLang === 'tr' ? 'Is' : 'Job') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Makine' : 'Press') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Renkler' : 'Colors') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Ort. dE' : 'Avg dE') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Duzeltmeler' : 'Corrections') + '</th>';
      html += '<th>' + (currentLang === 'tr' ? 'Gecis Orani' : 'Pass Rate') + '</th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        var tier = getTier(j.avg_de);
        var rateTier = j.pass_rate >= 80 ? 'ok' : j.pass_rate >= 60 ? 'warn' : 'crit';
        html += '<tr>';
        html += '<td>' + escapeHtml(j.job_title || j.job_number || '-') + '</td>';
        html += '<td>' + escapeHtml(j.press_name || '-') + '</td>';
        html += '<td>' + j.color_count + '</td>';
        html += '<td><span class="de-' + tier + '">' + j.avg_de.toFixed(2) + '</span></td>';
        html += '<td>' + j.corrections + '</td>';
        html += '<td><span class="pill pill-' + rateTier + '">' + j.pass_rate + '%</span></td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      return html;
    }

    function renderJobHistory(data) {
      var jobs = data.job_history || [];
      if (jobs.length === 0) return '';
      var isTR = currentLang === 'tr';
      var html = '<div class="analytics-section">';
      html += '<div class="analytics-section-head"><span class="analytics-section-title">' + (isTR ? 'Job Historie' : 'Job History') + '</span></div>';
      html += '<table class="analytics-table"><thead><tr>';
      html += '<th>' + (isTR ? 'Is' : 'Job') + '</th>';
      html += '<th>' + (isTR ? 'Makine' : 'Press') + '</th>';
      html += '<th>Status</th>';
      html += '<th>' + (isTR ? 'Renkler' : 'Colors') + '</th>';
      html += '<th>' + (isTR ? 'Olcumler' : 'Measurements') + '</th>';
      html += '<th>' + (isTR ? 'Ort. dE' : 'Avg dE') + '</th>';
      html += '<th>' + (isTR ? 'Duzeltmeler' : 'Corrections') + '</th>';
      html += '<th>' + (isTR ? 'Gecis Orani' : 'Pass Rate') + '</th>';
      html += '<th></th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        var tier = getTier(j.avg_de);
        var rateTier = j.pass_rate >= 80 ? 'ok' : j.pass_rate >= 60 ? 'warn' : j.pass_rate >= 40 ? 'action' : 'crit';
        var statusPill = j.status === 'active'
          ? '<span class="pill pill-ok">' + (isTR ? 'Aktif' : 'Active') + '</span>'
          : '<span class="pill pill-neutral">' + (isTR ? 'Tamamlandi' : 'Completed') + '</span>';
        html += '<tr>';
        html += '<td><strong>' + escapeHtml(j.job_title || '-') + '</strong><br><span style="font-size:11px;color:var(--text-tertiary);">' + escapeHtml(j.job_number || '') + '</span></td>';
        html += '<td>' + escapeHtml(j.press_name || '-') + '</td>';
        html += '<td>' + statusPill + '</td>';
        html += '<td>' + (j.color_count || 0) + '</td>';
        html += '<td>' + (j.measurements || 0) + '</td>';
        html += '<td><span class="de-' + tier + '">' + (j.avg_de ? j.avg_de.toFixed(2) : '-') + '</span></td>';
        html += '<td>' + (j.corrections || 0) + '</td>';
        html += '<td>' + (j.pass_rate != null ? '<span class="pill pill-' + rateTier + '">' + j.pass_rate + '%</span>' : '-') + '</td>';
        html += '<td><a class="edit-link" onclick="openJobDetail(' + j.id + ')">' + (isTR ? 'Detail' : 'Detail') + '</a></td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      return html;
    }

    function renderPressComparison(data) {
      var presses = data.press_comparison || [];
      if (presses.length === 0) return '';
      var html = '<div class="analytics-section">';
      html += '<div class="analytics-section-head"><span class="analytics-section-title">' + (currentLang === 'tr' ? 'Makine Karsilastirmasi' : 'Press Comparison') + '</span></div>';
      html += '<div class="press-compare-grid">';
      for (var i = 0; i < presses.length; i++) {
        var p = presses[i];
        var rateTier = p.fpr >= 80 ? 'ok' : p.fpr >= 60 ? 'warn' : p.fpr >= 40 ? 'action' : 'crit';
        html += '<div class="press-compare-card">';
        html += '<div class="press-compare-name">' + p.name + '</div>';
        html += '<div class="press-compare-stat"><span>' + (currentLang === 'tr' ? 'Gecis Orani' : 'Pass Rate') + '</span><span class="press-compare-val de-' + rateTier + '">' + p.fpr + '%</span></div>';
        html += '<div class="press-compare-stat"><span>' + (currentLang === 'tr' ? 'Ort. dE' : 'Avg dE') + '</span><span class="press-compare-val">' + (p.avg_de != null ? p.avg_de.toFixed(2) : '-') + '</span></div>';
        html += '<div class="press-compare-stat"><span>' + (currentLang === 'tr' ? 'Olcumler' : 'Measurements') + '</span><span class="press-compare-val">' + p.total + '</span></div>';
        html += '<div class="press-compare-stat"><span>' + (currentLang === 'tr' ? 'Isler' : 'Jobs') + '</span><span class="press-compare-val">' + p.jobs + '</span></div>';
        html += '</div>';
      }
      html += '</div></div>';
      return html;
    }

    function renderTrendChart(data) {
      var trends = data.trends || [];
      if (trends.length < 2) return '';
      var html = '<div class="analytics-section">';
      html += '<div class="analytics-section-head"><span class="analytics-section-title">' + (currentLang === 'tr' ? 'dE Trend' : 'dE Trend') + '</span></div>';
      html += '<div class="chart-container"><canvas id="trend-chart"></canvas></div>';
      html += '</div>';
      return html;
    }

    function formatInsight(ins) {
      var d = ins.data || {};
      var isTR = currentLang === 'tr';
      switch (ins.type) {
        case 'color-press-mismatch':
          return isTR
            ? '"' + d.color + '" rengi ' + d.worst_press + ' makinesinde kotu (dE ' + d.worst_de + ') ama ' + d.best_press + ' makinesinde iyi (dE ' + d.best_de + '). Makine ayarlari kontrol edilmeli.'
            : '"' + d.color + '" performs poorly on ' + d.worst_press + ' (dE ' + d.worst_de + ') but well on ' + d.best_press + ' (dE ' + d.best_de + '). Check press setup.';
        case 'repeat-offender':
          return isTR
            ? '"' + d.job + '" isinde ' + d.corrections + ' duzeltme yapildi. Proses gozden gecirilmeli.'
            : '"' + d.job + '" needed ' + d.corrections + ' corrections. Review process parameters.';
        case 'low-fpr':
          return isTR
            ? 'Genel ilk gecis orani %' + d.fpr + ' — hedef en az %80. Acil iyilestirme gerekli.'
            : 'Overall first-pass rate is ' + d.fpr + '% — target is 80%+. Urgent improvement needed.';
        case 'moderate-fpr':
          return isTR
            ? 'Ilk gecis orani %' + d.fpr + '. Hedef %80+.'
            : 'First-pass rate is ' + d.fpr + '%. Target is 80%+.';
        default:
          return ins.text || '';
      }
    }

    function renderInsights(data) {
      var insights = data.insights || [];
      if (insights.length === 0) return '';
      var html = '<div class="analytics-section">';
      html += '<div class="analytics-section-head"><span class="analytics-section-title">' + (currentLang === 'tr' ? 'Otomatik Bilgiler' : 'Automated Insights') + '</span></div>';
      for (var i = 0; i < insights.length; i++) {
        var ins = insights[i];
        var level = ins.level || 'info';
        var icon = level === 'crit' ? '!' : level === 'warn' ? '!' : 'i';
        var text = formatInsight(ins);
        html += '<div class="insight-card insight-' + level + '">';
        html += '<div class="insight-icon">' + icon + '</div>';
        html += '<div><div class="insight-text">' + text + '</div>';
        html += '</div></div>';
      }
      html += '</div>';
      return html;
    }

    function drawTrendChart(data) {
      var trends = data.trends || [];
      if (trends.length < 2) return;
      var canvas = document.getElementById('trend-chart');
      if (!canvas) return;
      if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

      var labels = trends.map(function(t) { return t.date; });
      var avgDe = trends.map(function(t) { return t.avg_de; });
      var fpr = trends.map(function(t) { return t.fpr; });

      chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Avg dE',
              data: avgDe,
              borderColor: '#0071e3',
              backgroundColor: 'rgba(0,113,227,0.08)',
              fill: true,
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 2,
              yAxisID: 'y'
            },
            {
              label: 'First-Pass %',
              data: fpr,
              borderColor: '#1d7324',
              backgroundColor: 'transparent',
              borderDash: [4,4],
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 2,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', labels: { font: { family: "'Inter', sans-serif", size: 11 } } } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
            y: { position: 'left', title: { display: true, text: 'dE', font: { size: 11 } }, suggestedMin: 0 },
            y1: { position: 'right', title: { display: true, text: 'FPR %', font: { size: 11 } }, min: 0, max: 100, grid: { drawOnChartArea: false } }
          }
        }
      });
    }

    async function loadAnalytics() {
      var container = document.getElementById('analytics');
      var period = 30;
      var pressId = 'all';
      var periodEl = document.getElementById('af-period');
      var pressEl = document.getElementById('af-press');
      if (periodEl) period = parseInt(periodEl.value) || 30;
      if (pressEl) pressId = pressEl.value;

      container.innerHTML = buildFilterBar() + '<div style="text-align:center;padding:40px;color:var(--text-tertiary);font-size:13px;">' + (currentLang === 'tr' ? 'Yukleniyor...' : 'Loading...') + '</div>';

      try {
        var url = '/api/analytics?days=' + period + (pressId !== 'all' ? '&press_id=' + pressId : '');
        var res = await fetch(url);
        var data = await res.json();

        // Populate press filter
        var pressSelect = document.getElementById('af-press');
        if (pressSelect && data.presses) {
          var currentVal = pressSelect.value;
          var opts = '<option value="all">' + (currentLang === 'tr' ? 'Tum makineler' : 'All presses') + '</option>';
          for (var i = 0; i < data.presses.length; i++) {
            var p = data.presses[i];
            opts += '<option value="' + p.id + '"' + (currentVal == p.id ? ' selected' : '') + '>' + p.name + '</option>';
          }
          pressSelect.innerHTML = opts;
        }

        var html = buildFilterBar();
        html += renderKPIs(data);
        html += renderInsights(data);
        html += renderTrendChart(data);
        html += renderJobHistory(data);
        html += renderProblemColors(data);
        html += renderProblemJobs(data);
        html += renderPressComparison(data);

        container.innerHTML = html;

        // Re-set filter values
        var newPeriodEl = document.getElementById('af-period');
        if (newPeriodEl) newPeriodEl.value = period;
        var newPressEl = document.getElementById('af-press');
        if (newPressEl) {
          // Re-populate and set
          if (data.presses) {
            var opts2 = '<option value="all">' + (currentLang === 'tr' ? 'Tum makineler' : 'All presses') + '</option>';
            for (var i2 = 0; i2 < data.presses.length; i2++) {
              var p2 = data.presses[i2];
              opts2 += '<option value="' + p2.id + '">' + p2.name + '</option>';
            }
            newPressEl.innerHTML = opts2;
          }
          newPressEl.value = pressId;
        }

        // Draw chart after DOM update
        setTimeout(function() { drawTrendChart(data); }, 50);
      } catch(e) {
        var errNode = document.createElement('div');
        errNode.style.cssText = 'text-align:center;padding:40px;color:#c62828;font-size:13px;';
        errNode.textContent = 'Error: ' + e.message;
        container.innerHTML = buildFilterBar();
        container.appendChild(errNode);
      }
    }

    async function resetMachineStatus(jobId) {
      if (!confirm(currentLang === 'tr' ? 'Makinenin boş olduğunu onaylıyor musunuz?' : 'Bestätigen Sie, dass die Maschine leer war? (Setzt Alte Units auf 0)')) return;
      try {
        var res = await fetch('/api/jobs/' + jobId + '/empty-machine', { method: 'PUT' });
        var data = await res.json();
        if (data.ok) {
          showToast(currentLang === 'tr' ? 'Güncellendi' : 'Aktualisiert');
          loadDashboard();
        }
      } catch (e) {
        showToast('Error resetting machine status');
      }
    }

    async function updateJobUnits(jobId, currentUnits, currentWaste, currentStops) {
      var newColorName = prompt(currentLang === 'tr' ? 'Yeni renk adını girin:' : 'Enter new color name:', oldColorName);
      if (!newColorName || newColorName.trim() === '' || newColorName === oldColorName) return;
      try {
        var res = await fetch('/api/jobs/' + jobId + '/colors/' + encodeURIComponent(oldColorName), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName: newColorName })
        });
        if (res.ok) loadDashboard();
      } catch (e) { console.error(e); }
    }

    applyLang(currentLang);
    loadDashboard();
  </script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
</body>
</html>
  `);
});

// ── API ──────────────────────────────────────────────────────────────────

app.get('/api/migrate', async (c) => {
  const db = c.env.DB;
  try {
    const jobsMeta = await db.prepare(`PRAGMA table_info(jobs)`).all();
    const jobsColNames = (jobsMeta.results || []).map(r => r.name);
    const requiredJobCols = [
      { name: 'press_id', type: 'INTEGER' },
      { name: 'color_count', type: 'INTEGER DEFAULT 0' },
      { name: 'job_state', type: "TEXT DEFAULT 'ready'" },
      { name: 'target_units', type: 'INTEGER DEFAULT 0' },
      { name: 'curr_units', type: 'INTEGER DEFAULT 0' },
      { name: 'actual_stops', type: 'INTEGER DEFAULT 0' },
      { name: 'actual_waste', type: 'INTEGER DEFAULT 0' },
      { name: 'setup_start_at', type: 'TEXT' },
      { name: 'first_pull_at', type: 'TEXT' },
      { name: 'prod_start_at', type: 'TEXT' },
      { name: 'production_start_at', type: 'TEXT' },
      { name: 'completed_at', type: 'TEXT' },
      { name: 'prev_units', type: 'INTEGER DEFAULT 8' },
      { name: 'has_white', type: 'INTEGER DEFAULT 0' },
      { name: 'has_cmyk', type: 'INTEGER DEFAULT 1' },
      { name: 'has_varnish', type: 'INTEGER DEFAULT 0' },
      { name: 'print_units', type: 'INTEGER DEFAULT 0' },
      { name: 'setup_target_min', type: 'INTEGER DEFAULT 0' }
    ];
    for (const col of requiredJobCols) {
      if (!jobsColNames.includes(col.name)) {
        try { await db.prepare(`ALTER TABLE jobs ADD COLUMN ${col.name} ${col.type}`).run(); } catch(e) {}
      }
    }
    const bmMeta = await db.prepare(`PRAGMA table_info(benchmarks)`).all();
    const bmColNames = (bmMeta.results || []).map(r => r.name);
    const requiredBmCols = [
      { name: 'job_id', type: 'INTEGER' },
      { name: 'color', type: 'TEXT' },
      { name: 'color_hex', type: 'TEXT' },
      { name: 'sctv_5', type: 'REAL' },
      { name: 'sctv_10', type: 'REAL' },
      { name: 'sctv_25', type: 'REAL' },
      { name: 'sctv_50', type: 'REAL' },
      { name: 'sctv_75', type: 'REAL' }
    ];
    for (const col of requiredBmCols) {
      if (!bmColNames.includes(col.name)) {
        try { await db.prepare(`ALTER TABLE benchmarks ADD COLUMN ${col.name} ${col.type}`).run(); } catch(e) {}
      }
    }
    return c.json({ ok: true });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.get('/api/presses', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT * FROM presses ORDER BY sort_order').all();
  return c.json({ presses: result.results || [] });
});

app.get('/api/dashboard', async (c) => {
  const db = c.env.DB;
  try {
    const result = await db.prepare(`
      SELECT
        p.id as press_id, p.name as press_name, p.machine as press_machine, p.max_colors, p.status as press_status, p.sort_order,
        j.id as job_id, j.job_number, j.job_title, j.print_method, j.color_count, j.status as job_status,
        j.setup_start_at, j.first_pull_at, j.prod_start_at, j.prev_units, j.curr_units, j.actual_stops, j.actual_waste, j.target_units,
        j.setup_target_min,
        b.id as benchmark_id, b.color as color_name, b.color_hex, b.de, b.ds, b.delta_c, b.created_at as measured_at,
        b.sctv_5, b.sctv_10, b.sctv_25, b.sctv_50, b.sctv_75
      FROM presses p
      LEFT JOIN jobs j ON j.press_id = p.id AND j.status IN ('active', 'pending', 'setup', 'andruck')
      LEFT JOIN (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY job_id, color ORDER BY created_at DESC) as rn
        FROM benchmarks
      ) b ON b.job_id = j.id AND b.rn = 1
      ORDER BY p.sort_order, j.updated_at DESC, b.color
    `).all();

    var rows = result.results || [];
    var pressMap = {};
    var pressOrder = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var pid = r.press_id;
      if (!pressMap[pid]) {
        pressMap[pid] = {
          id: pid, name: r.press_name, machine: r.press_machine, max_colors: r.max_colors,
          status: r.press_status, sort_order: r.sort_order, _jobs: {}
        };
        pressOrder.push(pid);
      }
      if (r.job_id) {
        if (!pressMap[pid]._jobs[r.job_id]) {
          pressMap[pid]._jobs[r.job_id] = {
            id: r.job_id, job_number: r.job_number, job_title: r.job_title,
            print_method: r.print_method, color_count: r.color_count, status: r.job_status,
            setup_start_at: r.setup_start_at, first_pull_at: r.first_pull_at, prod_start_at: r.prod_start_at,
            curr_units: r.curr_units, target_units: r.target_units, actual_stops: r.actual_stops,
            actual_waste: r.actual_waste, setup_target_min: r.setup_target_min, measurements: []
          };
        }
        if (r.color_name) {
          pressMap[pid]._jobs[r.job_id].measurements.push({
            id: r.benchmark_id, color_name: r.color_name, color_hex: r.color_hex, de: r.de, ds: r.ds, delta_c: r.delta_c,
            measured_at: r.measured_at, sctv_5: r.sctv_5, sctv_10: r.sctv_10, sctv_25: r.sctv_25, sctv_50: r.sctv_50, sctv_75: r.sctv_75
          });
        }
      }
    }

    var presses = [];
    for (var k = 0; k < pressOrder.length; k++) {
      var press = pressMap[pressOrder[k]];
      var jobsArr = [];
      var jobKeys = Object.keys(press._jobs);
      for (var j = 0; j < jobKeys.length; j++) {
        var job = press._jobs[jobKeys[j]];
        var cmykNames = ['Cyan', 'Magenta', 'Yellow', 'Black'];
        var cmykHex = { 'Cyan': '#00a3e0', 'Magenta': '#e9008c', 'Yellow': '#ffed00', 'Black': '#000000' };
        var finalMeasurements = [];
        cmykNames.forEach(function(name) {
          var found = job.measurements.find(function(m) { return m.color_name === name; });
          if (found) finalMeasurements.push(found);
          else finalMeasurements.push({ color_name: name, color_hex: cmykHex[name], de: null, ds: null, delta_c: null });
        });
        job.measurements.forEach(function(m) { if (!cmykNames.includes(m.color_name)) finalMeasurements.push(m); });
        job.measurements = finalMeasurements;
        jobsArr.push(job);
      }
      jobsArr.sort(function(a, b) { return b.id - a.id; });
      jobsArr = jobsArr.slice(0, 1);
      presses.push({
        id: press.id,
        name: press.name,
        machine: press.machine,
        max_colors: press.max_colors,
        sort_order: press.sort_order,
        jobs: jobsArr
      });
    }

    // Per-press performance stats (24h, 7d, 30d)
    const now = new Date();
    const d24h = new Date(now.getTime() - 24*60*60*1000).toISOString().replace('T',' ').substring(0,19);
    const d7d  = new Date(now.getTime() - 7*24*60*60*1000).toISOString().replace('T',' ').substring(0,19);
    const d30d = new Date(now.getTime() - 30*24*60*60*1000).toISOString().replace('T',' ').substring(0,19);

    for (var pi2 = 0; pi2 < presses.length; pi2++) {
      var pr = presses[pi2];
      try {
        const pjobs = await db.prepare('SELECT id FROM jobs WHERE press_id = ?').bind(pr.id).all();
        const pjIds = (pjobs.results || []).map(r => r.id);
        if (pjIds.length === 0) {
          pr.perf = { h24: null, d7: null, d30: null };
          continue;
        }
        const idList = pjIds.join(',');
        // First-pass rate: measurement_seq = 1 or IS NULL (legacy data)
        const fpWhere = 'job_id IN (' + idList + ') AND (measurement_seq = 1 OR measurement_seq IS NULL)';
        const r24 = await db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN de < 2.0 THEN 1 ELSE 0 END) as pass FROM benchmarks WHERE ' + fpWhere + ' AND created_at >= ?').bind(d24h).first();
        const r7  = await db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN de < 2.0 THEN 1 ELSE 0 END) as pass FROM benchmarks WHERE ' + fpWhere + ' AND created_at >= ?').bind(d7d).first();
        const r30 = await db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN de < 2.0 THEN 1 ELSE 0 END) as pass FROM benchmarks WHERE ' + fpWhere + ' AND created_at >= ?').bind(d30d).first();
        pr.perf = {
          h24: r24 && r24.total > 0 ? { pass: r24.pass, total: r24.total, rate: Math.round(r24.pass / r24.total * 100) } : null,
          d7:  r7  && r7.total  > 0 ? { pass: r7.pass,  total: r7.total,  rate: Math.round(r7.pass  / r7.total  * 100) } : null,
          d30: r30 && r30.total > 0 ? { pass: r30.pass, total: r30.total, rate: Math.round(r30.pass / r30.total * 100) } : null
        };
      } catch(e) {
        pr.perf = { h24: null, d7: null, d30: null };
      }
    }

    return c.json({ presses });
  } catch(e) {
    return c.json({ error: e.message, presses: [] }, 500);
  }
});

app.post('/api/jobs/:id/action', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { action } = await c.req.json();
  const now = new Date().toISOString();
  try {
    let updateSql = '';
    let params = [];

    if (action === 'start-setup') {
      updateSql = 'UPDATE jobs SET status = ?, setup_start_at = ?, updated_at = ? WHERE id = ?';
      params = ['setup', now, now, id];
    } else if (action === 'first-pull') {
      updateSql = 'UPDATE jobs SET status = ?, first_pull_at = ?, updated_at = ? WHERE id = ?';
      params = ['andruck', now, now, id];
    } else if (action === 'start-prod') {
      updateSql = 'UPDATE jobs SET status = ?, prod_start_at = ?, updated_at = ? WHERE id = ?';
      params = ['active', now, now, id];
    }

    if (updateSql) {
      await db.prepare(updateSql).bind(...params).run();
      return c.json({ ok: true });
    }
    return c.json({ error: 'Invalid action' }, 400);
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/api/jobs/:id/empty-machine', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  try {
    await db.prepare('UPDATE jobs SET prev_units = 0 WHERE id = ?').bind(id).run();
    return c.json({ ok: true });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/api/jobs/:id/performance', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const { stops, waste, units } = await c.req.json();
  try {
    await db.prepare('UPDATE jobs SET actual_stops = ?, actual_waste = ?, curr_units = ?, updated_at = (datetime(\'now\')) WHERE id = ?')
      .bind(stops, waste, units, id).run();
    return c.json({ ok: true });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── Jobs API ───────────────────────────────────────────────────────────────
app.get('/api/jobs', async (c) => {
  const db = c.env.DB;
  try {
    // Ensure jobs table exists
    await db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_number TEXT NOT NULL UNIQUE,
      job_title TEXT NOT NULL,
      print_method TEXT,
      color_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      job_state TEXT DEFAULT 'ready',
      target_units INTEGER DEFAULT 0,
      actual_units INTEGER DEFAULT 0,
      waste_units INTEGER DEFAULT 0,
      stops_count INTEGER DEFAULT 0,
      setup_start_at TEXT,
      first_pull_at TEXT,
      production_start_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run();

    // Detect actual column names in benchmarks table
    const tableInfo = await db.prepare(`PRAGMA table_info(benchmarks)`).all();
    const cols = (tableInfo.results || []).map(r => r.name);

    // Add missing columns if needed
    if (!cols.includes('job_id')) {
      try { await db.prepare(`ALTER TABLE benchmarks ADD COLUMN job_id INTEGER`).run(); } catch(e) {}
    }
    if (!cols.includes('color_hex')) {
      try { await db.prepare(`ALTER TABLE benchmarks ADD COLUMN color_hex TEXT`).run(); } catch(e) {}
    }

    // Determine actual column names (legacy vs new)
    const colorCol = cols.includes('color_name') ? 'color_name' : (cols.includes('color') ? 'color' : 'color_name');
    const dateCol = cols.includes('measured_at') ? 'measured_at' : (cols.includes('created_at') ? 'created_at' : 'measured_at');

    const jobs = await db.prepare(`SELECT * FROM jobs WHERE status = 'active' ORDER BY updated_at DESC`).all();

    const jobsWithMeasurements = await Promise.all((jobs.results || []).map(async (job) => {
      try {
        const measurements = await db.prepare(`
          SELECT ${colorCol} as color_name, color_hex, de, ds, delta_c, ${dateCol} as measured_at
          FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY ${colorCol} ORDER BY ${dateCol} DESC) as rn
            FROM benchmarks WHERE job_id = ?
          ) WHERE rn = 1
        `).bind(job.id).all();
        return { ...job, measurements: measurements.results || [] };
      } catch(e) {
        return { ...job, measurements: [] };
      }
    }));

    return c.json({ jobs: jobsWithMeasurements });
  } catch(e) {
    return c.json({ error: e.message, jobs: [] }, 500);
  }
});

app.post('/api/jobs', async (c) => {
  const db = c.env.DB;
  await db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_number TEXT NOT NULL UNIQUE,
    job_title TEXT NOT NULL,
    print_method TEXT,
    color_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run();

  // Ensure press_id column exists
  const jobsInfo = await db.prepare(`PRAGMA table_info(jobs)`).all();
  const jobsCols = (jobsInfo.results || []).map(r => r.name);
  if (!jobsCols.includes('press_id')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN press_id INTEGER`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('job_state')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN job_state TEXT DEFAULT 'ready'`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('target_units')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN target_units INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('curr_units')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN curr_units INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('actual_waste')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN actual_waste INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('actual_stops')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN actual_stops INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('setup_start_at')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN setup_start_at TEXT`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('first_pull_at')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN first_pull_at TEXT`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('production_start_at')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN production_start_at TEXT`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('completed_at')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN completed_at TEXT`).run(); } catch(e) {}
  }

  // Ensure recipe columns exist
  if (!jobsCols.includes('has_white')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN has_white INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('has_cmyk')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN has_cmyk INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('print_units')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN print_units INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('has_varnish')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN has_varnish INTEGER DEFAULT 0`).run(); } catch(e) {}
  }
  if (!jobsCols.includes('setup_target_min')) {
    try { await db.prepare(`ALTER TABLE jobs ADD COLUMN setup_target_min INTEGER DEFAULT 0`).run(); } catch(e) {}
  }

  const body = await c.req.json();
  if (!job_number || !job_title) return c.json({ error: 'job_number and job_title required' }, 400);

  try {
    let prev_units = 0;
    if (press_id) {
      // Find prev_units from last job on this press
      const lastJob = await db.prepare('SELECT color_count FROM jobs WHERE press_id = ? ORDER BY id DESC LIMIT 1').bind(press_id).first();
      prev_units = lastJob ? lastJob.color_count : 0;

      // Mark all existing active/setup jobs for this press as completed
      await db.prepare('UPDATE jobs SET status = ? WHERE press_id = ? AND status IN ("active", "setup", "andruck")').bind('completed', press_id).run();
    }

    const result = await db.prepare(
      `INSERT INTO jobs (job_number, job_title, print_method, color_count, press_id, target_units, job_state, has_white, has_cmyk, has_varnish, print_units, setup_target_min, prev_units) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(job_number, job_title, print_method || null, color_count || 0, press_id || null, target_units || 0, 'ready', has_white || 0, has_cmyk || 0, has_varnish || 0, print_units || 0, setup_target_min || 0, prev_units).run();

    const newJobId = result.meta.last_row_id;

    if (colors && Array.isArray(colors)) {
      for (let i = 0; i < colors.length; i++) {
        const cName = colors[i];
        if (cName) {
          await db.prepare('INSERT INTO benchmarks (job_id, color, created_at) VALUES (?, ?, datetime("now"))')
            .bind(newJobId, cName).run();
        }
      }
    }

    return c.json({ id: newJobId, job_number, job_title });
  } catch(e) {
    if (e.message && e.message.includes('UNIQUE constraint')) {
      return c.json({ error: 'Job number already exists. Please use a unique job number.' }, 409);
    }
    return c.json({ error: e.message }, 500);
  }
});

app.put('/api/jobs/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  const { job_title, print_method, color_count, status, press_id } = body;
  await db.prepare(
    `UPDATE jobs SET job_title=COALESCE(?,job_title), print_method=COALESCE(?,print_method),
     color_count=COALESCE(?,color_count), status=COALESCE(?,status),
     press_id=COALESCE(?,press_id),
     updated_at=datetime('now') WHERE id=?`
  ).bind(job_title||null, print_method||null, color_count||null, status||null, press_id||null, id).run();
  return c.json({ ok: true });
});

app.get('/api/jobs/:id/history', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  try {
    const tableInfo = await db.prepare('PRAGMA table_info(benchmarks)').all();
    const cols = (tableInfo.results || []).map(r => r.name);
    const colorCol = cols.includes('color') ? 'color' : 'color_name';

    // Get ALL measurements for this job, grouped by color, ordered by seq/time
    const result = await db.prepare(
      'SELECT id, ' + colorCol + ' as color_name, color_hex, de, ds, delta_c, delta_h, delta_l, ' +
      'created_at, measurement_seq, edited_at, edited_from, status_en, benchmark_en, diagnosis_en, ' +
      'status_tr, benchmark_tr, diagnosis_tr ' +
      'FROM benchmarks WHERE job_id = ? ORDER BY ' + colorCol + ', COALESCE(measurement_seq, 1), created_at'
    ).bind(jobId).all();

    // Group by color
    var colors = {};
    var colorOrder = [];
    (result.results || []).forEach(function(r) {
      var cn = r.color_name || 'Unknown';
      if (!colors[cn]) { colors[cn] = []; colorOrder.push(cn); }
      colors[cn].push(r);
    });

    return c.json({ colors: colors, colorOrder: colorOrder });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});app.put('/api/jobs/:id/colors/:colorName', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const colorName = decodeURIComponent(c.req.param('colorName'));
  const body = await c.req.json();
  const { new_color } = body;
  if (!new_color) return c.json({ error: 'new_color required' }, 400);

  try {
    // Check if the new color name already exists for this job (to prevent duplicates if they accidentally typed one that's already there)
    const existing = await db.prepare('SELECT id FROM benchmarks WHERE job_id = ? AND color = ?').bind(id, new_color).first();
    if (existing && new_color !== colorName) {
      return c.json({ error: 'Color name already exists in this job' }, 409);
    }

    await db.prepare('UPDATE benchmarks SET color = ? WHERE job_id = ? AND color = ?')
      .bind(new_color, id, colorName).run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete('/api/jobs/:id/colors/:colorName', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const colorName = decodeURIComponent(c.req.param('colorName'));
  
  try {
    await db.prepare('DELETE FROM benchmarks WHERE job_id = ? AND color = ?')
      .bind(id, colorName).run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

app.put('/api/benchmarks/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    // Get current values for audit trail
    const current = await db.prepare('SELECT de, ds, delta_c FROM benchmarks WHERE id = ?').bind(id).first();
    if (!current) return c.json({ error: 'Not found' }, 404);

    var editedFrom = JSON.stringify({ de: current.de, ds: current.ds, delta_c: current.delta_c });

    const { de, ds, delta_c, sctv_5, sctv_10, sctv_25, sctv_50, sctv_75 } = body;

    // Re-evaluate with new values
    const evalResult = evaluateColor(
      { de, ds, delta_c, delta_h: 0, delta_l: 0 },
      { process_type: 'gravure', viscosity: null }
    );

    await db.prepare(
      `UPDATE benchmarks SET de=?, ds=?, delta_c=?, 
       sctv_5=?, sctv_10=?, sctv_25=?, sctv_50=?, sctv_75=?,
       edited_at=datetime('now'), edited_from=?, status_en=?, status_tr=?, benchmark_en=?, benchmark_tr=?, diagnosis_en=?, diagnosis_tr=? 
       WHERE id=?`
    ).bind(
      de, ds, delta_c, 
      sctv_5||null, sctv_10||null, sctv_25||null, sctv_50||null, sctv_75||null,
      editedFrom,
      evalResult.status_en, evalResult.status_tr,
      evalResult.benchmark_en, evalResult.benchmark_tr,
      evalResult.diagnosis_en, evalResult.diagnosis_tr,
      id
    ).run();

    return c.json({ ok: true });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/api/jobs/:id/measurements', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');
  const body = await c.req.json();

  try {
    const tableInfo = await db.prepare(`PRAGMA table_info(benchmarks)`).all();
    const cols = (tableInfo.results || []).map(r => r.name);
    const jobColumn = cols.includes('product') ? 'product' : 'job';
    const colorColumn = cols.includes('color') ? 'color' : 'color_name';

    // Add missing columns
    if (!cols.includes('job_id')) {
      try { await db.prepare(`ALTER TABLE benchmarks ADD COLUMN job_id INTEGER`).run(); } catch(e) {}
    }
    if (!cols.includes('color_hex')) {
      try { await db.prepare(`ALTER TABLE benchmarks ADD COLUMN color_hex TEXT`).run(); } catch(e) {}
    }

    const {
      color_name, color_hex, de, ds, delta_c, delta_h, delta_l, process_type, machine, viscosity,
      sctv_5, sctv_10, sctv_25, sctv_50, sctv_75
    } = body;

    // Evaluate the color for status/diagnosis fields
    const evalResult = evaluateColor(
      { de, ds, delta_c, delta_h: delta_h || 0, delta_l: delta_l || 0 },
      { process_type: process_type || 'gravure', viscosity }
    );

    // Determine measurement sequence (1 = first pass)
    let measurement_seq = 1;
    try {
      const seqResult = await db.prepare(
        'SELECT COUNT(*) as cnt FROM benchmarks WHERE job_id = ? AND ' + colorColumn + ' = ?'
      ).bind(jobId, color_name).first();
      measurement_seq = (seqResult ? seqResult.cnt : 0) + 1;
    } catch(e) {}

    await db.prepare(
      `INSERT INTO benchmarks (job_id, ${colorColumn}, color_hex, de, ds, delta_c, delta_h, delta_l,
       process_type, machine, ${jobColumn}, viscosity, date, time,
       status_en, status_tr, benchmark_en, benchmark_tr, diagnosis_en, diagnosis_tr, measurement_seq,
       sctv_5, sctv_10, sctv_25, sctv_50, sctv_75)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), time('now'),
       ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?, ?)`
    ).bind(
      jobId, color_name, color_hex||null, de||null, ds||null, delta_c||null,
      delta_h||null, delta_l||null, process_type||null, machine||null,
      color_name, viscosity||null,
      evalResult.status_en, evalResult.status_tr,
      evalResult.benchmark_en, evalResult.benchmark_tr,
      evalResult.diagnosis_en, evalResult.diagnosis_tr,
      measurement_seq,
      sctv_5||null, sctv_10||null, sctv_25||null, sctv_50||null, sctv_75||null
    ).run();

    await db.prepare(`UPDATE jobs SET updated_at=datetime('now') WHERE id=?`).bind(jobId).run();

    return c.json({ ok: true });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});


// ── Analytics API ────────────────────────────────────────────────────────────
app.get('/api/analytics', async (c) => {
  const db = c.env.DB;
  try {
    const days = parseInt(c.req.query('days')) || 30;
    const pressId = c.req.query('press_id');
    const now = new Date();
    const since = new Date(now.getTime() - days * 24*60*60*1000).toISOString().replace('T',' ').substring(0,19);

    // Press list for filter
    const pressResult = await db.prepare('SELECT id, name FROM presses ORDER BY sort_order').all();
    const presses = pressResult.results || [];

    // Build WHERE clause
    let where = 'b.created_at >= ?';
    let binds = [since];
    if (pressId && pressId !== 'all') {
      where += ' AND j.press_id = ?';
      binds.push(parseInt(pressId));
    }

    // ── KPIs ──
    const kpiQ = await db.prepare(
      `SELECT COUNT(*) as total,
        AVG(b.de) as avg_de,
        SUM(CASE WHEN b.de < 2.0 AND (b.measurement_seq = 1 OR b.measurement_seq IS NULL) THEN 1 ELSE 0 END) as fpr_pass,
        SUM(CASE WHEN b.measurement_seq = 1 OR b.measurement_seq IS NULL THEN 1 ELSE 0 END) as fpr_total,
        SUM(CASE WHEN b.measurement_seq > 1 THEN 1 ELSE 0 END) as corrections
       FROM benchmarks b
       LEFT JOIN jobs j ON j.id = b.job_id
       WHERE ${where}`
    ).bind(...binds).first();

    const jobCountQ = await db.prepare(
      `SELECT COUNT(DISTINCT b.job_id) as job_count
       FROM benchmarks b LEFT JOIN jobs j ON j.id = b.job_id
       WHERE ${where}`
    ).bind(...binds).first();

    const fpr = kpiQ.fpr_total > 0 ? Math.round(kpiQ.fpr_pass / kpiQ.fpr_total * 100) : null;
    const corrPerJob = jobCountQ.job_count > 0 ? kpiQ.corrections / jobCountQ.job_count : null;

    // Cpk: (USL - mean) / (3 * stddev), USL = 2.0
    const cpkQ = await db.prepare(
      `SELECT AVG(b.de) as mean_de,
        AVG(b.de * b.de) as mean_sq_de,
        COUNT(*) as n
       FROM benchmarks b LEFT JOIN jobs j ON j.id = b.job_id
       WHERE ${where} AND b.de IS NOT NULL`
    ).bind(...binds).first();

    let cpk = null;
    if (cpkQ.n >= 3) {
      const variance = cpkQ.mean_sq_de - (cpkQ.mean_de * cpkQ.mean_de);
      const stddev = Math.sqrt(Math.max(0, variance));
      if (stddev > 0) cpk = (2.0 - cpkQ.mean_de) / (3 * stddev);
    }

    // ── Problem colors (top 10 by avg dE, at least 2 measurements) ──
    const colorQ = await db.prepare(
      `SELECT b.color as color_name, MAX(b.color_hex) as color_hex,
        COUNT(*) as count, AVG(b.de) as avg_de, MAX(b.de) as max_de,
        ROUND(100.0 * SUM(CASE WHEN b.de >= 2.0 THEN 1 ELSE 0 END) / COUNT(*)) as fail_pct
       FROM benchmarks b LEFT JOIN jobs j ON j.id = b.job_id
       WHERE ${where} AND b.de IS NOT NULL
       GROUP BY b.color HAVING COUNT(*) >= 2
       ORDER BY avg_de DESC LIMIT 10`
    ).bind(...binds).all();

    // ── Problem jobs (top 10 by avg dE) ──
    const jobQ = await db.prepare(
      `SELECT j.job_title, j.job_number, p.name as press_name,
        COUNT(DISTINCT b.color) as color_count,
        AVG(b.de) as avg_de,
        SUM(CASE WHEN b.measurement_seq > 1 THEN 1 ELSE 0 END) as corrections,
        ROUND(100.0 * SUM(CASE WHEN b.de < 2.0 AND (b.measurement_seq=1 OR b.measurement_seq IS NULL) THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN b.measurement_seq=1 OR b.measurement_seq IS NULL THEN 1 ELSE 0 END), 0)) as pass_rate
       FROM benchmarks b
       LEFT JOIN jobs j ON j.id = b.job_id
       LEFT JOIN presses p ON p.id = j.press_id
       WHERE ${where} AND b.de IS NOT NULL AND j.id IS NOT NULL
       GROUP BY b.job_id
       ORDER BY avg_de DESC LIMIT 10`
    ).bind(...binds).all();

    // ── Press comparison ──
    const pressCompQ = await db.prepare(
      `SELECT p.id, p.name,
        COUNT(b.id) as total,
        COUNT(DISTINCT b.job_id) as jobs,
        AVG(b.de) as avg_de,
        ROUND(100.0 * SUM(CASE WHEN b.de < 2.0 AND (b.measurement_seq=1 OR b.measurement_seq IS NULL) THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN b.measurement_seq=1 OR b.measurement_seq IS NULL THEN 1 ELSE 0 END), 0)) as fpr
       FROM presses p
       LEFT JOIN jobs j ON j.press_id = p.id
       LEFT JOIN benchmarks b ON b.job_id = j.id AND b.created_at >= ?
       GROUP BY p.id
       ORDER BY p.sort_order`
    ).bind(since).all();

    // ── Trend data (daily aggregates) ──
    const trendQ = await db.prepare(
      `SELECT DATE(b.created_at) as date,
        AVG(b.de) as avg_de,
        ROUND(100.0 * SUM(CASE WHEN b.de < 2.0 AND (b.measurement_seq=1 OR b.measurement_seq IS NULL) THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN b.measurement_seq=1 OR b.measurement_seq IS NULL THEN 1 ELSE 0 END), 0)) as fpr
       FROM benchmarks b LEFT JOIN jobs j ON j.id = b.job_id
       WHERE ${where} AND b.de IS NOT NULL
       GROUP BY DATE(b.created_at)
       ORDER BY date`
    ).bind(...binds).all();

    // ── Rule-based insights ──
    const insights = [];

    // Insight: Colors that fail on one press but not another
    const crossPressQ = await db.prepare(
      `SELECT b.color, p.name as press_name, AVG(b.de) as avg_de
       FROM benchmarks b
       LEFT JOIN jobs j ON j.id = b.job_id
       LEFT JOIN presses p ON p.id = j.press_id
       WHERE b.created_at >= ? AND b.de IS NOT NULL AND p.id IS NOT NULL
       GROUP BY b.color, p.id
       HAVING COUNT(*) >= 2
       ORDER BY b.color`
    ).bind(since).all();

    // Find colors with big dE variance across presses
    var crossPressMap = {};
    (crossPressQ.results || []).forEach(function(r) {
      if (!crossPressMap[r.color]) crossPressMap[r.color] = [];
      crossPressMap[r.color].push({ press: r.press_name, avg: r.avg_de });
    });
    for (var clr in crossPressMap) {
      var entries = crossPressMap[clr];
      if (entries.length >= 2) {
        var best = entries.reduce(function(a, b) { return a.avg < b.avg ? a : b; });
        var worst = entries.reduce(function(a, b) { return a.avg > b.avg ? a : b; });
        if (worst.avg - best.avg > 1.5) {
          insights.push({
            level: 'warn',
            type: 'color-press-mismatch',
            data: { color: clr, worst_press: worst.press, worst_de: worst.avg.toFixed(1), best_press: best.press, best_de: best.avg.toFixed(1) },
            meta: 'color-press-mismatch'
          });
        }
      }
    }

    // Insight: Repeat offender jobs (>3 corrections)
    (jobQ.results || []).forEach(function(j) {
      if (j.corrections >= 3) {
        insights.push({
          level: 'crit',
          type: 'repeat-offender',
          data: { job: j.job_title || j.job_number, corrections: j.corrections },
          meta: 'repeat-offender'
        });
      }
    });

    // Insight: Overall FPR warning
    if (fpr != null && fpr < 60) {
      insights.push({
        level: 'crit',
        type: 'low-fpr',
        data: { fpr: fpr },
        meta: 'low-fpr'
      });
    } else if (fpr != null && fpr < 80) {
      insights.push({
        level: 'warn',
        type: 'moderate-fpr',
        data: { fpr: fpr },
        meta: 'moderate-fpr'
      });
    }

    // ── Job history (all jobs with stats) ──
    const jobHistQ = await db.prepare(
      `SELECT j.id, j.job_number, j.job_title, j.status, j.created_at, j.color_count,
        p.name as press_name,
        COUNT(b.id) as measurements,
        AVG(b.de) as avg_de,
        SUM(CASE WHEN b.measurement_seq > 1 THEN 1 ELSE 0 END) as corrections,
        ROUND(100.0 * SUM(CASE WHEN b.de < 2.0 AND (b.measurement_seq=1 OR b.measurement_seq IS NULL) THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN b.measurement_seq=1 OR b.measurement_seq IS NULL THEN 1 ELSE 0 END), 0)) as pass_rate
       FROM jobs j
       LEFT JOIN presses p ON p.id = j.press_id
       LEFT JOIN benchmarks b ON b.job_id = j.id
       ${pressId && pressId !== 'all' ? 'WHERE j.press_id = ?' : 'WHERE 1=1'}
       GROUP BY j.id
       ORDER BY j.updated_at DESC
       LIMIT 50`
    ).bind(...(pressId && pressId !== 'all' ? [parseInt(pressId)] : [])).all();

    return c.json({
      presses,
      kpis: {
        fpr,
        fpr_pass: kpiQ.fpr_pass || 0,
        fpr_total: kpiQ.fpr_total || 0,
        avg_de: kpiQ.avg_de,
        total_measurements: kpiQ.total,
        corrections_per_job: corrPerJob,
        cpk
      },
      problem_colors: (colorQ.results || []).map(r => ({ ...r, avg_de: r.avg_de || 0, max_de: r.max_de || 0, fail_pct: r.fail_pct || 0 })),
      problem_jobs: (jobQ.results || []).map(r => ({ ...r, avg_de: r.avg_de || 0, pass_rate: r.pass_rate || 0, corrections: r.corrections || 0 })),
      press_comparison: (pressCompQ.results || []).map(r => ({ ...r, avg_de: r.avg_de, fpr: r.fpr || 0 })),
      trends: (trendQ.results || []).map(r => ({ date: r.date, avg_de: r.avg_de || 0, fpr: r.fpr || 0 })),
      job_history: (jobHistQ.results || []).map(r => ({ ...r, avg_de: r.avg_de || 0, pass_rate: r.pass_rate || 0, corrections: r.corrections || 0 })),
      insights
    });
  } catch(e) {
    return c.json({ error: e.message }, 500);
  }
});

app.post('/api/benchmark', async (c) => {
    try {
        const body = await c.req.json()
        const { date, time, machine, process_type, product, viscosity, print_speed, drying_temp, colors } = body

        if (!Array.isArray(colors) || colors.length === 0) {
            return c.json({ success: false, error: 'No colors provided.' }, 400)
        }

        const db = c.env.DB;
        const { results: tableInfo } = await db.prepare("PRAGMA table_info(benchmarks)").all();
        const hasProduct = tableInfo.some(col => col.name === 'product');
        const jobColumn = hasProduct ? 'product' : 'job';

        const stmts = []

        const globalData = { process_type, viscosity }

        for (const colorItem of colors) {
            const { color, de, ds, delta_c, delta_h, delta_l } = colorItem
            const result = evaluateColor(colorItem, globalData)

            stmts.push(
                db.prepare(
                    `INSERT INTO benchmarks (date, time, machine, process_type, ${jobColumn}, color, de, ds, delta_c, delta_h, delta_l, viscosity, print_speed, drying_temp, status_en, status_tr, benchmark_en, benchmark_tr, diagnosis_en, diagnosis_tr)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    date, time, machine, process_type || 'gravure', product, color,
                    de || 0, ds || 0, delta_c || 0, delta_h || 0, delta_l || 0,
                    viscosity ? Number(viscosity) : null,
                    print_speed ? Number(print_speed) : null,
                    drying_temp ? Number(drying_temp) : null,
                    result.status_en, result.status_tr, result.benchmark_en, result.benchmark_tr, result.diagnosis_en, result.diagnosis_tr
                )
            )
        }

        await db.batch(stmts)
        return c.json({ success: true })
    } catch (error) {
        console.error('API Error:', error)
        return c.json({ success: false, error: 'Database error or Invalid Payload.', details: error.message }, 500)
    }
})

app.get('/api/benchmarks', async (c) => {
    try {
        const db = c.env.DB;

        const { results: tableInfo } = await db.prepare("PRAGMA table_info(benchmarks)").all();
        const hasProduct = tableInfo.some(col => col.name === 'product');
        const jobColumn = hasProduct ? 'product' : 'job';

        const machine = c.req.query('machine');
        const process = c.req.query('process_type');
        const from = c.req.query('from');
        const to = c.req.query('to');
        const color = c.req.query('color');

        let query = `SELECT *, ${jobColumn} AS product FROM benchmarks WHERE 1=1 `;
        const params = [];

        if (machine) { query += " AND machine = ?"; params.push(machine); }
        if (process) { query += " AND process_type = ?"; params.push(process); }
        if (from) { query += " AND date >= ?"; params.push(from); }
        if (to) { query += " AND date <= ?"; params.push(to); }
        if (color) { query += " AND color LIKE ?"; params.push('%' + color + '%'); }

        query += " ORDER BY date DESC, time DESC LIMIT 200";

        console.log('BENCHMARKS QUERY:', query, params);
        const { results } = await db.prepare(query).bind(...params).all();
        console.log('BENCHMARKS RESULTS COUNT:', results.length);

        return c.json({ success: true, data: results });
    } catch (error) {
        console.error('API Error:', error)
        return c.json({ success: false, error: 'Query failed.', details: error.message }, 500)
    }
})

app.get('/api/test-db', async (c) => {
    try {
        const db = c.env.DB;
        if (!db) return c.json({ success: false, error: 'DB binding missing' });
        const { results } = await db.prepare("PRAGMA table_info(benchmarks)").all();
        const count = await db.prepare("SELECT COUNT(*) as c FROM benchmarks").first();
        return c.json({ success: true, columns: results, count: count.c });
    } catch (e) {
        return c.json({ success: false, error: e.message });
    }
})

app.get('/api/recent', async (c) => {
    try {
        const db = c.env.DB;
        const { results: tableInfo } = await db.prepare("PRAGMA table_info(benchmarks)").all();
        const hasProduct = tableInfo.some(col => col.name === 'product');
        const jobColumn = hasProduct ? 'product' : 'job';

        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const fromDate = yesterday.toISOString().split('T')[0];

        const { results } = await db.prepare(
            `SELECT *, ${jobColumn} AS product FROM benchmarks WHERE date >= ? ORDER BY date DESC, time DESC LIMIT 50`
        ).bind(fromDate).all();

        return c.json({ success: true, data: results });
    } catch (error) {
        console.error('Recent API Error:', error);
        return c.json({ success: false, error: 'Query failed.', details: error.message }, 500);
    }
})

export default app
