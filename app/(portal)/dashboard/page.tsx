import { RunOfShow } from "@/components/shell/run-of-show";
import { requireUser } from "@/lib/auth/guards";
import { getDashboardData } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  return <RunOfShow {...data} />;
}
