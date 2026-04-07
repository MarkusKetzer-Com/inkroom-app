// src/ui-components.js

/** renderJobCard — Performance Cockpit card with benchmarks & traffic-light badges */
export const renderJobCard = `
    function renderJobCard(job) {
      var measurements = job.measurements || [];
      var deVals = measurements.map(function(m) { return Number(m.de); }).filter(function(v) { return !isNaN(v); });
      var avgDe = deVals.length ? deVals.reduce(function(a, b) { return a + b; }, 0) / deVals.length : null;
      var avgTier = getTier(avgDe);
      var isTR = currentLang === 'tr';

      var expectedColors = job.color_count || measurements.length || 0;
      var measuredColors = measurements.length;
      var progressPct = expectedColors > 0 ? Math.min(100, Math.round(measuredColors / expectedColors * 100)) : 0;

      var failingColors = measurements.filter(function(m) { return Number(m.de) >= 2.0; });
      var isZeroPull = measurements.length > 0 && failingColors.length === 0;

      var deBadgeHtml = avgDe != null ? '<span class="badge badge-' + avgTier + '">avg dE ' + avgDe.toFixed(2) + '</span>' : '';
      var colorWord = isTR ? 'renk' : (measurements.length === 1 ? 'color' : 'colors');
      var colorCountBadge = measurements.length ? '<span class="badge badge-neutral">' + measuredColors + (expectedColors > measuredColors ? '/' + expectedColors : '') + ' ' + colorWord + '</span>' : '';

      // --- Build Recipe String ---
      var recipeParts = [];
      if (job.has_white) recipeParts.push('W');
      if (job.has_cmyk) recipeParts.push('CMYK');
      if (job.color_count > 0) recipeParts.push(job.color_count + 'S');
      if (job.has_varnish) recipeParts.push('V');
      var recipeStr = recipeParts.join(' + ');
      var recipeBadgeHtml = recipeStr ? '<span class="badge badge-neutral" style="background:rgba(0,113,227,0.06); color:var(--accent); border:0.5px solid rgba(0,113,227,0.2);">' + recipeStr + '</span>' : '';

      var tableHtml = '';
      if (measurements.length === 0 && job.status === 'ready') {
        tableHtml = '<div class="no-measurements">' + (isTR ? 'Hazırlık bekleniyor' : 'Waiting for setup') + '</div>';
      } else {
        // Local renderColorRow to handle SCTV-Delta cleanly within ui-components.js
        var localRenderColorRow = function(c, jobId) {
          var hex = c.color_hex || '#888888';
          var isWhite = hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff';
          var swatchClass = 'swatch' + (isWhite ? ' swatch-white' : '');

          var tierDE = getTier(Number(c.de));
          var deClass = 'de-' + tierDE;
          var deVal = c.de != null ? Number(c.de).toFixed(2) : '--.--';
          var dsNum = Number(c.ds);
          var dsVal = c.ds != null ? dsNum : '--.--';
          var dsCls = (!isNaN(dsNum) && dsNum <= 100) ? 'density-warn' : '';
          var dcNum = Number(c.delta_c);
          var dcVal = c.delta_c != null ? (dcNum >= 0 ? '+' : '') + dcNum.toFixed(2) : '--.--';

          var sctvCells = '';
          var maxSctvDev = 0;
          var hasSctv = false;
          [5, 10, 25, 50, 75].forEach(function(targetPct) {
            var val = c['sctv_' + targetPct];
            if (val == null) {
              sctvCells += '<td><span style="color:var(--text-tertiary);">--.--</span></td>';
            } else {
              hasSctv = true;
              var num = Number(val);
              var diff = num - targetPct;
              var absDiff = Math.abs(diff);
              if (absDiff > maxSctvDev) maxSctvDev = absDiff;
              
              var diffColor = absDiff <= 2.0 ? '#1a7326' : (absDiff <= 4.0 ? '#a35b00' : '#c62828');
              var diffText = (diff >= 0 ? '+' : '') + diff.toFixed(1);
              sctvCells += '<td style="line-height:1.1; vertical-align:top; border-bottom: 0.5px solid var(--border-subtle);">' + 
                           '<div style="font-weight:500;">' + num.toFixed(1) + '</div>' + 
                           '<div style="font-size:9px;font-weight:700;color:' + diffColor + '; margin-top:2px;">' + diffText + '</div></td>';
            }
          });

          var tierTV = 'neutral';
          if (hasSctv) tierTV = maxSctvDev <= 2.0 ? 'ok' : (maxSctvDev <= 4.0 ? 'warn' : 'crit');

          var pillLabels = { ok: { en: 'OK', tr: 'TAMAM' }, warn: { en: 'Warn', tr: 'Uyari' }, action: { en: 'Action', tr: 'Eylem' }, crit: { en: 'Critical', tr: 'Kritik' }, neutral: { en: '-', tr: '-' } };
          var pillTV = pillLabels[tierTV] ? (currentLang === 'tr' ? pillLabels[tierTV].tr : pillLabels[tierTV].en) : '-';
          var pillDE = pillLabels[tierDE] ? (currentLang === 'tr' ? pillLabels[tierDE].tr : pillLabels[tierDE].en) : '-';

          var safeColorName = (c.color_name || '').replace(/'/g, "\\\\'");
          var safeHex = (hex || '').replace(/'/g, "\\\\'");
          var sctvData = JSON.stringify({
            sctv_5: c.sctv_5, sctv_10: c.sctv_10, sctv_25: c.sctv_25, sctv_50: c.sctv_50, sctv_75: c.sctv_75
          }).replace(/"/g, '&quot;');
          var clickAttr = jobId ? ' onclick="openCorrection(' + jobId + ", \\'" + safeColorName + "\\', \\'" + safeHex + "\\', \\'" + sctvData + "\\'" + ')" style="cursor:pointer;"' : '';

          return '<tr class="color-row-clickable"' + clickAttr + '>' +
            '<td><span class="' + swatchClass + '" style="background:' + hex + '"></span>' + escapeHtml(c.color_name || '-') + '</td>' +
            '<td><span class="' + deClass + '">' + deVal + '</span></td>' +
            '<td' + (dsCls ? ' class="' + dsCls + '"' : '') + '>' + dsVal + '</td>' +
            '<td>' + dcVal + '</td>' + sctvCells +
            '<td><span class="status-pill status-' + tierTV + '">' + pillTV + '</span></td>' +
            '<td><span class="status-pill status-' + tierDE + '">' + pillDE + '</span></td>' +
            '</tr>';
        };

        tableHtml = '<div class="table-responsive"><table><thead><tr>' +
          '<th>' + (isTR ? 'Renk' : 'Color') + '</th>' +
          '<th title="Delta E (Color Difference)">dE</th>' +
          '<th title="Density / Solid">D/S (%)</th>' +
          '<th title="Chroma Difference">dC*</th>' +
          '<th>5%</th><th>10%</th><th>25%</th><th>50%</th><th>75%</th>' +
          '<th title="Tone Value Status">' + (isTR ? 'Status TV' : 'Status TV') + '</th>' +
          '<th title="Delta E Status">' + (isTR ? 'Status dE' : 'Status dE') + '</th>' +
          '</tr></thead><tbody>';
        measurements.forEach(function(m) { tableHtml += localRenderColorRow(m, job.id); });
        tableHtml += '</tbody></table></div>';
      }

      var unitsTarget = job.target_units || 0;
      var unitsActual = job.curr_units || 0;
      var wasteTotal = job.actual_waste || 0;
      var stopsTotal = job.actual_stops || 0;
      var prodPct = unitsTarget > 0 ? Math.min(100, Math.round(unitsActual / unitsTarget * 100)) : 0;
      var wastePct = unitsActual > 0 ? (wasteTotal / unitsActual * 100).toFixed(1) : '0.0';

      // ── Benchmark Targets ─────────────────────────────────────────────────
      var prevUnits = job.prev_units || 0;
      var newUnits = job.print_units || job.color_count || 0;
      var prevMin = prevUnits * 1;
      var newMin = newUnits * 2;
      var calculatedTarget = prevMin + newMin;
      var mechTargetMin = job.setup_target_min > 0 ? job.setup_target_min : calculatedTarget;

      var tsToDate = function(ts) {
        if (!ts) return null;
        return new Date(ts.endsWith('Z') ? ts : ts + 'Z');
      };
      var msToMin = function(ms) { return ms / 60000; };
      
      var isTR = currentLang === 'tr';

      var splitTargetInfo = '<div style="font-size:10px; color:var(--text-tertiary); margin-top:8px; padding:6px 10px; background:rgba(0,0,0,0.02); border-radius:4px; display:inline-flex; gap:12px; align-items:center;">' +
        '<span title="' + (isTR ? 'Önceki İş' : 'Vorheriger Job') + '"><strong>' + (isTR ? 'Out:' : 'Out:') + '</strong> ' + prevUnits + ' Unit (' + prevMin + 'min)</span>' +
        '<span title="' + (isTR ? 'Yeni İş' : 'Neuer Job') + '"><strong>' + (isTR ? 'In:' : 'In:') + '</strong> ' + newUnits + ' Unit (' + newMin + 'min)</span>' +
        '<span style="color:var(--accent); font-weight:600;">' + (isTR ? 'Hedef:' : 'Goal:') + ' ' + mechTargetMin + ' Min</span>' +
        '</div>';

      // ── Action Buttons & Timer Setup ──────────────────────────────────────
      var actionBtnHtml = '';
      var status = job.job_status || job.status || 'ready';
      
      // FIX: Newly created jobs currently default to status 'active' due to DB schema.
      // If a job is 'active' but has absolutely no timestamps, it's a new job, not in production yet!
      if (status === 'active' && !job.setup_start_at && !job.first_pull_at && !job.prod_start_at) {
        status = 'ready';
      }

      var startTime = null;
      var timerPrefix = '';
      var targetInfo = '';

      if (status === 'ready') {
        actionBtnHtml = '<button class="btn-action-main" onclick="handleJobAction(' + job.id + ', \\'start-setup\\')">▶ ' + (isTR ? 'Setup Başlat' : 'Start Setup') + '</button>';
        targetInfo = splitTargetInfo;
      } else if (status === 'setup') {
        startTime = job.setup_start_at;
        timerPrefix = 'Setup: ';
        targetInfo = splitTargetInfo;
        actionBtnHtml = '<button class="btn-action-main state-setup" onclick="handleJobAction(' + job.id + ', \\'first-pull\\')">✓ ' + (isTR ? 'Andruck (İlk Çekim)' : 'First Pull') + '</button>';
      } else if (status === 'andruck') {
        startTime = job.first_pull_at;
        timerPrefix = 'Andruck: ';
        targetInfo = '<span style="font-size:11px;color:var(--text-secondary);margin-left:6px;">Admin-Ziel: 10 Min</span>';
        var setupModalTitle = isTR ? 'Kurulum Verileri' : 'Setup Metrics';
        actionBtnHtml = '<button class="btn-action-main state-andruck" onclick="openMetricsModal(' + job.id + ', \\'' + setupModalTitle + '\\', ' + unitsActual + ', ' + wasteTotal + ', ' + stopsTotal + ', \\'start-prod\\')">⚡ ' + (isTR ? 'Üretimi Başlat' : 'Start Production') + '</button>';
      } else if (status === 'active') {
        startTime = job.prod_start_at;
        timerPrefix = 'Prod: ';
        var prodModalTitle = isTR ? 'Üretim Verileri' : 'Production Metrics';
        var finishModalTitle = isTR ? 'İşi Bitir' : 'Finish Job';
        actionBtnHtml = '<button class="btn-action-main state-active" onclick="openMetricsModal(' + job.id + ', \\'' + prodModalTitle + '\\', ' + unitsActual + ', ' + wasteTotal + ', ' + stopsTotal + ', \\'\\')">📊 ' + (isTR ? 'Veri Gir' : 'Enter Metrics') + '</button>';
        actionBtnHtml += '<button class="btn-action-sec" onclick="openMetricsModal(' + job.id + ', \\'' + finishModalTitle + '\\', ' + unitsActual + ', ' + wasteTotal + ', ' + stopsTotal + ', \\'complete\\')">Finish</button>';
      }

      // ── Traffic-Light Badges (MECH / ADMIN / PROD) ────────────────────────
      var bs = 'display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;padding:2px 6px;border-radius:4px;margin-left:4px;';
      var mechBadgeHtml = '', adminBadgeHtml = '', prodBadgeHtml = '';

      // Default persistent badges (pill style, neutral color)
      var mechDef = '<span style="' + bs + 'background:rgba(0,0,0,0.06);color:#86868b;">MECH</span>';
      var adminDef = '<span style="' + bs + 'background:rgba(0,0,0,0.06);color:#86868b;">ADMIN</span>';
      var prodDef = '<span style="' + bs + 'background:rgba(0,0,0,0.06);color:#86868b;">PROD</span>';

      if (status !== 'ready' && job.setup_start_at) {
        var setupStart = tsToDate(job.setup_start_at);
        var setupEnd = job.first_pull_at ? tsToDate(job.first_pull_at) : new Date();
        var setupMin = msToMin(setupEnd - setupStart);
        var mechOk = setupMin <= (mechTargetMin || 20);
        mechBadgeHtml = '<span style="' + bs + 'background:' + (mechOk ? '#1a7326' : '#c62828') + ';color:#fff;" title="Setup: ' + Math.round(setupMin) + ' Min / Ziel: ' + mechTargetMin + ' Min">MECH</span>';
      } else {
        mechBadgeHtml = mechDef;
      }

      if ((status === 'andruck' || status === 'active') && job.first_pull_at) {
        var fpStart = tsToDate(job.first_pull_at);
        var fpEnd = job.prod_start_at ? tsToDate(job.prod_start_at) : new Date();
        var adminMin = msToMin(fpEnd - fpStart);
        var adminOk = stopsTotal <= 2 && wasteTotal <= 1000 && adminMin <= 20;
        adminBadgeHtml = '<span style="' + bs + 'background:' + (adminOk ? '#1a7326' : '#c62828') + ';color:#fff;" title="Stopps: ' + stopsTotal + ', Mak: ' + wasteTotal + ', Zeit: ' + Math.round(adminMin) + ' Min">ADMIN</span>';
      } else {
        adminBadgeHtml = adminDef;
      }

      if (status === 'active' && job.prod_start_at) {
        var prodStart = tsToDate(job.prod_start_at);
        var prodMin = msToMin(new Date() - prodStart);
        var speed = prodMin > 0 ? Math.round(unitsActual / prodMin) : 0;
        var prodColor = speed >= 300 ? '#1a7326' : (speed >= 200 ? '#a35b00' : '#c62828');
        prodBadgeHtml = '<span style="' + bs + 'background:' + prodColor + ';color:#fff;" title="Geschwindigkeit: ' + speed + ' m/min">PROD ' + (speed > 0 ? speed : '—') + '</span>';
      } else {
        prodBadgeHtml = prodDef;
      }

      var timerHtml = '';
      if (startTime) {
        var targetMinVal = null;
        if (status === 'setup' && mechTargetMin) targetMinVal = mechTargetMin;
        else if (status === 'andruck') targetMinVal = 10;
        
        var targetAttr = targetMinVal ? ' data-target-min="' + targetMinVal + '"' : '';
        timerHtml = '<span class="live-timer pulsing" data-start="' + startTime + '"' + targetAttr + '>00:00:00</span>';
        if (targetInfo) timerHtml += '<div>' + targetInfo + '</div>';
      } else if (status === 'ready') {
        timerHtml = '<span style="color:var(--text-secondary); font-size:13px;">' + (isTR ? 'Hazırlık Bekleniyor' : 'Awaiting Setup') + '</span>';
        if (targetInfo) timerHtml += '<div>' + targetInfo + '</div>';
      } else {
        timerHtml = '-';
      }

      var statusMap = {
        'ready': isTR ? 'HAZIRLIK BEKLENİYOR' : 'SETUP INITIATED',
        'setup': isTR ? 'KALİBRASYON' : 'CALIBRATING',
        'andruck': isTR ? 'ONAY BEKLENİYOR' : 'VALIDATING',
        'active': isTR ? 'ÜRETİMDE' : 'IN PRODUCTION',
        'completed': isTR ? 'TAMAMLANDI' : 'COMPLETED'
      };
      var headerStatus = statusMap[status] || status.toUpperCase();

      var formatK = function(num) {
        if (num >= 1000) return (num/1000).toFixed(1).replace('.0','') + 'k';
        return num.toString();
      };

      return \`<div class="card">
        <div class="card-head">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
            <div style="flex:1;">
               <div style="font-size:10px; font-weight:600; color:var(--text-secondary); letter-spacing:0.04em; margin-bottom:6px; text-transform:uppercase;">
                 JOB-\${escapeHtml(job.job_number || '')} <span style="margin:0 6px; color:var(--text-tertiary);">|</span> Status: <span style="color:var(--text-primary);">\${headerStatus}</span>
               </div>
               <div class="job-title" style="margin-bottom:0; font-size:16px;">\${escapeHtml(job.job_title || '')}</div>
            </div>
            <div style="width:36px; height:36px; border-radius:50%; background:conic-gradient(var(--accent) \${prodPct}%, rgba(0,0,0,0.06) 0); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
               <div style="width:30px; height:30px; background:var(--surface); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:600;">\${prodPct}%</div>
            </div>
          </div>
          <div class="badges">\${deBadgeHtml}\${colorCountBadge}\${recipeBadgeHtml}\${mechBadgeHtml}\${adminBadgeHtml}\${prodBadgeHtml}</div>
        </div>
        <div class="cockpit-section">
          <!-- Row 1: Production Units & Progress -->
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
               <span class="cockpit-label" style="font-weight:600; font-size:11px; letter-spacing:0.04em; display:flex; align-items:center;">
                 UNITS
                 <a onclick="updateJobUnits(\${job.id}, \${unitsActual}, \${wasteTotal}, \${stopsTotal})" style="cursor:pointer; margin-left:6px; opacity:0.6; font-size:12px;" title="\${isTR ? 'Birimleri Düzenle' : 'Edit Units'}">✏️</a>
               </span>
               <span style="font-size:11px; color:var(--text-secondary); font-weight:500;">Current \${formatK(unitsActual)} / Target \${formatK(unitsTarget)}</span>
            </div>
            <div class="cockpit-progress-bar" style="margin-bottom:0;"><div class="cockpit-progress-fill" style="width:\${prodPct}%"></div></div>
          </div>

          <!-- Row 2: Duration, Waste, Stops -->
          <div style="display:flex; gap:16px; align-items:center;">
            <!-- Duration -->
            <div style="flex:1;">
               <span class="cockpit-label" style="font-weight:600; font-size:10px; letter-spacing:0.04em; margin-bottom:4px; display:block; color:var(--text-secondary);">DURATION</span>
               <span style="font-size:13px; font-weight:600; color:var(--text-primary); font-variant-numeric:tabular-nums;">\${timerPrefix}\${timerHtml}</span>
            </div>

            <!-- Waste Circular Meter -->
            <div style="display:flex; align-items:center; gap:8px;">
               <span class="cockpit-label" style="font-weight:600; font-size:10px; letter-spacing:0.04em; color:var(--text-secondary);">WASTE</span>
               <div class="meter-circle" style="--val:\${Math.min(100, wastePct)}; --meter-color:#1a7326;">
                 <div class="meter-inner">\${wastePct}%</div>
               </div>
            </div>

            <!-- Stops Sign -->
            <div style="display:flex; align-items:center; gap:8px; margin-left:4px;">
               <span class="cockpit-label" style="font-weight:600; font-size:10px; letter-spacing:0.04em; color:var(--text-secondary);">STOPS</span>
               <div class="stop-icon">
                 <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" stroke="#d84315" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                 </svg>
                 <span class="stop-val">\${stopsTotal}</span>
               </div>
            </div>
          </div>
        </div>
        \${tableHtml}
        \${isZeroPull ? '<div class="zero-pull-banner">Zero Pull</div>' : ''}
        <div class="action-btn-wrap">\${actionBtnHtml}</div>
        <div class="card-foot">
          <a onclick="openJobDetail(\${job.id})">\${isTR ? 'Detaylar' : 'Details'}</a>
        </div>
      </div>\`;
    }
`;

/** HTML für das Metrics-Eingabe-Modal */
export const MetricsModalHTML = `
  <div id="metrics-overlay" class="modal-overlay">
    <div class="modal" style="max-width:340px;">
      <div class="modal-head">
        <span class="modal-title" id="metrics-title">Enter Metrics</span>
        <button class="modal-close" onclick="closeMetricsModal()">X</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="metrics-job-id">
        <input type="hidden" id="metrics-next-action">
        <div class="field" id="metrics-actual-field">
          <label data-en="Actual Units" data-tr="Gerçekleşen (Adet)">Actual Units</label>
          <input type="number" id="metrics-actual" placeholder="0">
        </div>
        <div class="field-row">
          <div class="field">
            <label data-en="Waste" data-tr="Makulatur">Waste</label>
            <input type="number" id="metrics-waste" placeholder="0">
          </div>
          <div class="field">
            <label data-en="Stops" data-tr="Duruşlar">Stops</label>
            <input type="number" id="metrics-stops" placeholder="0">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" onclick="closeMetricsModal()" data-en="Cancel" data-tr="Iptal">Cancel</button>
          <button class="btn-primary" onclick="submitMetrics()" data-en="Update" data-tr="Güncelle">Update</button>
        </div>
      </div>
    </div>
  </div>
`;

/**
 * Live-Timer — aktualisiert .live-timer alle 1000ms.
 * Fix: Zeitstempel ohne 'Z'-Suffix werden korrekt als UTC behandelt.
 */
export const renderTimer = `
    function renderTimer() {
      document.querySelectorAll('.live-timer').forEach(function(el) {
        var startStr = el.getAttribute('data-start');
        if (!startStr) return;
        var start = new Date(startStr.endsWith('Z') ? startStr : startStr + 'Z');
        var targetMin = el.getAttribute('data-target-min');
        var now = new Date();
        var elapsed = Math.floor((now - start) / 1000);
        
        var displayStr = "";
        var isNegative = false;

        if (targetMin) {
          var targetSec = parseInt(targetMin) * 60;
          var remaining = targetSec - elapsed;
          if (remaining < 0) {
            isNegative = true;
            remaining = Math.abs(remaining);
            el.style.color = "#c62828"; // Red
          } else {
            el.style.color = "#0071e3"; // Accent blue
          }
          var m = Math.floor(remaining / 60);
          var s = remaining % 60;
          displayStr = (isNegative ? "-" : "") + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        } else {
          if (elapsed < 0) elapsed = 0;
          var h = Math.floor(elapsed / 3600);
          var m = Math.floor((elapsed % 3600) / 60);
          var s = elapsed % 60;
          displayStr = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        }
        el.textContent = displayStr;
      });
    }
    setInterval(renderTimer, 1000);
`;

/** Logik für das Metrics-Modal & Job-Actions */
export const metricsModalLogic = `
    function openMetricsModal(jobId, title, actual, waste, stops, nextAction) {
      document.getElementById('metrics-job-id').value = jobId;
      document.getElementById('metrics-next-action').value = nextAction || '';
      document.getElementById('metrics-title').textContent = title || (currentLang === 'tr' ? 'Veri Gir' : 'Enter Metrics');
      document.getElementById('metrics-actual').value = actual || '';
      document.getElementById('metrics-waste').value = waste || '';
      document.getElementById('metrics-stops').value = stops || '';
      
      var showActual = (nextAction !== 'start-prod');
      var actualField = document.getElementById('metrics-actual-field');
      if (actualField) actualField.style.display = showActual ? 'block' : 'none';

      document.getElementById('metrics-overlay').classList.add('open');
      setTimeout(function() { 
         if (showActual) document.getElementById('metrics-actual').focus(); 
         else document.getElementById('metrics-waste').focus();
      }, 80);
    }

    function closeMetricsModal() {
      document.getElementById('metrics-overlay').classList.remove('open');
    }

    async function submitMetrics() {
      var id = document.getElementById('metrics-job-id').value;
      var nextAction = document.getElementById('metrics-next-action').value;
      var actual = parseInt(document.getElementById('metrics-actual').value) || 0;
      var waste = parseInt(document.getElementById('metrics-waste').value) || 0;
      var stops = parseInt(document.getElementById('metrics-stops').value) || 0;
      try {
        var res = await fetch('/api/jobs/' + id + '/performance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stops: stops, waste: waste, units: actual })
        });
        if (res.ok) {
          if (nextAction === 'start-prod') {
            await fetch('/api/jobs/' + id + '/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start-prod' }) });
            showToast(currentLang === 'tr' ? 'Üretim başladı' : 'Production started');
          } else if (nextAction === 'complete') {
            await fetch('/api/jobs/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
            showToast(currentLang === 'tr' ? 'İş tamamlandı' : 'Job completed');
          } else {
            showToast(currentLang === 'tr' ? 'Veriler güncellendi' : 'Metrics updated');
          }
          closeMetricsModal();
          if (typeof loadDashboard === 'function') loadDashboard();
        }
      } catch(e) { showToast('Error updating metrics'); }
    }

    async function handleJobAction(id, action) {
      try {
        var res = await fetch('/api/jobs/' + id + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: action })
        });
        if (res.ok) {
          showToast(currentLang === 'tr' ? 'İşlem başarılı' : 'Action successful');
          if (typeof loadDashboard === 'function') loadDashboard();
        }
      } catch(e) { showToast('Action failed'); }
    }

    async function completeJob(id) {
       if (!confirm(currentLang === 'tr' ? 'İşi bitirmek istediğinize emin misiniz?' : 'Are you sure you want to finish this job?')) return;
       try {
         var res = await fetch('/api/jobs/' + id, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ status: 'completed' })
         });
         if (res.ok) {
           showToast(currentLang === 'tr' ? 'İş tamamlandı' : 'Job completed');
           if (typeof loadDashboard === 'function') loadDashboard();
         }
       } catch(e) { showToast('Failed to complete job'); }
    }

    document.addEventListener('DOMContentLoaded', function() {
      var overlay = document.getElementById('metrics-overlay');
      if (overlay) {
        overlay.addEventListener('click', function(e) {
          if (e.target === e.currentTarget) closeMetricsModal();
        });
      }
    });
`;
