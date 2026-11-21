// Dependency-free, single-pass CSV reader matching csv-reader 1.0.0 behavior.
export function run(input) {
  let s = input && typeof input.text === 'string' ? input.text : '';
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const header = !!(input && input.header), n = s.length;
  const records = [], errors = [];
  let i = 0, line = 1, recordLine = 1, rowIndex = 0, width = -1;
  let fields = [], field = '', recordHasChars = false, quoteJunk = false;

  const headerNow = () => header && records.length === 0;
  const error = (code, extra) => {
    const e = { code, line: recordLine, row: headerNow() ? null : rowIndex };
    if (extra !== undefined) e[code === 'short_row' ? 'fields' : 'extra'] = extra;
    errors.push(e);
  };
  const finishField = () => {
    if (quoteJunk) { error('quote_junk'); quoteJunk = false; }
    fields.push(field);
    field = '';
  };
  const finishRecord = () => {
    if (!recordHasChars) { fields.length = 0; field = ''; quoteJunk = false; return; }
    const isHeader = headerNow();
    finishField();
    if (width < 0) width = fields.length;
    else if (!isHeader) {
      if (fields.length < width) {
        error('short_row', fields.length);
        while (fields.length < width) fields.push('');
      } else if (fields.length > width) {
        error('long_row', fields.slice(width));
        fields.length = width;
      }
    }
    records.push(fields);
    fields = []; field = ''; recordHasChars = false;
    if (!isHeader) rowIndex++;
  };

  while (i < n) {
    const c = s.charCodeAt(i);
    if (c === 44) {
      finishField(); recordHasChars = true; i++; continue;
    }
    if (c === 10) {
      finishRecord(); i++; line++; recordLine = line; continue;
    }
    if (c === 13) {
      if (i + 1 < n && s.charCodeAt(i + 1) === 10) {
        finishRecord(); i += 2; line++; recordLine = line;
      } else {
        error('stray_cr'); i++;
      }
      continue;
    }
    if (c === 34 && field.length === 0) {
      let j = i + 1, segment = j, out = null, innerLines = 0, closed = false;
      while (j < n) {
        const q = s.charCodeAt(j);
        if (q === 34) {
          if (j + 1 < n && s.charCodeAt(j + 1) === 34) {
            if (out === null) out = [];
            out.push(s.slice(segment, j), '"');
            j += 2; segment = j;
          } else {
            if (out !== null) out.push(s.slice(segment, j));
            else field = s.slice(segment, j);
            j++; closed = true; break;
          }
        } else if (q === 10 || q === 13) {
          if (out === null) out = [];
          out.push(s.slice(segment, j), '\n');
          if (q === 13 && j + 1 < n && s.charCodeAt(j + 1) === 10) j += 2;
          else j++;
          innerLines++; segment = j;
        } else j++;
      }
      if (!closed) {
        error('unterminated_quote');
        field = '"'; recordHasChars = true; i++;
        continue;
      }
      if (out !== null) field = out.join('');
      recordHasChars = true; i = j;
      const junkStart = i;
      while (i < n) {
        const d = s.charCodeAt(i);
        if (d === 44 || d === 10 || d === 13) break;
        i++;
      }
      if (i !== junkStart) { field += s.slice(junkStart, i); quoteJunk = true; }
      line += innerLines;
      continue;
    }
    const start = i;
    while (i < n) {
      const d = s.charCodeAt(i);
      if (d === 44 || d === 10 || d === 13) break;
      i++;
    }
    field += s.slice(start, i); recordHasChars = true;
  }
  if (recordHasChars || fields.length || field.length) finishRecord();
  const columns = header && records.length ? records.shift() : null;
  return { columns, rows: records, errors };
}
