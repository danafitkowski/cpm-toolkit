// Vendored subset of @criticalpathpartners/lens-parser (MIT license — see LICENSE
// in this folder). Only the modules needed for a read-only, client-side XER
// quick-check are included: no p6xml, no gzip, no writer.
// Source: https://github.com/danafitkowski/cpp-lens-parser
export { parseXer } from './parse-xer.js';
export { createEmptyModel } from './lens-model.js';
export { getTable, getFields, getTableAliased, getFirstField, TABLE_ALIASES } from './access.js';
export { parseHeader } from './utils/header.js';
export { detectBomEncoding } from './encoding.js';
export { buildPredecessorMap } from './derived/predecessors.js';
export { parseCalendarData, getCalendarMap, durationHoursToDays } from './derived/calendars.js';
