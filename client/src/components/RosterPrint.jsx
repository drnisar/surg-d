import { useEffect, useState } from 'react';
import { LOCATIONS, SHIFTS, designationShort } from '@surg-d/shared';
import { formatDay } from '../dates.js';

const stamp = () =>
  new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Black-and-white month grid for paper (A4 landscape): a row per day, a column per place of duty in each shift.
// Hidden on screen; `@media print` in styles.css shows it instead of the page. `slot` is the same lookup RosterTable uses.
export default function RosterPrint({ month, days, slot }) {
  const [printedAt, setPrintedAt] = useState(stamp);

  useEffect(() => {
    const update = () => setPrintedAt(stamp());
    window.addEventListener('beforeprint', update);
    return () => window.removeEventListener('beforeprint', update);
  }, []);

  const [y, m] = month.split('-').map(Number);
  const monthTitle = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="roster-print print-only">
      <header className="print-head">
        <div>
          <strong>Khyber Teaching Hospital — Surgical D Unit</strong>
          <h1>Duty Roster — {monthTitle}</h1>
        </div>
        <span className="print-stamp">Printed {printedAt}</span>
      </header>

      <table>
        <colgroup>
          <col className="print-date-col" />
          {SHIFTS.flatMap((s) => LOCATIONS.map((l) => <col key={`${s.key}-${l.key}`} />))}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2}>Date</th>
            {SHIFTS.map((s) => (
              <th key={s.key} colSpan={LOCATIONS.length} className="print-shift">
                {s.label}
              </th>
            ))}
          </tr>
          <tr>
            {SHIFTS.flatMap((s) =>
              LOCATIONS.map((l) => (
                <th key={`${s.key}-${l.key}`} className={l === LOCATIONS[0] ? 'shift-start' : ''}>
                  {l.label}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {days.map((date) => {
            const { day, weekday, isWeekend } = formatDay(date);
            return (
              <tr key={date} className={isWeekend ? 'print-sunday' : ''}>
                <th scope="row">
                  {day} <span>{weekday}</span>
                </th>
                {SHIFTS.flatMap((s) =>
                  LOCATIONS.map((l) => (
                    <td key={`${s.key}-${l.key}`} className={l === LOCATIONS[0] ? 'shift-start' : ''}>
                      {slot(date, s.key, l.key).map((p) => {
                        const short = designationShort(p.designation);
                        return (
                          <div key={p.id}>
                            {p.fullName}
                            {short && <span className="print-desig"> ({short})</span>}
                          </div>
                        );
                      })}
                    </td>
                  ))
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer className="print-foot">
        <p>
          {LOCATIONS.filter((l) => l.label !== l.name)
            .map((l) => `${l.label} = ${l.name}`)
            .join(' · ')}
        </p>
        <div className="print-signatures">
          <span>Prepared by: ______________________</span>
          <span>Approved by Head of Unit: ______________________</span>
        </div>
      </footer>
    </div>
  );
}
