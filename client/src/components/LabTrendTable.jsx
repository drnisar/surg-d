import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// One test's results as a trend: parameters down the side, report times across (newest first).
// Scrolls sideways on phones with the parameter column kept in view.
export default function LabTrendTable({ trend, categoryLabel }) {
  const outOfRange = trend.rows.some((r) => Object.values(r.cells).some((c) => c.abnormal));
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {trend.name}
          {outOfRange && <Badge variant="destructive">Out of range</Badge>}
        </CardTitle>
        <CardDescription>
          {[categoryLabel, `Latest ${day(trend.times[0])}`, trend.times.length > 1 && `${trend.times.length} results`]
            .filter(Boolean)
            .join(' · ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 z-10 bg-card py-2 pr-4 text-left font-medium">Test</th>
                {trend.times.map((t) => (
                  <th key={t} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    {day(t)}
                    <div className="text-xs font-normal text-muted-foreground">{time(t)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trend.rows.map((row) => (
                <tr key={row.name} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 max-w-48 bg-card py-2 pr-4 align-top">
                    {row.name}
                    {row.range && (
                      <div className="text-xs whitespace-pre-line text-muted-foreground">{row.range}</div>
                    )}
                  </td>
                  {trend.times.map((t) => {
                    const cell = row.cells[t];
                    return (
                      <td
                        key={t}
                        className={cn(
                          'px-3 py-2 text-right align-top whitespace-nowrap tabular-nums',
                          cell?.abnormal && 'font-semibold text-destructive'
                        )}
                      >
                        {cell ? cell.value : <span className="text-muted-foreground">–</span>}
                        {cell?.abnormal && <span className="sr-only"> (out of range)</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
