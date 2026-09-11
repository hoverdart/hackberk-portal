import { Heart, Laptop, Scale, UserRoundCog, type LucideIcon } from "lucide-react";

import type { ApplicationRole } from "@/lib/domain/applications";

/**
 * The glyph for each of the four application roles.
 *
 * One map, because two files had their own identical copy and a role added to
 * one would have rendered blank in the other. It lives here rather than in
 * `lib/domain` so that module does not take a dependency on an icon library to
 * describe the shape of an application.
 */
export const roleIcons: Record<ApplicationRole, LucideIcon> = {
  hacker: Laptop,
  judge: Scale,
  mentor: UserRoundCog,
  volunteer: Heart,
};
