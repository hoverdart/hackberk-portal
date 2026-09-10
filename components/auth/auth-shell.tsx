import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import tower from "@/assets/plates/tower-illustration.png";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <aside className="auth-rail">
        <Link href="/" className="brand-lockup" aria-label="Hackathons at Berkeley home">
          <strong>Berkeley</strong><span>Hackathons</span><em>@ Berkeley</em>
        </Link>
        <div className="auth-rail-copy"><span>BUILD</span><span>PEOPLE</span><span>IDEAS</span><span>A BRIGHTER TOMORROW</span></div>
        <Image src={tower} alt="Campanile line illustration" priority className="auth-tower" />
      </aside>
      <div className="auth-stage">{children}</div>
    </main>
  );
}
