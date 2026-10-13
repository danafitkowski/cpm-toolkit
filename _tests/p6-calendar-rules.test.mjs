// Run from the repo root with: node --test
//
// The free check converts hours to days on each calendar's hours per day as
// P6 schedules it (2026-10-13), through the vendored lens-parser 0.4.0
// getCalendarMap. Measured on Primavera P6 Professional 23.12.1's own F9:
//
//   - a calendar whose every working day works the same hours H converts at
//     H when day_hr_cnt says otherwise (a Monday-Saturday 07:00-17:00
//     calendar declaring 8 ran a 40 h activity over four days);
//   - an EMPTY record (no clndr_data) is P6's internal 8-hour Standard,
//     Monday to Friday, whatever day_hr_cnt declares.
//
// Both tests fail on the vendored lens-parser 0.3.2. Every calendar is built here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCalendarMap, durationHoursToDays } from '../vendor/lens-parser/index.js';

const WEEK_TEN = (() => {
  let body = '';
  for (let d = 1; d <= 7; d++) body += `(0||${d}()(${d >= 2 && d <= 6 ? '(0||0(s|07:00|f|17:00)())' : ''}))`;
  return `(0||CalendarData()((0||DaysOfWeek()(${body}))(0||Exceptions()())))`;
})();

const model = (rows) => ({
  tables: {
    CALENDAR: {
      fields: ['clndr_id', 'clndr_name', 'day_hr_cnt', 'week_hr_cnt', 'clndr_data'],
      records: rows.map(([clndr_id, clndr_name, day_hr_cnt, week_hr_cnt, clndr_data]) =>
        ({ clndr_id, clndr_name, day_hr_cnt, week_hr_cnt, clndr_data })),
    },
  },
});

test('a calendar declaring 8 whose shifts work 10 converts at 10', () => {
  const cal = getCalendarMap(model([['S', 'Ten hour shifts', '8', '40', WEEK_TEN]])).S;
  assert.equal(cal.hours_per_day, 10);
  assert.equal(durationHoursToDays(40, cal, 8, 1), 4);
});

test('an empty record declaring 10 is P6\'s 8-hour Standard, Monday to Friday', () => {
  const cal = getCalendarMap(model([['E', 'Empty ten', '10', '50', '']])).E;
  assert.equal(cal.hours_per_day, 8);
  assert.deepEqual(cal.work_day_names, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  assert.equal(durationHoursToDays(40, cal, 8, 1), 5);
});
