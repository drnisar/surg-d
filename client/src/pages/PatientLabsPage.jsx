import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import {
  LAB_CATEGORIES,
  LAB_SORTS,
  buildLabTrends,
  filterLabTrends,
  labCategory,
  sortLabTrends,
  splitLabTrends,
} from '@surg-d/shared';
import { api } from '../api.js';
import LabTrendTable from '../components/LabTrendTable.jsx';
import PatientHeader from '../components/PatientHeader.jsx';
import { dateOf, shiftDate, today } from '../dates.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RECENT_DAYS = 14; // "recent" when the admission date isn't known
const CATEGORY_LABELS = Object.fromEntries([...LAB_CATEGORIES, labCategory('')].map((c) => [c.key, c.label]));

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Date not recorded';

const admissionDate = (admittedAt) => {
  const date = admittedAt && new Date(admittedAt);
  return date && !Number.isNaN(date.getTime()) ? dateOf(admittedAt) : null;
};

// A patient's lab results from HMIS as trend tables, with this admission's results on top and earlier
// ones folded away. Opened from the patient's notes page, which passes the bed in `state`.
export default function PatientLabsPage() {
  const { mr } = useParams();
  const bed = useLocation().state?.bed;
  const [data, setData] = useState(null); // { patient, labs, otherInvestigations }
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('abnormal');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setData(null);
    try {
      setData(await api(`/patients/${encodeURIComponent(mr)}/history`));
    } catch (err) {
      setError(err.message);
    }
  }, [mr]);

  useEffect(() => {
    load();
  }, [load]);

  const admitted = admissionDate(bed?.admittedAt);
  const since = admitted ?? shiftDate(today(), -RECENT_DAYS);
  const sinceLabel = new Date(`${since}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const trends = useMemo(() => buildLabTrends(data?.labs), [data]);
  const categories = useMemo(() => {
    const present = new Set(trends.map((t) => t.category));
    return [...LAB_CATEGORIES, labCategory('')].filter((c) => present.has(c.key));
  }, [trends]);
  const { recent, earlier } = useMemo(() => {
    const split = splitLabTrends(trends, since);
    const arrange = (list) => sortLabTrends(filterLabTrends(list, { query, category, abnormalOnly }), sort);
    return { recent: arrange(split.recent), earlier: arrange(split.earlier) };
  }, [trends, since, query, category, abnormalOnly, sort]);

  const filtered = query || category !== 'all' || abnormalOnly;
  // With nothing recent to show, earlier results open by themselves.
  const earlierOpen = showEarlier || (!recent.length && earlier.length > 0);
  const table = (trend) => (
    <LabTrendTable key={trend.name} trend={trend} categoryLabel={CATEGORY_LABELS[trend.category]} />
  );

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <PatientHeader mr={mr} patient={data?.patient} bed={bed} fallback={`/patients/${encodeURIComponent(mr)}`} />

      <h3 className="m-0 text-base font-semibold">Lab results from HMIS</h3>

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            Try again
          </Button>
        </div>
      )}
      {!data && !error && <p className="m-0 text-sm text-muted-foreground">Loading lab results from HMIS…</p>}

      {data && !trends.length && (
        <Card>
          <CardContent className="text-center text-muted-foreground">No lab results in HMIS</CardContent>
        </Card>
      )}

      {trends.length > 0 && (
        <div className="grid gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tests, e.g. Hb, creatinine"
                aria-label="Search tests"
                className="pl-8"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAB_SORTS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="abnormal-only" checked={abnormalOnly} onCheckedChange={(v) => setAbnormalOnly(v === true)} />
              <Label htmlFor="abnormal-only">Only out of range</Label>
            </div>
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Test groups">
              {[{ key: 'all', label: 'All' }, ...categories].map((c) => (
                <Button
                  key={c.key}
                  size="sm"
                  variant={category === c.key ? 'default' : 'outline'}
                  aria-pressed={category === c.key}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {trends.length > 0 && (
        <>
          <h4 className="m-0 mt-2 text-sm font-semibold">
            {admitted ? `This admission (since ${sinceLabel})` : `Last ${RECENT_DAYS} days (since ${sinceLabel})`}
          </h4>
          {recent.length ? (
            recent.map(table)
          ) : (
            <p className="m-0 text-sm text-muted-foreground">
              {filtered ? 'No results match.' : `No results since ${sinceLabel}.`}
            </p>
          )}

          {earlier.length > 0 && (
            <>
              <div>
                <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setShowEarlier(!earlierOpen)}>
                  {earlierOpen ? <ChevronDown /> : <ChevronRight />}
                  Earlier results ({earlier.length} test{earlier.length === 1 ? '' : 's'})
                </Button>
              </div>
              {earlierOpen && earlier.map(table)}
            </>
          )}
        </>
      )}

      {data?.otherInvestigations.length > 0 && (
        <>
          <h3 className="m-0 mt-4 text-base font-semibold">Imaging and other investigations</h3>
          <Card className="py-2">
            <CardContent>
              <ul className="m-0 grid list-none gap-3 p-0">
                {data.otherInvestigations.map((inv, i) => (
                  <li key={`${inv.name}-${inv.orderedAt}-${i}`} className="text-sm">
                    <div className="font-medium">{inv.name}</div>
                    <div className="text-muted-foreground">
                      {[
                        `Ordered ${formatTime(inv.orderedAt)}`,
                        inv.department,
                        inv.reportAvailable ? 'Report in HMIS' : 'Report pending',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
