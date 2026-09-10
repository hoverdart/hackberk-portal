import { statusLabel, type ApplicationSummary } from "@/lib/domain/applications";

export function StatusStamp({ status }: { status: ApplicationSummary["status"] }) {
  return <span className={`status-stamp status-stamp--${status}`}>{statusLabel(status)}</span>;
}
