import {
  parseXer,
  getTable,
  buildPredecessorMap,
  getCalendarMap,
  durationHoursToDays,
} from '../vendor/lens-parser/index.js';

// A small, entirely made-up 15-activity schedule (no real project, no client
// data) used only for the "try a sample" button, so a visitor without their
// own XER handy can still see what the tool finds. Deliberately mixes clean
// and flagged items across most categories.
// Real, working P6 calendar-data blobs (5-day and 6-day, each with a small
// holiday-exceptions block), copied verbatim from an actual P6 export rather
// than hand-written, since the nested-paren grammar is proprietary and a
// hand-rolled guess parsed as "unparsed" work days on the first attempt.
const CAL_5DAY = '(0||CalendarData()((0||DaysOfWeek()((0||1()())(0||2()((0||0(s|08:00|f|16:00)())))(0||3()((0||0(s|08:00|f|16:00)())))(0||4()((0||0(s|08:00|f|16:00)())))(0||5()((0||0(s|08:00|f|16:00)())))(0||6()((0||0(s|08:00|f|16:00)())))(0||7()())))(0||Exceptions()((0||0(d|46192)())(0||0(d|46206)())(0||0(d|46272)())))))';
const CAL_6DAY = '(0||CalendarData()((0||DaysOfWeek()((0||1()())(0||2()((0||0(s|08:00|f|16:00)())))(0||3()((0||0(s|08:00|f|16:00)())))(0||4()((0||0(s|08:00|f|16:00)())))(0||5()((0||0(s|08:00|f|16:00)())))(0||6()((0||0(s|08:00|f|16:00)())))(0||7()((0||0(s|08:00|f|16:00)())))))(0||Exceptions()((0||0(d|46192)())(0||0(d|46206)())(0||0(d|46272)())))))';
const SAMPLE_XER = [
  'ERMHDR\t18.8\t2026-07-24\tProject\tsample\tSample Data\tdb\tPM\tCAD',
  '%T\tPROJECT',
  '%F\tproj_id\tproj_short_name\tplan_start_date\tlast_recalc_date',
  '%R\t1\tSAMPLE-SCHOOL\t2026-06-01\t2026-07-24 08:00',
  '%T\tCALENDAR',
  '%F\tclndr_id\tclndr_name\tday_hr_cnt\tweek_hr_cnt\tclndr_data',
  `%R\t1\t5 Day Standard\t8\t40\t${CAL_5DAY}`,
  `%R\t2\t6 Day Accelerated\t8\t48\t${CAL_6DAY}`,
  '%T\tTASK',
  '%F\ttask_id\ttask_code\ttask_name\ttask_type\tstatus_code\ttarget_drtn_hr_cnt\ttotal_float_hr_cnt\tcstr_type\tcstr_date\tclndr_id\tact_start_date\tact_end_date',
  '%R\t1\tA1000\tProject Start\tTT_Mile\tTK_Complete\t0\t0\t\t\t1\t2026-06-01\t2026-06-01',
  '%R\t2\tA1010\tMobilize site\tTT_Task\tTK_Complete\t40\t0\t\t\t1\t2026-06-02\t',
  '%R\t3\tA1020\tExcavate foundations\tTT_Task\tTK_Active\t120\t0\t\t\t1\t\t',
  '%R\t4\tA1030\tForm and pour footings\tTT_Task\tTK_NotStarted\t80\t0\t\t\t2\t\t',
  '%R\t5\tA1040\tBackfill\tTT_Task\tTK_NotStarted\t40\t0\t\t\t1\t\t',
  '%R\t6\tA1050\tUnderground utilities rough-in\tTT_Task\tTK_NotStarted\t160\t0\t\t\t1\t\t',
  '%R\t7\tA1060\tStructural steel erection\tTT_Task\tTK_NotStarted\t480\t0\t\t\t1\t\t',
  '%R\t8\tA1070\tRoofing\tTT_Task\tTK_NotStarted\t120\t0\tCS_MEO\t2027-01-15\t1\t\t',
  '%R\t9\tA1080\tExterior envelope\tTT_Task\tTK_NotStarted\t160\t0\t\t\t1\t\t',
  '%R\t10\tA1090\tMEP rough-in\tTT_Task\tTK_NotStarted\t200\t0\t\t\t1\t\t',
  '%R\t11\tA1100\tDrywall and finishes\tTT_Task\tTK_NotStarted\t160\t0\t\t\t1\t\t',
  '%R\t12\tA1110\tInspections\tTT_Task\tTK_NotStarted\t40\t-40\t\t\t1\t\t',
  '%R\t13\tA1120\tPunch list\tTT_Task\tTK_NotStarted\t80\t0\t\t\t1\t\t',
  '%R\t14\tA1130\tSubstantial completion\tTT_FinMile\tTK_NotStarted\t0\t0\t\t\t1\t\t',
  '%R\t15\tA1140\tSite landscaping\tTT_Task\tTK_NotStarted\t80\t0\t\t\t1\t\t',
  '%T\tTASKPRED',
  '%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt',
  '%R\t2\t1\tPR_FS\t0',
  '%R\t3\t2\tPR_FS\t0',
  '%R\t4\t3\tPR_FS\t0',
  '%R\t5\t4\tPR_FS\t24',
  '%R\t7\t5\tPR_FS\t0',
  '%R\t8\t7\tPR_FS\t0',
  '%R\t9\t8\tPR_FS\t-40',
  '%R\t10\t7\tPR_FS\t0',
  '%R\t10\t6\tPR_FS\t0',
  '%R\t11\t9\tPR_FS\t0',
  '%R\t11\t10\tPR_FS\t0',
  '%R\t12\t11\tPR_FS\t0',
  '%R\t13\t12\tPR_FS\t0',
  '%R\t14\t13\tPR_FS\t0',
  '',
].join('\n');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const sampleBtn = document.getElementById('try-sample-btn');
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
sampleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  try {
    processXerText(SAMPLE_XER, 'sample-elementary-school.xer (made up, not a real project)');
  } catch (err) {
    console.error(err);
    showError('Could not process the sample. Please refresh and try again.');
  }
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
    processXerText(text, file.name);
  } catch (err) {
    console.error(err);
    showError('Could not read that file. It may not be a standard P6 XER export. Nothing was uploaded anywhere: this all ran in your browser.');
  }
}

function processXerText(text, filename) {
  errorBox.hidden = true;
  results.hidden = true;
  results.innerHTML = '';
  const model = parseXer(text, { filename });
  const report = buildReport(model, { name: filename });
  renderReport(report);
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
  // An activity missing BOTH ends only counts once here (a set of activity
  // IDs, not a sum), so this can never exceed 100% of activities the way
  // noPred+noSucc can when an isolated activity is missing both.
  const openEndIds = new Set();

  for (const t of realTasks) {
    const id = t.task_id;
    if (!predecessors[id] && t.task_type !== 'TT_Mile') { noPred++; openEndIds.add(id); }
    if (!successors[id] && !finishMilestoneTypes.has(t.task_type)) { noSucc++; openEndIds.add(id); }

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
      metric('Open ends', openEndIds.size, pct(openEndIds.size), 5,
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
  if (r.activityCount === 0) {
    results.hidden = false;
    results.innerHTML = `
      <div class="report-head">
        <div>
          <div class="report-project">No activities found</div>
          <div class="report-meta">${escapeHtml(r.filename)}</div>
        </div>
      </div>
      <p class="report-disclaimer">This file parsed, but there's no TASK table with any activities in it, so there's nothing to check. That usually means it isn't a standard P6 XER export, or it's a schedule with genuinely no activities yet. This isn't a "clean" result, it's an empty one.</p>
    `;
    return;
  }
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

// Reads window.CHECKOUT_LINKS (set in checkout-links.js) and turns on any
// product card whose link is filled in: removes the "Launching soon" badge
// and swaps the disabled button for a real link to checkout. A product left
// as null in checkout-links.js is untouched.
(function enableCheckoutLinks() {
  const links = window.CHECKOUT_LINKS || {};
  document.querySelectorAll('[data-product]').forEach((card) => {
    const url = links[card.dataset.product];
    if (!url) return;
    const badge = card.querySelector('.badge-soon');
    if (badge) badge.remove();
    const btn = card.querySelector('[data-buy-button]');
    if (!btn) return;
    const link = document.createElement('a');
    link.href = url;
    link.className = btn.className;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Buy now';
    btn.replaceWith(link);
  });
})();
