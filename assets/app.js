import {
  parseXer,
  getTable,
  buildPredecessorMap,
  getCalendarMap,
  durationHoursToDays,
} from '../vendor/lens-parser/index.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const results = document.getElementById('results');
const errorBox = document.getElementById('tool-error');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  errorBox.hidden = true;
  results.hidden = true;
  results.innerHTML = '';

  if (!/\.xer$/i.test(file.name)) {
    return showError('That doesn’t look like a .xer file. Export your schedule from P6 as XER and try again.');
  }

  try {
    const buf = await file.arrayBuffer();
    const text = decodeXerBuffer(buf);
    const model = parseXer(text, { filename: file.name });
    const report = buildReport(model, file);
    renderReport(report);
  } catch (err) {
    console.error(err);
    showError('Could not read that file. It may not be a standard P6 XER export. Nothing was uploaded anywhere: this all ran in your browser.');
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function decodeXerBuffer(buf) {
  const bytes = new Uint8Array(buf);
  // Minimal BOM sniff, covers the encodings TextDecoder can actually handle.
  // (UTF-32 XER exports are rare enough that we fall back to utf-8 for them.)
  let encoding = 'utf-8';
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
    else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) encoding = 'utf-8';
  }
  try {
    return new TextDecoder(encoding).decode(buf);
  } catch (_) {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

const HARD_CONSTRAINTS = new Set(['CS_MSO', 'CS_MEO', 'CS_MANDSTART', 'CS_MANDFIN']);
const SOFT_CONSTRAINTS = new Set(['CS_MSOA', 'CS_MSOB', 'CS_MEOA', 'CS_MEOB', 'CS_ALAP']);

function buildReport(model, file) {
  const project = getTable(model, 'PROJECT')[0] || {};
  const tasks = getTable(model, 'TASK');
  const preds = getTable(model, 'TASKPRED');
  const calendars = getTable(model, 'CALENDAR');
  const { predecessors, successors } = buildPredecessorMap(model);
  const calMap = getCalendarMap(model);

  const realTasks = tasks.filter(t => t.task_type !== 'TT_WBS');
  const startMilestoneTypes = new Set(['TT_FinMile']); // finish types don't need successors
  const finishMilestoneTypes = new Set(['TT_FinMile']);

  let noPred = 0, noSucc = 0, hardConstraints = 0, softConstraints = 0;
  let negativeFloat = 0, longDurations = 0, unknownCalendar = 0, statusFlips = 0;
  const knownCals = new Set(calendars.map(c => c.clndr_id));
  const longList = [];

  for (const t of realTasks) {
    const id = t.task_id;
    const isStartType = t.task_type === 'TT_Mile' && !predecessors[id];
    if (!predecessors[id] && t.task_type !== 'TT_Mile') noPred++;
    else if (!predecessors[id] && t.task_type === 'TT_Mile') { /* start milestones legitimately have none */ }
    if (!successors[id] && !finishMilestoneTypes.has(t.task_type)) noSucc++;

    if (HARD_CONSTRAINTS.has(t.cstr_type)) hardConstraints++;
    else if (SOFT_CONSTRAINTS.has(t.cstr_type)) softConstraints++;

    const floatHrs = parseFloat(t.total_float_hr_cnt);
    if (Number.isFinite(floatHrs) && floatHrs < 0) negativeFloat++;

    if (t.clndr_id && !knownCals.has(t.clndr_id)) unknownCalendar++;

    const cal = calMap[t.clndr_id];
    const days = durationHoursToDays(t.target_drtn_hr_cnt, cal, 8, 1);
    if (days > 44 && t.task_type !== 'TT_LOE') {
      longDurations++;
      longList.push({ code: t.task_code, name: t.task_name, days });
    }

    if (t.status_code === 'TK_NotStarted' && t.act_start_date) statusFlips++;
    if (t.status_code === 'TK_Complete' && !t.act_end_date) statusFlips++;
  }

  let leads = 0, nonFS = 0;
  for (const p of preds) {
    const lag = parseFloat(p.lag_hr_cnt);
    if (Number.isFinite(lag) && lag < 0) leads++;
    if (p.pred_type && p.pred_type !== 'PR_FS') nonFS++;
  }

  const total = realTasks.length || 1;
  const pct = (n) => Math.round((n / total) * 1000) / 10;

  const calRows = calendars.map(c => {
    const info = calMap[c.clndr_id] || {};
    return {
      name: c.clndr_name || c.clndr_id,
      hoursPerDay: info.hours_per_day,
      workDays: (info.work_day_names || []).join('/') || 'unparsed',
      holidays: (info.holidays || []).length,
    };
  });

  return {
    filename: file.name,
    projectName: project.proj_short_name || '(name not found)',
    dataDate: project.last_recalc_date || project.plan_start_date || '(not found)',
    activityCount: realTasks.length,
    relationshipCount: preds.length,
    calendarCount: calendars.length,
    calRows,
    checks: [
      metric('Open ends', noPred + noSucc, pct(noPred + noSucc), 5,
        `${noPred} activities with no predecessor, ${noSucc} with no successor (excluding start/finish milestones).`),
      metric('Hard constraints', hardConstraints, pct(hardConstraints), 5,
        `Activities with a fixed date lock (Mandatory or "On" constraint) that can override logic.`),
      metric('Negative lags (leads)', leads, pct(leads), 0,
        `Relationships with negative lag. P6 leads are a common source of illogical fast-tracking.`),
      metric('Non finish-to-start logic', nonFS, pct(nonFS), 10,
        `Relationships that aren’t simple Finish-to-Start (SS, FF, SF). Some are legitimate; a high share is a smell.`),
      metric('Activities over 44 working days', longDurations, pct(longDurations), 5,
        `Long, unbroken activities that usually need to be split for real progress tracking.`),
      metric('Negative total float', negativeFloat, pct(negativeFloat), 0,
        `Activities already behind their own logic. Worth checking before anything else.`),
      metric('Unresolved calendar references', unknownCalendar, pct(unknownCalendar), 0,
        `Activities pointing at a calendar ID that isn’t in this file’s CALENDAR table.`),
      metric('Status/date mismatches', statusFlips, pct(statusFlips), 0,
        `Not-started activities carrying an actual start date, or complete activities missing an actual finish.`),
    ],
    longList: longList.slice(0, 15),
  };
}

function metric(label, count, pctVal, threshold, note) {
  const flagged = pctVal > threshold;
  return { label, count, pctVal, threshold, note, flagged };
}

function renderReport(r) {
  const flaggedCount = r.checks.filter(c => c.flagged).length;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="report-head">
      <div>
        <div class="report-project">${escapeHtml(r.projectName)}</div>
        <div class="report-meta">${escapeHtml(r.filename)} &middot; data date ${escapeHtml(r.dataDate)} &middot; ${r.activityCount} activities &middot; ${r.relationshipCount} relationships &middot; ${r.calendarCount} calendar${r.calendarCount === 1 ? '' : 's'}</div>
      </div>
      <div class="report-score ${flaggedCount === 0 ? 'good' : flaggedCount <= 2 ? 'ok' : 'warn'}">
        ${flaggedCount === 0 ? 'No flags' : flaggedCount + ' item' + (flaggedCount === 1 ? '' : 's') + ' to look at'}
      </div>
    </div>
    <div class="checks">
      ${r.checks.map(c => `
        <div class="check ${c.flagged ? 'flagged' : ''}">
          <div class="check-top">
            <span class="check-label">${escapeHtml(c.label)}</span>
            <span class="check-count">${c.count} <span class="check-pct">(${c.pctVal}%)</span></span>
          </div>
          <div class="check-note">${escapeHtml(c.note)}</div>
        </div>
      `).join('')}
    </div>
    ${r.calRows.length ? `
    <div class="cal-table-wrap">
      <div class="section-label">Calendars in this file</div>
      <table class="cal-table">
        <thead><tr><th>Name</th><th>Hrs/day</th><th>Work days</th><th>Holidays</th></tr></thead>
        <tbody>
          ${r.calRows.map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(String(c.hoursPerDay ?? ''))}</td><td>${escapeHtml(c.workDays)}</td><td>${c.holidays}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
    ${r.longList.length ? `
    <div class="cal-table-wrap">
      <div class="section-label">Longest activities (over 44 working days)</div>
      <table class="cal-table">
        <thead><tr><th>Code</th><th>Name</th><th>Working days</th></tr></thead>
        <tbody>
          ${r.longList.map(t => `<tr><td>${escapeHtml(t.code || '')}</td><td>${escapeHtml(t.name || '')}</td><td>${t.days}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
    <p class="report-disclaimer">This is a fast structural read, not a full DCMA-14 audit or a critical path recalculation. No schedule dates were verified against logic. Use it to spot obvious housekeeping issues before a deeper review.</p>
  `;
  results.hidden = false;
  results.appendChild(el);
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
