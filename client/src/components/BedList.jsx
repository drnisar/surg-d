import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

function Chip({ mine, children }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs',
        mine ? 'bg-emerald-50 text-emerald-800' : 'bg-muted text-foreground'
      )}
    >
      {children}
    </span>
  );
}

function Responsible({ doctors, userId }) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <span className="text-muted-foreground">Responsible:</span>
      {doctors.length ? (
        doctors.map((d) => (
          <Chip key={d.id} mine={d.id === userId}>
            {d.fullName}
          </Chip>
        ))
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}

function TaskChips({ tasks, userId, empty }) {
  if (!tasks.length) return <span className="text-sm text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tasks.map((t) => (
        <Chip key={t.id} mine={t.assignedTo.id === userId}>
          {t.description} <span className="text-muted-foreground">→ {t.assignedTo.fullName}</span>
        </Chip>
      ))}
    </div>
  );
}

const patientLine = (bed) => [bed.mrNumber, bed.consultantName, bed.unit].filter(Boolean).join(' · ');

// Ward beds: cards below `md`, a table from `md` up.
// `tasksFor(bed)` / `doctorsFor(bed)` give today's open tasks and the responsible doctors.
// While `allocating`, each bed gets a tick box (`isTicked`, `onToggle`) and the table header ticks all shown (`onTickAll`).
export default function BedList({
  beds,
  emptyText,
  userId,
  tasksFor,
  doctorsFor,
  onOpen,
  allocating,
  isTicked,
  onToggle,
  allTicked,
  onTickAll,
}) {
  const tick = (bed) => (
    <Checkbox aria-label={`Tick bed ${bed.code}`} checked={isTicked(bed)} onCheckedChange={() => onToggle(bed)} />
  );
  const tasksButton = (bed, count) => (
    <Button variant="outline" size="sm" onClick={() => onOpen(bed)}>
      Tasks{count ? ` (${count})` : ''}
    </Button>
  );

  return (
    <>
      <ul className="m-0 grid list-none gap-3 p-0 md:hidden">
        {beds.map((bed) => {
          const tasks = tasksFor(bed);
          return (
            <li
              key={bed.code}
              className={cn('grid gap-2 rounded-md border bg-card p-4 text-sm', allocating && isTicked(bed) && 'bg-emerald-50')}
            >
              <div className="flex items-center gap-3">
                {allocating && tick(bed)}
                <strong className="font-mono">{bed.code}</strong>
                <span className="flex-1" />
                {tasksButton(bed, tasks.length)}
              </div>
              <div>
                <div className="font-medium">{bed.patientName ?? '—'}</div>
                <div className="text-xs text-muted-foreground">{patientLine(bed)}</div>
              </div>
              <Responsible doctors={doctorsFor(bed)} userId={userId} />
              <TaskChips tasks={tasks} userId={userId} empty="No open tasks today" />
            </li>
          );
        })}
        {!beds.length && <li className="py-8 text-center text-sm text-muted-foreground">{emptyText}</li>}
      </ul>

      <div className="hidden rounded-md border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {allocating && (
                <TableHead className="w-10">
                  <Checkbox aria-label="Tick all shown beds" checked={allTicked} onCheckedChange={onTickAll} />
                </TableHead>
              )}
              <TableHead>Bed</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Open tasks today</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {beds.map((bed) => {
              const tasks = tasksFor(bed);
              return (
                <TableRow key={bed.code} className={cn(allocating && isTicked(bed) && 'bg-emerald-50 hover:bg-emerald-50')}>
                  {allocating && <TableCell className="align-top">{tick(bed)}</TableCell>}
                  <TableCell className="w-28 align-top font-mono font-semibold">{bed.code}</TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="grid gap-1">
                      <span>{bed.patientName ?? '—'}</span>
                      <span className="text-xs text-muted-foreground">{patientLine(bed)}</span>
                      <Responsible doctors={doctorsFor(bed)} userId={userId} />
                    </div>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <TaskChips tasks={tasks} userId={userId} empty="—" />
                  </TableCell>
                  <TableCell className="text-right align-top">{tasksButton(bed, tasks.length)}</TableCell>
                </TableRow>
              );
            })}
            {!beds.length && (
              <TableRow>
                <TableCell colSpan={allocating ? 5 : 4} className="h-24 text-center text-muted-foreground">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
