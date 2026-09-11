import { Button, ButtonLink } from "@/components/ui/button";
import { Code2, GitFork as Github } from "lucide-react";

import { saveProjectAction } from "@/app/(app)/(portal)/projects/actions";
import { requireApplicant } from "@/lib/auth/guards";
import { getActiveEvent } from "@/lib/data/applications";
import { getProjectHome } from "@/lib/data/projects";
import { MessageSheet } from "@/components/ui/message-sheet";

/**
 * Project Lens intake: connect a public GitHub repository to the team's project.
 *
 * Public repositories only, and submitted code is rendered, never executed —
 * both enforced upstream in `lib/github/url.ts` and `lib/data/projects.ts`.
 */
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireApplicant();
  const event = await getActiveEvent();
  if (!event) return <ProjectMessage title="Project Lens is waiting for an active event." />;
  const { membership, project } = await getProjectHome(user.id, event.id);
  if (!membership)
    return (
      <ProjectMessage
        title="Form a team before opening Project Lens."
        body="Solo hackers still count as a team of one."
        action={{ href: "/teams", label: "Open Team Match" }}
      />
    );
  const team = membership.teams as unknown as { id: string; name: string };
  const query = await searchParams;
  return (
    <main className="feature-page">
      <header className="feature-mast">
        <h1>Show the work. Never run the code.</h1>
        <span>Judges browse your README, file tree, and syntax-highlighted source in a bounded, read-only viewer.</span>
      </header>
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">
          Check every field and use a public github.com repository URL.
        </p>
      ) : null}
      <section className="project-intake">
        <div>
          <Github aria-hidden />
          <h2>{project ? "Update your project" : "Add your project"}</h2>
          <p>Team: {team.name}</p>
        </div>
        <form action={saveProjectAction.bind(null, team.id, event.id, project?.id ?? null)}>
          <label>
            Project name
            <input name="name" defaultValue={project?.name ?? ""} minLength={2} maxLength={120} required />
          </label>
          <label>
            Public GitHub repository
            <input
              name="githubUrl"
              type="url"
              defaultValue={project?.github_url ?? ""}
              placeholder="https://github.com/owner/repository"
              required
            />
          </label>
          <label>
            Project summary
            <textarea
              name="summary"
              defaultValue={project?.summary ?? ""}
              minLength={20}
              maxLength={1200}
              rows={5}
              required
            />
          </label>
          <label>
            Demo URL <small>Optional</small>
            <input name="demoUrl" type="url" defaultValue={project?.demo_url ?? ""} />
          </label>
          <Button variant="primary" type="submit">
            {project ? "Save project" : "Add project"}
          </Button>
        </form>
        {project ? (
          <ButtonLink
            className="open-lens"
            variant="ghost"
            href={`/projects/${project.id}`}
            icon={<Code2 aria-hidden />}
          >
            Browse the repository
          </ButtonLink>
        ) : null}
      </section>
    </main>
  );
}

function ProjectMessage({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <MessageSheet
      title={title}
      body={body}
      action={action}
      back={{ href: "/dashboard", label: "Return to the dashboard" }}
    />
  );
}
