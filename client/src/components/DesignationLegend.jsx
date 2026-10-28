import { DESIGNATIONS } from '@surg-d/shared';

// Key for the designation colours (`.desig-*` in styles.css), limited to designations with one of `roles`.
export default function DesignationLegend({ roles }) {
  return (
    <div className="legend small">
      {DESIGNATIONS.filter((d) => roles.includes(d.role)).map((d) => (
        <span key={d.key} className={`chip desig-${d.key}`} title={d.label}>
          {d.short}
        </span>
      ))}
    </div>
  );
}
