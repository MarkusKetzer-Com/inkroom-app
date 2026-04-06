
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

      var safeColorName = (c.color_name || '').replace(/'/g, "\'");
      var safeHex = (hex || '').replace(/'/g, "\'");
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

      var tableHtml = '';
      if (measurements.length === 0 && job.status === 'ready') {
        tableHtml = '<div class="no-measurements">' + (isTR ? 'Hazırlık bekleniyor' : 'Waiting for setup') + '</div>';
      } else {
        tableHtml = '<div class="table-responsive"><table><thead><tr>' +
          '<th>' + (isTR ? 'Renk' : 'Color') + '</th>' +
          '<th>dE</th><th>D/S</th><th>dC*</th>' +
          '<th>5%</th><th>10%</th><th>25%</th><th>50%</th><th>75%</th>' +
          '<th title="Tone Value Status">' + (isTR ? 'Status TV' : 'Status TV') + '</th>' +
          '<th title="Delta E Status">' + (isTR ? 'Status dE' : 'Status dE') + '</th>' +
          '</tr></thead><tbody>';
        measurements.forEach(function(m) { tableHtml += renderColorRow(m, job.id); });
        tableHtml += '</tbody></table></div>';
      }

      var unitsTarget = job.target_units || 0;
      var unitsActual = job.curr_units || 0;
      var wasteTotal = job.actual_waste || 0;
      var stopsTotal = job.actual_stops || 0;
      var prodPct = unitsTarget > 0 ? Math.min(100, Math.round(unitsActual / unitsTarget * 100)) : 0;
      var wastePct = unitsActual > 0 ? (wasteTotal / unitsActual * 100).toFixed(1) : '0.0';

      // ── Benchmark Targets ─────────────────────────────────────────────────
      var mechTargetMin = ((job.prev_units || 8) + (job.curr_units || 8)) * 2;

      var tsToDate = function(ts) {
        if (!ts) return null;
        return new Date(ts.endsWith('Z') ? ts : ts + 'Z');
      };
      var msToMin = function(ms) { return ms / 60000; };

      // ── Action Buttons & Timer Setup ──────────────────────────────────────
      var actionBtnHtml = '';
      var status = job.job_status || job.status || 'ready';
      var startTime = null;
      var timerPrefix = '';
      var targetInfo = '';

      if (status === 'ready') {
        actionBtnHtml = '<button class="btn-action-main" onclick="handleJobAction(' + job.id + ', \'start-setup\')">▶ ' + (isTR ? 'Setup Başlat' : 'Start Setup') + '</button>';
      } else if (status === 'setup') {
        startTime = job.setup_start_at;
        timerPrefix = 'Setup: ';
        targetInfo = '<span style="font-size:11px;color:var(--text-secondary);margin-left:6px;">Ziel: ' + mechTargetMin + ' Min</span>';
        actionBtnHtml = '<button class="btn-action-main state-setup" onclick="handleJobAction(' + job.id + ', \'first-pull\')">✓ ' + (isTR ? 'Andruck (İlk Çekim)' : 'First Pull') + '</button>';
      } else if (status === 'andruck') {
        startTime = job.first_pull_at;
        timerPrefix = 'Andruck: ';
        targetInfo = '<span style="font-size:11px;color:var(--text-secondary);margin-left:6px;">Admin-Ziel: 10 Min</span>';
        actionBtnHtml = '<button class="btn-action-main state-andruck" onclick="handleJobAction(' + job.id + ', \'start-prod\')">⚡ ' + (isTR ? 'Üretimi Başlat' : 'Start Production') + '</button>';
      } else if (status === 'active') {
        startTime = job.prod_start_at;
        timerPrefix = 'Prod: ';
        actionBtnHtml = '<button class="btn-action-main state-active" onclick="openMetricsModal(' + job.id + ', \'' + escapeHtml(job.job_title || '') + '\', ' + unitsActual + ', ' + wasteTotal + ', ' + stopsTotal + ')">📊 ' + (isTR ? 'Veri Gir' : 'Enter Metrics') + '</button>';
        actionBtnHtml += '<button class="btn-action-sec" onclick="completeJob(' + job.id + ')">Finish</button>';
      }

      // ── Traffic-Light Badges (MECH / ADMIN / PROD) ────────────────────────
      var bs = 'display:inline-block;font-size:9px;font-weight:700;letter-spacing:.04em;padding:2px 5px;border-radius:4px;margin-left:4px;';
      var mechBadgeHtml = '', adminBadgeHtml = '', prodBadgeHtml = '';

      if (status !== 'ready' && job.setup_start_at) {
        var setupStart = tsToDate(job.setup_start_at);
        var setupEnd = job.first_pull_at ? tsToDate(job.first_pull_at) : new Date();
        var setupMin = msToMin(setupEnd - setupStart);
        var mechOk = setupMin <= mechTargetMin;
        mechBadgeHtml = '<span style="' + bs + 'background:' + (mechOk ? '#1a7326' : '#c62828') + ';color:#fff;" title="Setup: ' + Math.round(setupMin) + ' Min / Ziel: ' + mechTargetMin + ' Min">MECH</span>';
      }

      if ((status === 'andruck' || status === 'active') && job.first_pull_at) {
        var fpStart = tsToDate(job.first_pull_at);
        var fpEnd = job.prod_start_at ? tsToDate(job.prod_start_at) : new Date();
        var adminMin = msToMin(fpEnd - fpStart);
        var adminOk = stopsTotal <= 2 && wasteTotal <= 1000 && adminMin <= 20;
        adminBadgeHtml = '<span style="' + bs + 'background:' + (adminOk ? '#1a7326' : '#c62828') + ';color:#fff;" title="Stopps: ' + stopsTotal + ', Mak: ' + wasteTotal + ', Zeit: ' + Math.round(adminMin) + ' Min">ADMIN</span>';
      }

      if (status === 'active' && job.prod_start_at) {
        var prodStart = tsToDate(job.prod_start_at);
        var prodMin = msToMin(new Date() - prodStart);
        var speed = prodMin > 0 ? Math.round(unitsActual / prodMin) : 0;
        var prodColor = speed >= 300 ? '#1a7326' : (speed >= 200 ? '#a35b00' : '#c62828');
        prodBadgeHtml = '<span style="' + bs + 'background:' + prodColor + ';color:#fff;" title="Geschwindigkeit: ' + speed + ' m/min">PROD ' + (speed > 0 ? speed : '—') + '</span>';
      }

      var timerHtml = startTime ? '<span class="live-timer" data-start="' + startTime + '">00:00:00</span>' + targetInfo : '-';

      return `<div class="card">
        <div class="card-head">
          <div class="job-id">${escapeHtml(job.job_number || '')}</div>
          <div class="job-title">${escapeHtml(job.job_title || '')}</div>
          <div class="badges">${deBadgeHtml}${colorCountBadge}${mechBadgeHtml}${adminBadgeHtml}${prodBadgeHtml}</div>
        </div>
        <div class="cockpit-section">
          <div class="cockpit-grid">
            <div class="cockpit-stat">
              <span class="cockpit-label">${isTR ? 'Durum / Süre' : 'State / Duration'}</span>
              <span class="cockpit-val">${timerPrefix}${timerHtml}</span>
            </div>
            <div class="cockpit-stat" style="text-align:right;">
              <span class="cockpit-label">${isTR ? 'Üretim (Adet)' : 'Production (Units)'}</span>
              <span class="cockpit-val">${unitsActual.toLocaleString()} / ${unitsTarget.toLocaleString()}</span>
            </div>
          </div>
          <div class="cockpit-progress-bar"><div class="cockpit-progress-fill" style="width:${prodPct}%"></div></div>
          <div style="display:flex; justify-content:space-between; margin-top:10px;">
             <div class="cockpit-stat"><span class="cockpit-label">${isTR ? 'Makulatur' : 'Waste'}</span><span class="cockpit-val" style="color:#d84315;">${wastePct}%</span></div>
             <div class="cockpit-stat" style="text-align:right;"><span class="cockpit-label">${isTR ? 'Duruşlar' : 'Stops'}</span><span class="cockpit-val">${stopsTotal}</span></div>
          </div>
        </div>
        ${tableHtml}
        ${isZeroPull ? '<div class="zero-pull-banner">Zero Pull</div>' : ''}
        <div class="action-btn-wrap">${actionBtnHtml}</div>
        <div class="card-foot">
          <a onclick="openJobDetail(${job.id})">${isTR ? 'Detaylar' : 'Details'}</a>
          <span class="foot-sep">|</span>
          <a onclick="openNewMeasurement(${job.id})">${isTR ? 'Ölçüm Ekle' : '+ Measurement'}</a>
        </div>
      </div>`;
    }


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
      document.getElementById('nj-count').value = '';
      document.getElementById('nj-target').value = '';
      document.getElementById('new-job-overlay').classList.add('open');
      setTimeout(function() { document.getElementById('nj-number').focus(); }, 80);
    }

    function closeNewJobModal() {
      document.getElementById('new-job-overlay').classList.remove('open');
    }

    async function submitNewJob() {
      var job_number = document.getElementById('nj-number').value.trim();
      var job_title = document.getElementById('nj-title').value.trim();
      var color_count = parseInt(document.getElementById('nj-count').value) || 0;
      var target_units = parseInt(document.getElementById('nj-target').value) || 0;
      var press_id = parseInt(document.getElementById('nj-press-id').value) || null;

      if (!job_number || !job_title) {
        showToast(currentLang === 'tr' ? 'Is numarasi ve basligi gereklidir' : 'Job number and title are required');
        return;
      }

      try {
        var res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_number: job_number, job_title: job_title, color_count: color_count, press_id: press_id, target_units: target_units })
        });
        var data = await res.json();
        if (data.error) { showToast('Error: ' + data.error); return; }
        closeNewJobModal();
        showToast(currentLang === 'tr' ? 'Is olusturuldu' : 'Job created');
        loadDashboard();
      } catch (e) {
        showToast(currentLang === 'tr' ? 'Hata olustu' : 'An error occurred');
      }
    }

    // ── New Measurement modal ─────────────────────────────────────────────
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

        if (colorOrder.length === 0) {
          html += '<p style="color:var(--text-tertiary);font-size:13px;padding:20px 0;">' + (currentLang === 'tr' ? 'Henuz olcum yok.' : 'No measurements yet.') + '</p>';
        } else {
          for (var ci = 0; ci < colorOrder.length; ci++) {
            var colorName = colorOrder[ci];
            var rows = colors[colorName] || [];
            var lastHex = '#888888';
            for (var ri = rows.length - 1; ri >= 0; ri--) { if (rows[ri].color_hex) { lastHex = rows[ri].color_hex; break; } }

            html += '<div class="detail-color-group">';
            html += '<div class="detail-color-name"><span class="swatch" style="background:' + lastHex + '"></span>' + escapeHtml(colorName) + '</div>';
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
    
    function renderTimer() {
      document.querySelectorAll('.live-timer').forEach(function(el) {
        var startStr = el.getAttribute('data-start');
        if (!startStr) return;
        var start = new Date(startStr.endsWith('Z') ? startStr : startStr + 'Z');
        var now = new Date();
        var diff = Math.floor((now - start) / 1000);
        if (diff < 0) diff = 0;
        var h = Math.floor(diff / 3600);
        var m = Math.floor((diff % 3600) / 60);
        var s = diff % 60;
        el.textContent = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
      });
    }
    setInterval(renderTimer, 1000);

    
    function openMetricsModal(jobId, title, actual, waste, stops) {
      document.getElementById('metrics-job-id').value = jobId;
      document.getElementById('metrics-title').textContent = (currentLang === 'tr' ? 'Veri Gir: ' : 'Metrics: ') + title;
      document.getElementById('metrics-actual').value = actual || '';
      document.getElementById('metrics-waste').value = waste || '';
      document.getElementById('metrics-stops').value = stops || '';
      document.getElementById('metrics-overlay').classList.add('open');
      setTimeout(function() { document.getElementById('metrics-actual').focus(); }, 80);
    }

    function closeMetricsModal() {
      document.getElementById('metrics-overlay').classList.remove('open');
    }

    async function submitMetrics() {
      var id = document.getElementById('metrics-job-id').value;
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
          closeMetricsModal();
          showToast(currentLang === 'tr' ? 'Veriler güncellendi' : 'Metrics updated');
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

    // ── Init ─────────────────────────────────────────────────────────────
    applyLang(currentLang);
    loadDashboard();
  