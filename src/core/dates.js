/* board v3.0 stage-1 */

export function todayISO() {
  return toISODate(new Date());
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseISODate(iso) {
  const [year, month, day] = String(iso || '')
    .split('-')
    .map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export function addDaysISO(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);

  return toISODate(date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function parseMagicDate(text) {
  const today = startOfDay(new Date());

  let clean = ` ${String(text || '').trim()} `;
  let due = null;

  const simpleWords = [
    ['послезавтра', 2],
    ['завтра', 1],
    ['сегодня', 0],
  ];

  for (const [word, offset] of simpleWords) {
    const re = new RegExp(`(?:^|\\s)${word}(?=\\s|$)`, 'i');

    if (re.test(clean)) {
      due = toISODate(addDays(today, offset));
      clean = clean.replace(re, ' ');
      break;
    }
  }

  if (!due) {
    const weekdayMatch = clean.match(
      /(?:^|\s)в\s+(понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)/i
    );

    if (weekdayMatch) {
      const word = weekdayMatch[1].toLowerCase();

      const targetByWord = {
        понедельник: 1,
        вторник: 2,
        среду: 3,
        четверг: 4,
        пятницу: 5,
        субботу: 6,
        воскресенье: 0,
      };

      const target = targetByWord[word];
      const current = today.getDay();
      const diff = (target - current + 7) % 7;

      due = toISODate(addDays(today, diff));
      clean = clean.replace(weekdayMatch[0], ' ');
    }
  }

  if (!due) {
    const dateMatch = clean.match(
      /(?:^|\s)(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?=\s|$)/
    );

    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const month = Number(dateMatch[2]);
      const year = dateMatch[3] ? Number(dateMatch[3]) : today.getFullYear();

      const candidate = new Date(year, month - 1, day);

      const isValid =
        candidate.getFullYear() === year &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day;

      if (isValid) {
        let result = candidate;

        if (!dateMatch[3] && result < today) {
          result = new Date(year + 1, month - 1, day);
        }

        due = toISODate(result);
        clean = clean.replace(dateMatch[0], ' ');
      }
    }
  }

  clean = clean.replace(/\s+/g, ' ').trim();

  return {
    due,
    cleanText: clean,
  };
}
