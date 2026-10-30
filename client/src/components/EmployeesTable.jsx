import { designationLabel, whatsappUrl } from '@surg-d/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Staff list. `canEdit(employee)` / `canDeactivate(employee)` decide which action buttons each row gets.
export default function EmployeesTable({ employees, canEdit, canDeactivate, onEdit, onDeactivate }) {
  const hasActions = employees.some((e) => canEdit(e) || canDeactivate(e));
  return (
    <div className="rounded-md border bg-card">
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
                {whatsappUrl(e.phone) ? (
                  <a
                    href={whatsappUrl(e.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Chat on WhatsApp"
                    className="underline-offset-4 hover:underline"
                  >
                    {e.phone}
                  </a>
                ) : (
                  e.phone
                )}
              </TableCell>
              {hasActions && (
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {canEdit(e) && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(e)}>
                        Edit
                      </Button>
                    )}
                    {canDeactivate(e) && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDeactivate(e)}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
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
  );
}
