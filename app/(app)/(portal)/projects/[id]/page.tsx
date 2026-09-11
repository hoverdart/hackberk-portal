import { ArrowLeft, ExternalLink, FileCode2, Folder, GitFork as Github, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { refreshProjectMetadataAction, submitProjectAction } from "@/app/(app)/(portal)/projects/actions";
import { requireUser } from "@/lib/auth/guards";
import { getProjectLens } from "@/lib/data/projects";
import { MessageSheet } from "@/components/ui/message-sheet";

/**
 * The repository viewer.
 *
 * Source is tokenised into HTML by Shiki on the server, so what the browser
 * receives is markup. Nothing from the repository is ever executed.
 */
export default async function ProjectLensPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ path?: string; error?: string; success?: string }>;
}) {
  await requireUser();
  const idResult = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!idResult.success) notFound();
  const query = await searchParams;
  let lens;
  try {
    lens = await getProjectLens(idResult.data, query.path);
  } catch (error) {
    // GitHub is a third party and can fail for reasons the applicant cannot
    // act on, so the message is theirs rather than a stack trace.
    return (
      <MessageSheet
        docket="PROJECT LENS"
        title="Repository preview unavailable."
        body={error instanceof Error ? error.message : "GitHub did not provide this repository."}
        back={{ href: "/projects", label: "Return to project setup" }}
      />
    );
  }
  if (!lens) notFound();
  const { project, snapshot, source } = lens;
  return (
    <main className="lens-page">
      <header>
        <Link href="/projects">
          <ArrowLeft aria-hidden />
          Project setup
        </Link>
        <div>
          <Github aria-hidden />
          <span>PUBLIC REPOSITORY · READ ONLY</span>
        </div>
        {project.submitted_at ? (
          <strong>SUBMITTED</strong>
        ) : (
          <form action={submitProjectAction.bind(null, project.id)}>
            <button type="submit">
              <Send aria-hidden />
              Submit project
            </button>
          </form>
        )}
      </header>
      <section className="lens-mast">
        <div>
          <p>
            {snapshot.language ?? "MULTI-LANGUAGE"} · ★ {snapshot.stars.toLocaleString()}
          </p>
          <h1>{project.name}</h1>
          <span>{project.summary}</span>
        </div>
        <div>
          <a href={project.github_url} target="_blank" rel="noreferrer">
            Open on GitHub <ExternalLink aria-hidden />
          </a>
          <form action={refreshProjectMetadataAction.bind(null, project.id)}>
            <button>
              <RefreshCw aria-hidden />
              Refresh metadata
            </button>
          </form>
        </div>
      </section>
      {query.error ? (
        <p className="workspace-notice workspace-notice--error">That project action did not finish.</p>
      ) : null}
      {query.success ? (
        <p className="workspace-notice workspace-notice--success">Project submitted for judging.</p>
      ) : null}
      <div className="lens-layout">
        <aside className="file-tree">
          <h2>Repository files</h2>
          <nav>
            {snapshot.tree.map((item) =>
              item.type === "tree" ? (
                <span key={item.path}>
                  <Folder aria-hidden />
                  {item.path}
                </span>
              ) : (
                <Link
                  key={item.path}
                  href={`/projects/${project.id}?path=${encodeURIComponent(item.path)}`}
                  aria-current={source?.path === item.path ? "page" : undefined}
                >
                  <FileCode2 aria-hidden />
                  {item.path}
                </Link>
              ),
            )}
          </nav>
        </aside>
        <article className="source-viewer">
          {source ? (
            <>
              <header>
                <span>{source.path}</span>
                <small>Rendered as text · never executed</small>
              </header>
              <div dangerouslySetInnerHTML={{ __html: source.html }} />
            </>
          ) : (
            <>
              <header>
                <span>README</span>
                <small>{snapshot.defaultBranch}</small>
              </header>
              <pre>{snapshot.readme ?? snapshot.description ?? "This repository does not expose a README."}</pre>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
