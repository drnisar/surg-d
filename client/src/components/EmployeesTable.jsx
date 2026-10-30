import { designationLabel, whatsappUrl } from '@surg-d/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function Phone({ phone }) {
  const url = whatsappUrl(phone);
  if (!url) return phone;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Chat on WhatsApp" className="no-underline underline-offset-4 hover:underline">
      {phone}
    </a>
  );
}

function Actions({ employee, canEdit, canDeactivate, onEdit, onDeactivate }) {
  return (
    <div className="flex justify-end gap-2">
      {canEdit(employee) && (
        <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
          Edit
        </Button>
      )}
      {canDeactivate(employee) && (
        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDeactivate(employee)}>
          Deactivate
        </Button>
      )}
    </div>
  );
}

// Phone layout: one card per employee.
function EmployeeCard({ employee: e, actions }) {
  return (
    <li className="grid gap-1 rounded-md border bg-card p-4 text-sm">
      <div>
        <div className="font-semibold">{e.fullName}</div>
        <div className="text-muted-foreground">{designationLabel(e.designation) || '—'}</div>
      </div>
      <div className="font-mono">{e.mrNumber}</div>
      <div className="break-all">{e.officialEmail}</div>
      <div className="font-mono">
        <Phone phone={e.phone} />
      </div>
      {actions}
    </li>
  );
}

// Staff list: cards below `md`, a table from `md` up.
// `canEdit(employee)` / `canDeactivate(employee)` decide which action buttons each employee gets.
export default function EmployeesTable({ employees, canEdit, canDeactivate, onEdit, onDeactivate }) {
  const hasActions = employees.some((e) => canEdit(e) || canDeactivate(e));
  const actionsFor = (e) =>
    (canEdit(e) || canDeactivate(e)) && (
      <Actions employee={e} canEdit={canEdit} canDeactivate={canDeactivate} onEdit={onEdit} onDeactivate={onDeactivate} />
    );

  return (
    <>
      <ul className="m-0 grid list-none gap-3 p-0 md:hidden">
        {employees.map((e) => (
          <EmployeeCard key={e.id} employee={e} actions={actionsFor(e)} />
        ))}
        {!employees.length && <li className="py-8 text-center text-sm text-muted-foreground">No employees found</li>}
      </ul>

      <div className="hidden rounded-md border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MR number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Official email</TableHead>
              <TableHead>Phone</TableHead>
              {hasActions && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono">{e.mrNumber}</TableCell>
                <TableCell className="font-medium">{e.fullName}</TableCell>
                <TableCell>{designationLabel(e.designation) || '—'}</TableCell>
                <TableCell>{e.officialEmail}</TableCell>
                <TableCell className="font-mono">
                  <Phone phone={e.phone} />
                </TableCell>
                {hasActions && <TableCell>{actionsFor(e)}</TableCell>}
              </TableRow>
            ))}
            {!employees.length && (
              <TableRow>
                <TableCell colSpan={hasActions ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
