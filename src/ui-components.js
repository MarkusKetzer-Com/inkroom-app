// src/ui-components.js

/** renderJobCard — Performance Cockpit card with benchmarks & traffic-light badges */
export const renderJobCard = `
    function renderJobCard(job) {
      if (!job) return '';

      // Helper: renders a single dE input row with a visual bar
      function renderDeRow(jobId, colorKey, colorLabel, lastVal, colorHex) {
        var swatchStyle = colorHex ? 'background:' + colorHex + '; border:0.5px solid rgba(0,0,0,0.1);' : 'background:#ccc;';
        var isWhite = colorHex && (colorHex.toLowerCase() === '#ffffff' || colorHex.toLowerCase() === '#fff');
        if (isWhite) swatchStyle += ' border:0.5px solid rgba(0,0,0,0.2);';
        var inputId = 'admin-de-' + jobId + '-' + colorKey;
        return '<div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">' +
          '<span style="width:9px; height:9px; border-radius:50%; flex-shrink:0; display:inline-block; ' + swatchStyle + '"></span>' +
          '<span style="font-size:10px; color:var(--text-secondary); width:50px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + escapeHtml(colorLabel) + '">' + escapeHtml(colorLabel) + '</span>' +
          '<div style="flex:1; position:relative;">' +
            '<div style="position:relative; height:3px; background:rgba(0,0,0,0.06); border-radius:2px; margin-bottom:3px;">' +
              '<div style="position:absolute; left:50%; top:-3px; width:1px; height:9px; background:rgba(0,0,0,0.2);"></div>' +
              '<div style="position:absolute; right:0; top:-2px; width:1px; height:7px; background:#c62828; opacity:0.5;"></div>' +
            '</div>' +
          '</div>' +
          '<input id="' + inputId + '" type="number" step="0.01" min="0" max="10" placeholder="dE" value="' + (lastVal !== '' && lastVal !== null ? lastVal : '') + '" ' +
            'style="width:52px; padding:3px 5px; border:0.5px solid var(--border); border-radius:5px; font-size:11px; text-align:right; font-variant-numeric:tabular-nums;" ' +
            'oninput="adminDeChange(' + jobId + ', ' + "'" + colorKey + "'" + ', this.value)">' +
          '</div>';
      }

      var measurements = job.measurements || [];
      var deVals = measurements.map(function(m) { return Number(m.de); }).filter(function(v) { return !isNaN(v); });
      var avgDe = deVals.length ? deVals.reduce(function(a, b) { return a + b; }, 0) / deVals.length : null;
      var avgTier = getTier(avgDe);
      var isTR = currentLang === 'tr';

      var expectedColors = job.color_count || measurements.length || 0;
      var measuredColors = measurements.length;
      var progressPct = expectedColors > 0 ? Math.min(100, Math.round(measuredColors / expectedColors * 100)) : 0;

      var unitsTarget = job.target_units || 0;
      var unitsActual = job.curr_units || 0;
      var wasteTotal = job.actual_waste || 0;
      var stopsTotal = job.actual_stops || 0;
      var prodPct = unitsTarget > 0 ? Math.min(100, Math.round(unitsActual / unitsTarget * 100)) : 0;
      var wastePct = unitsActual > 0 ? (wasteTotal / unitsActual * 100).toFixed(1) : '0.0';

      // ── MECH Logic ────────────────────────────────────────────────────────
      var prevUnits = job.prev_units || 0;
      var newUnits = job.print_units || job.color_count || 0;
      var prevMin = prevUnits * 1;
      var newMin = newUnits * 2;
      var calculatedTarget = prevMin + newMin;
      var mechTargetMin = Math.max(2, calculatedTarget);

      var tsToDate = function(ts) {
        if (!ts) return null;
        return new Date(ts.endsWith('Z') ? ts : ts + 'Z');
      };
      var msToMin = function(ms) { return ms / 60000; };
      
      var statusMap = {
        'ready': isTR ? 'HAZIRLIK BEKLENİYOR' : 'SETUP INITIATED',
        'setup': isTR ? 'KALİBRASYON' : 'CALIBRATING',
        'andruck': isTR ? 'ONAY BEKLENİYOR' : 'VALIDATING',
        'active': isTR ? 'ÜRETİMDE' : 'IN PRODUCTION',
        'completed': isTR ? 'TAMAMLANDI' : 'COMPLETED'
      };
      var status = job.job_status || job.status || 'ready';
      if (status === 'active' && !job.setup_start_at && !job.first_pull_at && !job.prod_start_at) status = 'ready';
      var headerStatus = statusMap[status] || status.toUpperCase();

      var timerHtml = '';
      var startTime = null;
      if (status === 'setup') startTime = job.setup_start_at;
      else if (status === 'andruck') startTime = job.first_pull_at;
      else if (status === 'active') startTime = job.prod_start_at;

      if (startTime) {
        var tTarget = (status === 'setup') ? mechTargetMin : (status === 'andruck' ? 10 : null);
        var tAttr = tTarget ? ' data-target-min="' + tTarget + '"' : '';
        timerHtml = '<span class="live-timer pulsing" data-start="' + startTime + '"' + tAttr + '>00:00</span>';
      }

      var actionBtnLabel = (status === 'ready') ? (isTR ? 'Setup Başlat' : 'Start Setup') :
                          (status === 'setup') ? (isTR ? 'İlk Çekim' : 'First Pull') :
                          (status === 'andruck') ? (isTR ? 'Üretime Başla' : 'Start Prod') : (isTR ? 'Veri Gir' : 'Metrics');
      
      var actionFn = (status === 'ready') ? "handleJobAction(" + job.id + ", 'start-setup')" :
                     (status === 'setup') ? "handleJobAction(" + job.id + ", 'first-pull')" :
                     (status === 'andruck') ? "handleJobAction(" + job.id + ", 'start-prod')" :
                     "openMetricsModal(" + job.id + ", 'Metrics', " + unitsActual + ", " + wasteTotal + ", " + stopsTotal + ", ''");


      return \`<div class="cockpit-grid">
        <!-- TILE 1: JOB INFO -->
        <div class="cockpit-tile">
          <div class="tile-title"><span>📂</span>\${isTR ? 'İŞ BİLGİSİ' : 'JOB INFO'}</div>
          <div style="font-size:16px; font-weight:700; margin-bottom:4px;">\${escapeHtml(job.job_number || '')}</div>
          <div style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-bottom:12px; line-height:1.2; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            \${escapeHtml(job.job_title || '')}
          </div>
          <div style="margin-top:auto; display:flex; flex-direction:column; gap:8px;">
            <div class="badge badge-neutral" style="text-align:center; padding:4px;">\${headerStatus}</div>
            <button class="btn-primary" style="width:100%; border-radius:8px;" onclick="openNewJobModal(\${job.press_id})">+ \${isTR ? 'Yeni İş' : 'New Job'}</button>
          </div>
        </div>

        <!-- TILE 2: MECH PHASE -->
        <div class="cockpit-tile">
          <div class="tile-title"><span>🔧</span>\${isTR ? 'MECH SETUP' : 'MECH PHASE'}</div>
          <div style="display:flex; flex-direction:column; gap:10px; flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; color:var(--text-secondary);">Out Units:</span>
              <div style="display:flex; align-items:center; background:var(--bg); border:0.5px solid var(--border); border-radius:6px; overflow:hidden;">
                <button style="padding:2px 8px; border:none; background:none; cursor:pointer; font-size:16px; border-right:0.5px solid var(--border);" onclick="updateJobPrevUnits(\${job.id}, -1)">-</button>
                <span style="min-width:30px; text-align:center; font-weight:700; font-size:13px;">\${prevUnits}</span>
                <button style="padding:2px 8px; border:none; background:none; cursor:pointer; font-size:16px; border-left:0.5px solid var(--border);" onclick="updateJobPrevUnits(\${job.id}, 1)">+</button>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; color:var(--text-secondary);">In Units:</span>
              <span style="font-weight:700; font-size:14px;">\${newUnits}</span>
            </div>
            <div style="margin-top:auto; padding-top:10px; border-top:0.5px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; flex-direction:column;">
                <span style="font-size:10px; font-weight:600; color:var(--text-tertiary);">GOAL</span>
                <span style="color:var(--accent); font-weight:800; font-size:16px;">\${mechTargetMin} Min</span>
              </div>
              <div style="text-align:right;">
                \${timerHtml ? '<div style="font-size:10px; font-weight:600; color:var(--text-tertiary);">TIMER</div>' + timerHtml : ''}
              </div>
            </div>
            <button class="btn-action-main \${status === 'setup' ? 'state-setup' : ''}" style="margin-top:4px; font-size:12px; border-radius:8px; padding:8px;" onclick="\${actionFn}">
              \${actionBtnLabel}
            </button>
          </div>
        </div>

        <!-- TILE 3: ADMIN 1 — Current Pull Form -->
        \${(function() {
          var adminPulls = job.admin_pulls || [];
          var pullCount  = job.admin_pull_count || 0;
          var adminDone  = job.admin_done;
          var adminOut   = job.admin_out;
          var inAdmin    = (status === 'andruck' || (status === 'active' && !adminDone));

          if (!inAdmin && !adminDone) {
            return '<div class="cockpit-tile"><div class="tile-title"><span>📝</span>ADMIN 1</div><div class="tile-placeholder">' + (isTR ? 'Setup bekleniyor...' : 'Awaiting setup start...') + '</div></div>';
          }

          if (adminDone) {
            var lastPull = adminPulls[adminPulls.length - 1] || {};
            return '<div class="cockpit-tile" style="border-color:rgba(29,115,36,0.3); background:rgba(29,115,36,0.04);">' +
              '<div class="tile-title"><span>✅</span>ADMIN 1 — Freigegeben</div>' +
              '<div style="font-size:12px; color:var(--text-secondary); margin-top:8px;">' + pullCount + ' Pull(s) · ' + (job.admin_waste_m || 0) + 'm Abfall (inkl. Splice)</div>' +
              '</div>';
          }

          // Build dE input rows for each color
          var jobColors = job.measurements || [];
          var colorKeys = { cyan:'de_cyan', magenta:'de_magenta', yellow:'de_yellow', black:'de_black', spot1:'de_spot1', spot2:'de_spot2', spot3:'de_spot3', spot4:'de_spot4', spot5:'de_spot5', spot6:'de_spot6' };
          var colorMap  = { cyan:'Cyan', magenta:'Magenta', yellow:'Yellow', black:'Black' };
          var spotIdx = 1;
          var deRowsHtml = '';

          // Show CMYK if relevant
          ['cyan','magenta','yellow','black'].forEach(function(k) {
            var col = jobColors.find(function(m){ return m.color_name === colorMap[k]; });
            if (col || (job.has_cmyk && ['cyan','magenta','yellow','black'].indexOf(k) >= 0)) {
              // Last pull val
              var lastVal = adminPulls.length > 0 ? (adminPulls[adminPulls.length-1][colorKeys[k]] || '') : '';
              deRowsHtml += renderDeRow(job.id, k, colorMap[k], lastVal, col ? col.color_hex : null);
            }
          });

          // Spot colors
          jobColors.forEach(function(m){
            if (['Cyan','Magenta','Yellow','Black'].indexOf(m.color_name) >= 0) return;
            var spotKey = 'spot' + spotIdx;
            spotIdx++;
            if (spotIdx > 7) return;
            var keyInDb = colorKeys[spotKey];
            var lastVal = adminPulls.length > 0 ? (adminPulls[adminPulls.length-1][keyInDb] || '') : '';
            deRowsHtml += renderDeRow(job.id, spotKey, m.color_name, lastVal, m.color_hex);
          });

          var currentPullNum = pullCount + 1;
          return '<div class="cockpit-tile">' +
            '<div class="tile-title"><span>📝</span>ADMIN PULL ' + currentPullNum + '</div>' +
            '<div style="display:flex; flex-direction:column; gap:6px; flex:1;">' +
            deRowsHtml +
            '<div style="margin-top:auto; padding-top:8px; border-top:0.5px solid var(--border-subtle); display:flex; gap:8px;">' +
            '<input id="admin-waste-' + job.id + '" type="number" placeholder="Waste (m)" min="0" style="flex:1; padding:6px 8px; border:0.5px solid var(--border); border-radius:6px; font-size:12px;" oninput="adminWasteChange(' + job.id + ', this.value)">' +
            '<button style="background:var(--accent); color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;" onclick="submitAdminPull(' + job.id + ')">Pull ' + currentPullNum + ' sichern ✓</button>' +
            '</div>' +
            '</div></div>';
        })()}

        <!-- TILE 4: ADMIN 2 — Freigabe / OUT -->
        \${(function() {
          var adminPulls  = job.admin_pulls || [];
          var pullCount   = job.admin_pull_count || 0;
          var adminOut    = job.admin_out;
          var adminDone   = job.admin_done;
          var wasteTotal  = job.admin_waste_m || 0;
          var pullTimeMin = (window.systemSettings && window.systemSettings.pull_time_min) || 10;
          var pullWasteM  = (window.systemSettings && window.systemSettings.pull_waste_m)  || 500;
          var inAdmin     = (status === 'andruck' || (status === 'active' && !adminDone));

          if (!inAdmin && !adminDone) {
            return '<div class="cockpit-tile"><div class="tile-title"><span>⚡</span>ADMIN 2</div><div class="tile-placeholder">' + (isTR ? 'Onay bekleniyor...' : 'Waiting for approval...') + '</div></div>';
          }

          if (adminDone) {
            return '<div class="cockpit-tile" style="border-color:rgba(29,115,36,0.3); background:rgba(29,115,36,0.04);">' +
              '<div class="tile-title"><span>✅</span>ADMIN 2 — Freigegeben</div>' +
              '<div style="font-size:13px; font-weight:700; color:#1a7326; margin-top:12px;">Produktion läuft ✅</div>' +
              '</div>';
          }

          if (adminOut) {
            return '<div class="cockpit-tile" style="border-color:#c62828; background:rgba(198,40,40,0.06);">' +
              '<div class="tile-title" style="color:#c62828;"><span>⛔</span>SETUP OUT</div>' +
              '<div style="font-size:13px; font-weight:700; color:#c62828; margin:12px 0 4px;">Budget überschritten!</div>' +
              '<div style="font-size:11px; color:var(--text-secondary);">' + wasteTotal + 'm Abfall verbraucht</div>' +
              '<div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">' + pullCount + ' Pulls durchgeführt</div>' +
              '</div>';
          }

          if (pullCount < 1) {
            return '<div class="cockpit-tile" style="opacity:0.5;"><div class="tile-title"><span>⚡</span>ADMIN 2</div><div class="tile-placeholder">Warte auf Pull 1...</div></div>';
          }

          // Budget bars
          var elapsedMin = 0;
          if (job.admin_start_at) {
            var startMs = new Date(job.admin_start_at.endsWith('Z') ? job.admin_start_at : job.admin_start_at + 'Z');
            elapsedMin = Math.round((new Date() - startMs) / 60000);
          }
          var timeBarPct  = Math.min(100, Math.round(elapsedMin  / pullTimeMin * 100));
          var wasteBarPct = Math.min(100, Math.round(wasteTotal  / pullWasteM  * 100));
          var timeColor   = timeBarPct  < 70 ? '#1a7326' : (timeBarPct  < 90 ? '#a35b00' : '#c62828');
          var wasteColor  = wasteBarPct < 70 ? '#1a7326' : (wasteBarPct < 90 ? '#a35b00' : '#c62828');

          // Show last pull's dE summary
          var lastPull = adminPulls[adminPulls.length - 1] || {};
          var deKeys   = ['de_cyan','de_magenta','de_yellow','de_black','de_spot1','de_spot2'];
          var deLabels = ['C','M','Y','K','S1','S2'];
          var deSummary = '';
          deKeys.forEach(function(k, i) {
            if (lastPull[k] != null) {
              var v = Number(lastPull[k]);
              var col = v < 2.0 ? '#1a7326' : '#c62828';
              deSummary += '<span style="font-size:10px; font-weight:700; color:' + col + '; background:' + (v < 2.0 ? 'rgba(29,115,36,0.08)' : 'rgba(198,40,40,0.08)') + '; padding:2px 5px; border-radius:4px; margin:2px;">' + deLabels[i] + ': ' + v.toFixed(2) + '</span>';
            }
          });

          return '<div class="cockpit-tile">' +
            '<div class="tile-title"><span>⚡</span>ADMIN 2 — Pull ' + pullCount + ' Ergebnis</div>' +
            (deSummary ? '<div style="display:flex; flex-wrap:wrap; gap:2px; margin-bottom:10px;">' + deSummary + '</div>' : '') +
            '<div style="margin-bottom:8px;">' +
              '<div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-tertiary); margin-bottom:3px;"><span>⏱ Zeit</span><span>' + elapsedMin + ' / ' + pullTimeMin + ' Min</span></div>' +
              '<div style="height:5px; background:rgba(0,0,0,0.06); border-radius:3px;"><div style="height:100%; width:' + timeBarPct + '%; background:' + timeColor + '; border-radius:3px; transition:width 0.4s;"></div></div>' +
            '</div>' +
            '<div style="margin-bottom:12px;">' +
              '<div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-tertiary); margin-bottom:3px;"><span>🗑 Abfall</span><span>' + wasteTotal + ' / ' + pullWasteM + ' m</span></div>' +
              '<div style="height:5px; background:rgba(0,0,0,0.06); border-radius:3px;"><div style="height:100%; width:' + wasteBarPct + '%; background:' + wasteColor + '; border-radius:3px; transition:width 0.4s;"></div></div>' +
            '</div>' +
            '<div style="margin-top:auto; display:flex; gap:8px;">' +
              '<button style="flex:1; background:#1a7326; color:#fff; border:none; border-radius:8px; padding:10px; font-size:13px; font-weight:700; cursor:pointer;" onclick="triggerFreigabe(' + job.id + ')">✅ Freigabe</button>' +
            '</div>' +
            '</div>';
        })()}

        <!-- TILE 5: PROD PHASE -->
        <div class="cockpit-tile">
          <div class="tile-title"><span>🚀</span>\${isTR ? 'PROD ANALİZ' : 'PROD PHASE'}</div>
          <div class="tile-placeholder">\${isTR ? 'Üretim bekleniyor...' : 'Waiting for production...'}</div>
        </div>

        <!-- TILE 6: SUMMARY -->
        <div class="cockpit-tile">
          <div class="tile-title"><span>🏁</span>\${isTR ? 'ÖZET' : 'SUMMARY'}</div>
          <div class="tile-placeholder">\${isTR ? 'İş sonucu...' : 'Job result...'}</div>
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
