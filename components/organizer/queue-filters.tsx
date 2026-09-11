import { Filter, Search } from "lucide-react";

import { applicationRoles, applicationStatuses } from "@/lib/domain/applications";

/**
 * Filters for the organizer application queue.
 *
 * A plain uncontrolled `<form>` with no client JavaScript: submitting puts the
 * filters in the query string, which the Server Component reads. That makes a
 * filtered queue a shareable, bookmarkable, back-button-safe URL, and the options
 * come from the same enums the database uses.
 */
export function QueueFilters({ values }: { values: { query?: string; role?: string; status?: string } }) {
  return (
    <form className="queue-filters">
      <label>
        <span className="sr-only">Search applications</span>
        <Search aria-hidden />
        <input name="query" defaultValue={values.query} placeholder="Search applicant or application ID" />
      </label>
      <label>
        <span className="sr-only">Role</span>
        <Filter aria-hidden />
        <select name="role" defaultValue={values.role ?? ""}>
          <option value="">All roles</option>
          {applicationRoles.map((role) => (
            <option key={role}>{role}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Status</span>
        <select name="status" defaultValue={values.status ?? ""}>
          <option value="">All statuses</option>
          {applicationStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <button type="submit">Apply filters</button>
    </form>
  );
}
