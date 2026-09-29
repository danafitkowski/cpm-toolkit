// Names the calendars whose work week the parser could not read.
//
// The vendored parser sets parse_incomplete on a calendar whose clndr_data is
// not empty but decodes to no working days. The report used to show only
// "unparsed" in that calendar's Work days cell, which is also what a calendar
// with an empty clndr_data gets, so nothing said which calendar could not be
// read or whether it mattered.
//
// What the notice says is what this page does. The parser's working-day
// arithmetic would substitute a Monday to Friday week, but this page never
// calls it: no check here uses a calendar's work days, and the one check that
// turns hours into days (activities over 44 working days) divides by the hours
// per day the file states (day_hr_cnt). So the notice names the calendar and
// says the counts are unaffected, and does not claim a substituted week.
//
// Kept out of app.js, which wires itself to the page as it loads, so the tests
// in _tests/ can import it in Node.

// Every calendar in the file whose work week could not be read, in CALENDAR
// table order, each once.
export function undecodedCalendars(calendars, calMap) {
  const seen = new Set();
  const out = [];
  for (const c of calendars || []) {
    const id = c.clndr_id == null ? '' : String(c.clndr_id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const info = (calMap || {})[id];
    if (info && info.parse_incomplete) out.push({ id, name: c.clndr_name || id });
  }
  return out;
}

// The notice as plain text, or '' when every calendar was read. Calendars are
// named the way the calendar table names them.
export function calendarNotice(cals) {
  if (!cals || cals.length === 0) return '';
  const one = cals.length === 1;
  return `The work week of ${cals.length} calendar${one ? '' : 's'} in this file could not be read: ` +
    `${cals.map(c => c.name).join('; ')}. ` +
    `${one ? 'Its' : 'Their'} work days show as unparsed in the table. ` +
    'No check above uses work days, and hours per day come from the file, so the counts are unaffected.';
}
