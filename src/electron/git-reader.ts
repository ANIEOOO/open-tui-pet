import { execFile } from "child_process"
import { promisify } from "util"
import { log } from "../logger.js"

const execFileAsync = promisify(execFile)

const GIT_TIMEOUT_MS = 10000
const MAX_COMMITS = 50

/** Standup data returned from git log analysis */
export interface StandupData {
  commits: Array<{
    hash: string
    message: string
    files: Array<{ path: string; additions: number; deletions: number }>
  }>
  stats: {
    totalCommits: number
    totalFiles: number
    totalAdditions: number
    totalDeletions: number
  }
  categories: Array<{ name: string; commits: StandupData["commits"] }>
  error?: string
  truncated?: boolean
  date: string
}

function todayString(): string {
  return new Date().toISOString().split("T")[0]
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function emptyResult(error?: string): StandupData {
  return {
    commits: [],
    stats: { totalCommits: 0, totalFiles: 0, totalAdditions: 0, totalDeletions: 0 },
    categories: [],
    date: todayString(),
    ...(error ? { error } : {}),
  }
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    timeout: GIT_TIMEOUT_MS,
  })
  return stdout
}

function parseStatOutput(
  output: string
): Map<string, Array<{ path: string; additions: number; deletions: number }>> {
  const map = new Map<string, Array<{ path: string; additions: number; deletions: number }>>()
  if (!output) return map

  const lines = output.split("\n")
  let currentHash: string | null = null

  for (const line of lines) {
    // Commit line: 40-char hex hash followed by a space and message
    const commitMatch = line.match(/^([0-9a-f]{40})\s/)
    if (commitMatch) {
      currentHash = commitMatch[1]
      if (!map.has(currentHash)) map.set(currentHash, [])
      continue
    }

    // numstat line: "additions\tdeletions\tfilepath" (binary files show "-" for counts)
    if (currentHash) {
      const fileMatch = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
      if (fileMatch) {
        const additions = fileMatch[1] === "-" ? 0 : parseInt(fileMatch[1], 10)
        const deletions = fileMatch[2] === "-" ? 0 : parseInt(fileMatch[2], 10)
        const filePath = fileMatch[3]
        map.get(currentHash)!.push({ path: filePath, additions, deletions })
      }
    }
  }

  return map
}

export async function readGitLog(cwd: string): Promise<StandupData> {
  // Resolve git user name first (execFile doesn't support shell substitution)
  let author: string
  try {
    author = (await runGit(["config", "user.name"], cwd)).trim()
  } catch (err: any) {
    log(`[git-reader] Not a git repo or git unavailable: ${err.message}`)
    return emptyResult("not-a-git-repo")
  }

  if (!author) {
    return emptyResult()
  }

  // Get commit list (oneline format)
  let onelineOutput: string
  try {
    onelineOutput = await runGit(
      ["log", "--oneline", "--since=midnight", `--author=${author}`],
      cwd
    )
  } catch (err: any) {
    if (err.killed) {
      log("[git-reader] Git log timed out")
      return emptyResult("git-timeout")
    }
    log(`[git-reader] Git log failed: ${err.message}`)
    return emptyResult("not-a-git-repo")
  }

  const commitLines = onelineOutput.trim().split("\n").filter(Boolean)
  if (commitLines.length === 0) return emptyResult()

  const truncated = commitLines.length > MAX_COMMITS
  const cappedLines = truncated ? commitLines.slice(0, MAX_COMMITS) : commitLines

  // Get file change stats
  let statOutput: string
  try {
    statOutput = await runGit(
      ["log", "--numstat", "--since=midnight", `--author=${author}`, "--format=%H %s"],
      cwd
    )
  } catch {
    statOutput = ""
  }

  const fileStatsByHash = parseStatOutput(statOutput)

  // Build commits array
  const commits: StandupData["commits"] = cappedLines.map((line) => {
    const spaceIdx = line.indexOf(" ")
    const shortHash = line.substring(0, spaceIdx)
    const message = escapeHtml(line.substring(spaceIdx + 1))

    // Match short hash to full hash in stat output
    let files: Array<{ path: string; additions: number; deletions: number }> = []
    for (const [fullHash, hashFiles] of fileStatsByHash) {
      if (fullHash.startsWith(shortHash)) {
        files = hashFiles
        break
      }
    }

    return { hash: shortHash, message, files }
  })

  // Calculate aggregate stats
  let totalFiles = 0
  let totalAdditions = 0
  let totalDeletions = 0
  for (const commit of commits) {
    for (const file of commit.files) {
      totalFiles++
      totalAdditions += file.additions
      totalDeletions += file.deletions
    }
  }

  // Group commits by top-level directory
  const categoryMap = new Map<string, StandupData["commits"]>()
  for (const commit of commits) {
    const dirs = new Set<string>()
    for (const file of commit.files) {
      const topDir = file.path.split("/")[0]
      dirs.add(topDir)
    }
    if (dirs.size === 0) dirs.add("other")
    for (const dir of dirs) {
      if (!categoryMap.has(dir)) categoryMap.set(dir, [])
      categoryMap.get(dir)!.push(commit)
    }
  }

  const categories = Array.from(categoryMap.entries()).map(([name, catCommits]) => ({
    name,
    commits: catCommits,
  }))

  return {
    commits,
    stats: {
      totalCommits: commits.length,
      totalFiles,
      totalAdditions,
      totalDeletions,
    },
    categories,
    date: todayString(),
    ...(truncated ? { truncated: true } : {}),
  }
}
