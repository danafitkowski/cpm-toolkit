// Run from the repo root with: node --test
//
// The free check names a calendar whose work week the parser could not read.
// The folder starts with an underscore so GitHub Pages (Jekyll) does not
// publish it with the site.
//
// THE FIXTURE (synthetic)
//
//   C1  5-Day            start-first slots  (s|08:00|f|16:00)  decodes Mon-Fri
//   C2  Six Day Shift    finish-first slots (f|16:00|s|08:00)  decodes Mon-Sat
//   C3  Night Shift      slot tokens the parser does not know   UNREAD
//   C4  (no name)        slot tokens the parser does not know   UNREAD, named by ID
//   C5  Blank            empty clndr_data                       not a decode failure:
//                        the parser returns early on an empty string, as the
//                        canonical Python parser does, so it is not named
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseXer, getTable, getCalendarMap } from '../vendor/lens-parser/index.js';
import { undecodedCalendars, calendarNotice } from '../assets/calendar-notice.js';

const DAYS = (slot) => {
  const day = (n, on) => on ? `(0||${n}()((0||0(${slot})())))` : `(0||${n}()())`;
  return [day(1, false), day(2, true), day(3, true), day(4, true), day(5, true), day(6, true), day(7, slot.startsWith('f|'))].join('');
};
const CAL = (slot) => `(0||CalendarData()((0||DaysOfWeek()(${DAYS(slot)}))(0||Exceptions()((0||0(d|46192)())))))`;

const START_FIRST = CAL('s|08:00|f|16:00');
const FINISH_FIRST = CAL('f|16:00|s|08:00');
const UNKNOWN_SLOTS = CAL('b|08:00|e|16:00');

function xer(calRows) {
  return [
    'ERMHDR\t18.8\t2026-09-29\tProject\tadmin\tSynthetic\tdb\tPM\tCAD',
    '%T\tPROJECT',
    '%F\tproj_id\tproj_short_name\tlast_recalc_date',
    '%R\t1\tSYNTH\t2026-09-01 08:00',
    '%T\tCALENDAR',
    '%F\tclndr_id\tclndr_name\tday_hr_cnt\tweek_hr_cnt\tclndr_data',
    ...calRows.map(r => `%R\t${r.join('\t')}`),
    ''
  ].join('\n');
}

function notice(text) {
  const model = parseXer(text);
  return calendarNotice(undecodedCalendars(getTable(model, 'CALENDAR'), getCalendarMap(model)));
}

const MIXED = xer([
  ['C1', '5-Day', '8', '40', START_FIRST],
  ['C2', 'Six Day Shift', '8', '48', FINISH_FIRST],
  ['C3', 'Night Shift', '10', '50', UNKNOWN_SLOTS],
  ['C4', '', '8', '40', UNKNOWN_SLOTS],
  ['C5', 'Blank', '8', '40', '']
]);

test('names exactly the calendars whose work week did not decode, in table order', () => {
  const model = parseXer(MIXED);
  assert.deepEqual(undecodedCalendars(getTable(model, 'CALENDAR'), getCalendarMap(model)), [
    { id: 'C3', name: 'Night Shift' },
    { id: 'C4', name: 'C4' }
  ]);
});

test('the notice names them the way the calendar table does', () => {
  assert.equal(notice(MIXED),
    'The work week of 2 calendars in this file could not be read: Night Shift; C4. ' +
    'Their work days show as unparsed in the table. ' +
    'No check above uses work days, and hours per day come from the file, so the counts are unaffected.');
});

test('one calendar reads in the singular', () => {
  const text = notice(xer([['C3', 'Night Shift', '10', '50', UNKNOWN_SLOTS]]));
  assert.match(text, /^The work week of 1 calendar in this file could not be read: Night Shift\. Its work days/);
});

test('no notice when every calendar was read, finish-first included', () => {
  assert.equal(notice(xer([
    ['C1', '5-Day', '8', '40', START_FIRST],
    ['C2', 'Six Day Shift', '8', '48', FINISH_FIRST]
  ])), '');
  assert.equal(calendarNotice([]), '');
  assert.deepEqual(undecodedCalendars(undefined, undefined), []);
});

test('the notice claims no substituted week, which this page never computes on', () => {
  assert.doesNotMatch(notice(MIXED), /Mon|Fri|substitut|8 ?h/i);
});

test('the sample schedule raises no notice', () => {
  const src = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
  const cal5 = src.match(/const CAL_5DAY = '([^']+)'/)[1];
  const cal6 = src.match(/const CAL_6DAY = '([^']+)'/)[1];
  assert.equal(notice(xer([['1', '5 Day Standard', '8', '40', cal5], ['2', '6 Day Accelerated', '8', '48', cal6]])), '');
});

test('app.js puts the notice under the calendar table, escaped', () => {
  const src = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ undecodedCalendars, calendarNotice \} from '\.\/calendar-notice\.js';/);
  assert.match(src, /const calNotice = calendarNotice\(undecodedCalendars\(calendars, calMap\)\);/);
  const table = src.indexOf('<div class="section-label">Calendars in this file</div>');
  const note = src.indexOf('<p class="cal-note">${escapeHtml(r.calNotice)}</p>');
  const longList = src.indexOf('Activities over 44 working days${');
  assert.ok(table > 0 && note > table && longList > note, 'notice sits after the calendar table and before the long-duration list');
});
