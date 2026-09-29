import {
  parseXer,
  getTable,
  detectBomEncoding,
  getCalendarMap,
  durationHoursToDays,
} from '../vendor/lens-parser/index.js';
import { undecodedCalendars, calendarNotice } from './calendar-notice.js';

// A small, entirely made-up 15-activity schedule (no real project, no client
// data) used only for the "try a sample" button, so a visitor without their
// own XER handy can still see what the tool finds. Deliberately mixes clean
// and flagged items across most categories.
// Every row is a state P6 can actually export. The one deliberate defect is
// A1010: complete with no actual finish, which the status and date check is
// meant to catch. In-progress activities carry an actual start, because P6
// makes you enter one when you status an activity In Progress, and dates carry
// the HH:MM that P6 always writes.
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
  '%R\t1\tSAMPLE-SCHOOL\t2026-06-01 08:00\t2026-07-24 08:00',
  '%T\tCALENDAR',
  '%F\tclndr_id\tclndr_name\tday_hr_cnt\tweek_hr_cnt\tclndr_data',
  `%R\t1\t5 Day Standard\t8\t40\t${CAL_5DAY}`,
  `%R\t2\t6 Day Accelerated\t8\t48\t${CAL_6DAY}`,
  '%T\tTASK',
  '%F\ttask_id\ttask_code\ttask_name\ttask_type\tstatus_code\ttarget_drtn_hr_cnt\ttotal_float_hr_cnt\tcstr_type\tcstr_date\tclndr_id\tact_start_date\tact_end_date',
  '%R\t1\tA1000\tProject Start\tTT_Mile\tTK_Complete\t0\t0\t\t\t1\t2026-06-01 08:00\t2026-06-01 08:00',
  '%R\t2\tA1010\tMobilize site\tTT_Task\tTK_Complete\t40\t0\t\t\t1\t2026-06-02 08:00\t',
  '%R\t3\tA1020\tExcavate foundations\tTT_Task\tTK_Active\t120\t0\t\t\t1\t2026-07-06 08:00\t',
  '%R\t4\tA1030\tForm and pour footings\tTT_Task\tTK_NotStart\t80\t0\t\t\t2\t\t',
  '%R\t5\tA1040\tBackfill\tTT_Task\tTK_NotStart\t40\t0\t\t\t1\t\t',
  '%R\t6\tA1050\tUnderground utilities rough-in\tTT_Task\tTK_NotStart\t160\t0\t\t\t1\t\t',
  '%R\t7\tA1060\tStructural steel erection\tTT_Task\tTK_NotStart\t480\t0\t\t\t1\t\t',
  '%R\t8\tA1070\tRoofing\tTT_Task\tTK_NotStart\t120\t0\tCS_MEO\t2027-01-15 16:00\t1\t\t',
  '%R\t9\tA1080\tExterior envelope\tTT_Task\tTK_NotStart\t160\t0\t\t\t1\t\t',
  '%R\t10\tA1090\tMEP rough-in\tTT_Task\tTK_NotStart\t200\t0\t\t\t1\t\t',
  '%R\t11\tA1100\tDrywall and finishes\tTT_Task\tTK_NotStart\t160\t0\t\t\t1\t\t',
  '%R\t12\tA1110\tInspections\tTT_Task\tTK_NotStart\t40\t-40\t\t\t1\t\t',
  '%R\t13\tA1120\tPunch list\tTT_Task\tTK_NotStart\t80\t0\t\t\t1\t\t',
  '%R\t14\tA1130\tSubstantial completion\tTT_FinMile\tTK_NotStart\t0\t0\t\t\t1\t\t',
  '%R\t15\tA1140\tSite landscaping\tTT_Task\tTK_NotStart\t80\t0\t\t\t1\t\t',
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
  // BOM sniff comes from the vendored parser, which ports the canonical
  // _detect_bom_encoding. UTF-16 exports are decoded straight from the BOM.
  // (UTF-32 XER exports are rare enough that they fall through to the UTF-8
  // attempt below, the same as before.)
  const bom = detectBomEncoding(new Uint8Array(buf));
  if (bom === 'utf-16-le') return new TextDecoder('utf-16le').decode(buf);
  if (bom === 'utf-16-be') return new TextDecoder('utf-16be').decode(buf);

  // No BOM, or a UTF-8 BOM. P6 writes XER in the export machine's ANSI code
  // page unless UTF-8 was chosen, so a plain export from a Western Windows
  // machine is windows-1252, not UTF-8.
  //
  // {fatal: true} is what makes the fallback below reachable. A default
  // TextDecoder never throws on bad bytes, it quietly substitutes U+FFFD, so
  // an earlier version of this function could never reach its own windows-1252
  // branch and rendered "Bétonnage des semelles" as "B?tonnage des semelles"
  // on every accented ANSI export. Strict UTF-8 throws instead, and then the
  // windows-1252 decode actually runs.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (_) {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

// P6's actual status_code values, verified by counting them across 12 real XER
// exports: 2,169 not-started, 28 active, 15 complete, and no other value.
//
// Mind the spelling. The not-started code ends in "Start", with no trailing
// "ed". An earlier version of this file tested against a spelling with the
// "ed" on the end, which matches nothing in a real export, so the status and
// date mismatch check silently reported zero on every schedule ever dropped
// into it. Keep these as named constants so the literal appears exactly once.
const STATUS_NOT_STARTED = 'TK_NotStart';
const STATUS_IN_PROGRESS = 'TK_Active';
const STATUS_COMPLETE = 'TK_Complete';

// Level of effort and WBS summary rows are out of scope for every check in
// this report, activity checks and logic checks alike. Same rule as the
// canonical parser (xer_parser.py: EXCLUDED_TASK_TYPES = {'TT_WBS', 'TT_LOE'},
// "excluded from CP / duration analyses") and standard DCMA practice: an LOE
// activity is a hammock that takes its dates from the work it spans, so its
// float is meaningless, it is open-ended by design, and its start-to-start and
// finish-to-finish ties are bookkeeping rather than network logic. Counting
// them flags schedules that a review would pass.
const EXCLUDED_TASK_TYPES = new Set(['TT_WBS', 'TT_LOE']);

// Milestones have one end each, so the open-ends check exempts start
// milestones from the predecessor test and finish milestones from the
// successor test.
const START_MILESTONE = 'TT_Mile';
const FINISH_MILESTONE = 'TT_FinMile';

const HARD_CONSTRAINTS = new Set(['CS_MSO', 'CS_MEO', 'CS_MANDSTART', 'CS_MANDFIN']);

function buildReport(model, file) {
  const project = getTable(model, 'PROJECT')[0] || {};
  const tasks = getTable(model, 'TASK');
  const allPreds = getTable(model, 'TASKPRED');
  const calendars = getTable(model, 'CALENDAR');
  const calMap = getCalendarMap(model);

  const realTasks = tasks.filter(t => !EXCLUDED_TASK_TYPES.has(t.task_type));
  const excludedCount = tasks.length - realTasks.length;
  const realTaskIds = new Set(realTasks.map(t => t.task_id));

  // A relationship is in scope only when both of its ends are in-scope
  // activities, so the logic checks and the activity checks are reading the
  // same schedule. Without this an LOE hammock's SS and FF ties land in the
  // non-finish-to-start count for logic the analyst never wrote.
  const preds = allPreds.filter(p => realTaskIds.has(p.task_id) && realTaskIds.has(p.pred_task_id));

  // Same grouping the vendored buildPredecessorMap does, over the in-scope
  // relationships: which activities have a predecessor, which have a successor.
  const hasPredecessor = new Set();
  const hasSuccessor = new Set();
  for (const p of preds) {
    hasPredecessor.add(p.task_id);
    hasSuccessor.add(p.pred_task_id);
  }

  let noPred = 0, noSucc = 0, hardConstraints = 0;
  let negativeFloat = 0, longDurations = 0, unknownCalendar = 0, statusFlips = 0;
  const knownCals = new Set(calendars.map(c => c.clndr_id));
  const longList = [];
  // An activity missing BOTH ends only counts once here (a set of activity
  // IDs, not a sum), so this can never exceed 100% of activities the way
  // noPred+noSucc can when an isolated activity is missing both.
  const openEndIds = new Set();

  for (const t of realTasks) {
    const id = t.task_id;
    if (!hasPredecessor.has(id) && t.task_type !== START_MILESTONE) { noPred++; openEndIds.add(id); }
    if (!hasSuccessor.has(id) && t.task_type !== FINISH_MILESTONE) { noSucc++; openEndIds.add(id); }

    if (HARD_CONSTRAINTS.has(t.cstr_type)) hardConstraints++;

    const floatHrs = parseFloat(t.total_float_hr_cnt);
    if (Number.isFinite(floatHrs) && floatHrs < 0) negativeFloat++;

    if (t.clndr_id && !knownCals.has(t.clndr_id)) unknownCalendar++;

    const cal = calMap[t.clndr_id];
    const days = durationHoursToDays(t.target_drtn_hr_cnt, cal, 8, 1);
    if (days > 44) {
      longDurations++;
      longList.push({ code: t.task_code, name: t.task_name, days });
    }

    // P6 will not let you status an activity In Progress without an actual
    // start, or Complete without an actual finish, so either state in a file
    // means the row was written by something other than P6, or edited after.
    if (t.status_code === STATUS_NOT_STARTED && t.act_start_date) statusFlips++;
    if (t.status_code === STATUS_IN_PROGRESS && !t.act_start_date) statusFlips++;
    if (t.status_code === STATUS_COMPLETE && !t.act_end_date) statusFlips++;
  }

  let leads = 0, nonFS = 0;
  for (const p of preds) {
    const lag = parseFloat(p.lag_hr_cnt);
    if (Number.isFinite(lag) && lag < 0) leads++;
    if (p.pred_type && p.pred_type !== 'PR_FS') nonFS++;
  }

  // Two denominators, deliberately. Activity checks are a share of activities;
  // leads and non-finish-to-start logic are counted over TASKPRED, so they are
  // a share of relationships, which is how the finish-to-start convention is
  // always stated. Dividing relationship counts by the activity count inflates
  // both numbers on any real schedule, where relationships outnumber
  // activities, and can print a share above 100%.
  const share = (n, of) => Math.round((n / (of || 1)) * 1000) / 10;
  const actPct = (n) => share(n, realTasks.length);
  const relPct = (n) => share(n, preds.length);

  // Data date and planned start are different dates. If the PROJECT row has no
  // last_recalc_date, say which date is actually on screen instead of putting
  // the planned start under a "data date" label.
  const hasDataDate = Boolean(project.last_recalc_date);
  const dataDate = project.last_recalc_date || project.plan_start_date || '(not found)';
  const dataDateLabel = hasDataDate ? 'data date'
    : project.plan_start_date ? 'plan start, no data date in this file'
    : 'data date';

  const calRows = calendars.map(c => {
    const info = calMap[c.clndr_id] || {};
    return {
      name: c.clndr_name || c.clndr_id,
      hoursPerDay: info.hours_per_day,
      workDays: (info.work_day_names || []).join('/') || 'unparsed',
      holidays: (info.holidays || []).length,
    };
  });
  // Calendars whose work week the parser could not read are named under the
  // table, not left as an unexplained "unparsed" (see calendar-notice.js).
  const calNotice = calendarNotice(undecodedCalendars(calendars, calMap));

  // Longest first, so the table titled "longest" leads with the longest one.
  // Ties break on activity code to keep the order stable between runs.
  longList.sort((a, b) => b.days - a.days || String(a.code || '').localeCompare(String(b.code || '')));

  return {
    filename: file.name,
    projectName: project.proj_short_name || '(name not found)',
    dataDate,
    dataDateLabel,
    activityCount: realTasks.length,
    relationshipCount: preds.length,
    excludedCount,
    calendarCount: calendars.length,
    calRows,
    calNotice,
    checks: [
      metric('Open ends', openEndIds.size, actPct(openEndIds.size), 'activities', 5,
        `${noPred} with no predecessor, ${noSucc} with no successor. Start milestones are exempt from the predecessor test and finish milestones from the successor test, since each has only one end. An activity missing both ends counts once here.`),
      metric('Hard constraints', hardConstraints, actPct(hardConstraints), 'activities', 5,
        `Activities with a fixed date lock (Mandatory or "On" constraint) that can override logic.`),
      metric('Negative lags (leads)', leads, relPct(leads), 'relationships', 0,
        `Relationships with negative lag. P6 leads are a common source of illogical fast-tracking.`),
      metric('Non finish-to-start logic', nonFS, relPct(nonFS), 'relationships', 10,
        `Relationships that aren’t simple Finish-to-Start (SS, FF, SF), as a share of all relationships. Some are legitimate; a high share is a smell.`),
      metric('Activities over 44 working days', longDurations, actPct(longDurations), 'activities', 5,
        `Long, unbroken activities that usually need to be split for real progress tracking.`),
      metric('Negative total float', negativeFloat, actPct(negativeFloat), 'activities', 0,
        `Activities already behind their own logic. Worth checking before anything else.`),
      metric('Unresolved calendar references', unknownCalendar, actPct(unknownCalendar), 'activities', 0,
        `Activities pointing at a calendar ID that isn’t in this file’s CALENDAR table.`),
      metric('Status/date mismatches', statusFlips, actPct(statusFlips), 'activities', 0,
        `Not-started activities carrying an actual start, in-progress activities missing one, or complete activities missing an actual finish.`),
    ],
    longList,
  };
}

function metric(label, count, pctVal, basis, threshold, note) {
  const flagged = pctVal > threshold;
  return { label, count, pctVal, basis, threshold, note, flagged };
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
      <p class="report-disclaimer">${r.excludedCount
        ? `This file parsed, but every one of its ${r.excludedCount} activity rows is a level of effort or WBS summary row, and those are left out of these checks, so there is nothing here to check.`
        : `This file parsed, but there's no TASK table with any activities in it, so there's nothing to check. That usually means it isn't a standard P6 XER export, or it's a schedule with genuinely no activities yet.`} This isn't a "clean" result, it's an empty one.</p>
    `;
    return;
  }
  const flaggedCount = r.checks.filter(c => c.flagged).length;
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="report-head">
      <div>
        <div class="report-project">${escapeHtml(r.projectName)}</div>
        <div class="report-meta">${escapeHtml(r.filename)} &middot; ${escapeHtml(r.dataDateLabel)} ${escapeHtml(r.dataDate)} &middot; ${r.activityCount} ${r.activityCount === 1 ? 'activity' : 'activities'} &middot; ${r.relationshipCount} relationship${r.relationshipCount === 1 ? '' : 's'} &middot; ${r.calendarCount} calendar${r.calendarCount === 1 ? '' : 's'}${r.excludedCount ? ` &middot; ${r.excludedCount} level of effort or WBS summary row${r.excludedCount === 1 ? '' : 's'} left out` : ''}</div>
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
            <span class="check-count">${c.count} <span class="check-pct">(${c.pctVal}% of ${escapeHtml(c.basis)})</span></span>
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
      ${r.calNotice ? `<p class="cal-note">${escapeHtml(r.calNotice)}</p>` : ''}
    </div>` : ''}
    ${r.longList.length ? `
    <div class="section-label">Activities over 44 working days${r.longList.length > 1 ? `, longest first (all ${r.longList.length} listed)` : ''}</div>
    <div class="cal-table-wrap" style="max-height: 460px; overflow-y: auto;">
      <table class="cal-table">
        <thead><tr><th>Code</th><th>Name</th><th>Working days</th></tr></thead>
        <tbody>
          ${r.longList.map(t => `<tr><td>${escapeHtml(t.code || '')}</td><td>${escapeHtml(t.name || '')}</td><td>${t.days}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}
    <p class="report-disclaimer">This is a fast structural read, not a full DCMA-14 audit or a critical path recalculation. No schedule dates were verified against logic. Level of effort and WBS summary rows are left out of every count here, and so are the relationships attached to them, the same way a review leaves them out. Use it to spot obvious housekeeping issues before a deeper review.</p>
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

// Checkout availability.
//
// A buy URL lives in exactly one place: the href on that product's "Buy now"
// link in index.html. Nothing here invents or repeats a URL, so a visitor with
// JavaScript blocked, or a page this script never reaches, still shows a real
// link for every product that is actually on sale.
//
// checkout-links.js says which products are on sale. This code only ever takes
// a product away: a key set to null, set to false, or missing entirely turns
// that product's link back into a disabled "Checkout unavailable" button. That
// is why a product with no listing yet is authored as a disabled button in the
// markup rather than as a link this script would have to switch on.
const CHECKOUT_UNAVAILABLE_LABEL = 'Checkout unavailable';

// A control is a real buy link only if it carries an absolute URL. "#", an
// empty href, or a <button> is not a place a buyer can be sent.
function buyUrlOf(control) {
  const href = control.getAttribute && control.getAttribute('href');
  return href && href.includes('://') ? href : '';
}

function withdrawProduct(control) {
  if (control.tagName === 'BUTTON' && control.disabled) return;
  const off = control.ownerDocument.createElement('button');
  off.type = 'button';
  off.className = control.className;
  off.disabled = true;
  off.setAttribute('data-buy-button', '');
  off.textContent = CHECKOUT_UNAVAILABLE_LABEL;
  control.replaceWith(off);
}

// Withdraws every product that is not on sale, and returns the list of things
// that are wrong with the pair of files. The guard derives both sides from
// what is actually there, the data-product blocks in the markup and the keys
// in checkout-links.js, so a product added to one file and forgotten in the
// other is reported instead of shipping quietly.
function applyCheckoutAvailability(root, availability) {
  const problems = [];
  const blocks = Array.from(root.querySelectorAll('[data-product]'));
  const keysInMarkup = new Set(blocks.map((b) => b.dataset.product));

  for (const [key, value] of Object.entries(availability)) {
    if (typeof value === 'string' && value.includes('://')) {
      problems.push(`checkout-links.js carries a URL for "${key}". A buy URL belongs on the Buy now link in index.html and nowhere else.`);
    }
    if (!keysInMarkup.has(key)) {
      problems.push(`checkout-links.js lists "${key}", which has no data-product block in index.html.`);
    }
  }

  for (const block of blocks) {
    const key = block.dataset.product;
    const control = block.querySelector('[data-buy-button]');
    if (!control) {
      problems.push(`Product block "${key}" has no [data-buy-button] control.`);
      continue;
    }
    const declared = Object.prototype.hasOwnProperty.call(availability, key);
    if (!declared) {
      problems.push(`Product block "${key}" has no entry in checkout-links.js, so it is treated as withdrawn.`);
    }
    const marked = declared && Boolean(availability[key]);
    const url = buyUrlOf(control);
    if (marked && !url) {
      problems.push(`Product "${key}" is marked on sale in checkout-links.js but its Buy now control carries no buy URL in index.html.`);
    }
    if (!marked || !url) withdrawProduct(control);
  }

  return problems;
}

(function checkoutAvailabilityBootstrap() {
  const problems = applyCheckoutAvailability(document, window.CHECKOUT_AVAILABILITY || {});
  for (const problem of problems) console.error(`checkout: ${problem}`);
})();
