import "server-only";

import { githubRepositoryUrlSchema } from "@/lib/github/url";

export type RepositorySnapshot = { name: string; description: string | null; stars: number; defaultBranch: string; language: string | null; readme: string | null; tree: Array<{ path: string; type: "blob" | "tree"; size?: number }> };

export async function fetchRepositorySnapshot(repositoryUrl: string): Promise<RepositorySnapshot> {
  const parsed = githubRepositoryUrlSchema.parse(repositoryUrl);
  const repo = await githubApi(`/repos/${parsed.owner}/${parsed.repo}`) as { name: string; description: string | null; stargazers_count: number; default_branch: string; language: string | null; private: boolean };
  if (repo.private) throw new Error("Private repositories are not supported.");
  const [readmeResult, treeResult] = await Promise.allSettled([githubApi(`/repos/${parsed.owner}/${parsed.repo}/readme`), githubApi(`/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`)]);
  const readmeData = readmeResult.status === "fulfilled" ? readmeResult.value as { content?: string; encoding?: string } : null;
  const treeData = treeResult.status === "fulfilled" ? treeResult.value as { tree?: Array<{ path: string; type: "blob" | "tree"; size?: number }> } : null;
  const readme = readmeData?.content && readmeData.encoding === "base64" ? Buffer.from(readmeData.content, "base64").toString("utf8").slice(0, 200_000) : null;
  return { name: repo.name, description: repo.description, stars: repo.stargazers_count, defaultBranch: repo.default_branch, language: repo.language, readme, tree: (treeData?.tree ?? []).filter((item) => item.type === "tree" || (item.size ?? 0) <= 256_000).slice(0, 500) };
}

export async function fetchRepositoryFile(repositoryUrl: string, path: string, branch: string) {
  if (!path || path.includes("..") || path.startsWith("/") || path.length > 500) throw new Error("Invalid repository path.");
  const parsed = githubRepositoryUrlSchema.parse(repositoryUrl);
  const data = await githubApi(`/repos/${parsed.owner}/${parsed.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(branch)}`) as { content?: string; encoding?: string; size?: number };
  if (!data.content || data.encoding !== "base64" || (data.size ?? 0) > 256_000) throw new Error("That file cannot be previewed.");
  return Buffer.from(data.content, "base64").toString("utf8");
}

async function githubApi(path: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) }, signal: controller.signal, next: { revalidate: 300 } });
    if (!response.ok) throw new Error(response.status === 404 ? "Public repository not found." : "GitHub could not provide this repository.");
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 2_000_000) throw new Error("GitHub response exceeded the preview limit.");
    // Content-Length can be absent on compressed responses, so enforce the same
    // boundary again on the bytes received before JSON parsing allocates deeply.
    const body = await response.arrayBuffer();
    if (body.byteLength > 2_000_000) throw new Error("GitHub response exceeded the preview limit.");
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } finally { clearTimeout(timeout); }
}
