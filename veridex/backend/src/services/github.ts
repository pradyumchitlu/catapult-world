import { Octokit } from 'octokit';

const MAX_REPOS_FOR_LANGUAGE_BYTES = 15;
const MAX_REPOS_FOR_COMMIT_HISTORY = 12;
const COMMITS_LOOKBACK_DAYS = 365;

type JsonRecord = Record<string, any>;
type RawRepo = Record<string, any>;
type GitHubFetchOptions = { accessToken?: string };

export interface GitHubUserProfile {
  username: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  repos: GitHubRepo[];
  languages: string[];
  total_stars: number;
  language_bytes?: Record<string, number>;
  significant_repo_count?: number;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size_kb: number;
  is_fork: boolean;
  language_bytes?: Record<string, number>;
}

export interface ContributionHistory {
  total_commits_last_year: number;
  commit_frequency: 'high' | 'medium' | 'low';
  active_months: number;
  longest_streak_days: number;
  recent_activity_score: number;
  latest_commit_at?: string | null;
  commits_last_90_days?: number;
  commits_last_30_days?: number;
}

export interface CollaborationSignals {
  prs_merged_to_external_repos: number;
  issues_opened_on_external_repos: number;
  repos_contributed_to: number;
  collaboration_score: number;
  prs_opened_to_external_repos?: number;
}

export interface GitHubSignals {
  userProfile: GitHubUserProfile;
  contributions: ContributionHistory;
  collaboration: CollaborationSignals;
}

function createOctokit(options: GitHubFetchOptions = {}): Octokit {
  return new Octokit({
    auth: options.accessToken || process.env.GITHUB_TOKEN || undefined,
  });
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sortReposByFreshness<T extends { pushed_at?: string; updated_at?: string }>(repos: T[]): T[] {
  return [...repos].sort((a, b) => {
    const aTime = Date.parse(a.pushed_at || a.updated_at || '') || 0;
    const bTime = Date.parse(b.pushed_at || b.updated_at || '') || 0;
    return bTime - aTime;
  });
}

function formatRepo(repo: RawRepo, languageBytes?: Record<string, number>): GitHubRepo {
  return {
    owner: repo.owner?.login || '',
    name: repo.name,
    description: repo.description,
    language: repo.language ?? null,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    topics: repo.topics || [],
    created_at: repo.created_at || '',
    updated_at: repo.updated_at || '',
    pushed_at: repo.pushed_at || repo.updated_at || '',
    size_kb: repo.size || 0,
    is_fork: Boolean(repo.fork),
    language_bytes: languageBytes,
  };
}

async function fetchRawRepos(octokit: Octokit, username: string): Promise<RawRepo[]> {
  const { data: repos } = await octokit.rest.repos.listForUser({
    username,
    sort: 'updated',
    per_page: 100,
  });

  return repos as RawRepo[];
}

async function fetchLanguageBytesForRepos(
  octokit: Octokit,
  repos: RawRepo[]
): Promise<Map<string, Record<string, number>>> {
  const languageMap = new Map<string, Record<string, number>>();
  const candidates = sortReposByFreshness(repos)
    .filter((repo) => !repo.fork)
    .slice(0, MAX_REPOS_FOR_LANGUAGE_BYTES);

  for (const repo of candidates) {
    const key = `${repo.owner?.login || ''}/${repo.name}`;
    try {
      const { data } = await octokit.rest.repos.listLanguages({
        owner: repo.owner?.login || '',
        repo: repo.name,
      });
      languageMap.set(key, data as Record<string, number>);
    } catch (error) {
      console.error(`Error fetching languages for ${key}:`, error);
      languageMap.set(key, {});
    }
  }

  return languageMap;
}

function aggregateLanguageBytes(
  repos: RawRepo[],
  languageBytesByRepo: Map<string, Record<string, number>>
): Record<string, number> {
  const aggregated: Record<string, number> = {};

  for (const repo of repos) {
    const key = `${repo.owner?.login || ''}/${repo.name}`;
    const languageBytes = languageBytesByRepo.get(key);

    if (languageBytes && Object.keys(languageBytes).length > 0) {
      for (const [language, bytes] of Object.entries(languageBytes)) {
        aggregated[language] = (aggregated[language] || 0) + bytes;
      }
      continue;
    }

    if (repo.language) {
      aggregated[repo.language] = (aggregated[repo.language] || 0) + Math.max(1, repo.size || 1);
    }
  }

  return aggregated;
}

function scoreRecency(daysAgo: number | null): number {
  if (daysAgo === null) return 0;
  if (daysAgo <= 7) return 100;
  if (daysAgo <= 30) return 90;
  if (daysAgo <= 90) return 75;
  if (daysAgo <= 180) return 55;
  if (daysAgo <= 365) return 35;
  return 10;
}

function calculateLongestStreakDays(commitDayKeys: string[]): number {
  if (commitDayKeys.length === 0) {
    return 0;
  }

  const timestamps = [...new Set(commitDayKeys)]
    .map((dayKey) => Date.parse(`${dayKey}T00:00:00Z`))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);

  if (timestamps.length === 0) {
    return 0;
  }

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < timestamps.length; i += 1) {
    const daysBetween = (timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24);
    if (daysBetween === 1) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

async function buildUserProfile(
  octokit: Octokit,
  username: string,
  rawRepos?: RawRepo[],
  languageBytesByRepo?: Map<string, Record<string, number>>
): Promise<{ userProfile: GitHubUserProfile; rawRepos: RawRepo[]; languageBytesByRepo: Map<string, Record<string, number>> }> {
  const { data: user } = await octokit.rest.users.getByUsername({ username });
  const repos = rawRepos || await fetchRawRepos(octokit, username);
  const nonForkRepos = repos.filter((repo) => !repo.fork);
  const languagesByRepo = languageBytesByRepo || await fetchLanguageBytesForRepos(octokit, nonForkRepos);
  const aggregatedLanguageBytes = aggregateLanguageBytes(nonForkRepos, languagesByRepo);
  const languages = Object.entries(aggregatedLanguageBytes)
    .sort((a, b) => b[1] - a[1])
    .map(([language]) => language);

  const processedRepos = sortReposByFreshness(nonForkRepos)
    .map((repo) => {
      const key = `${repo.owner?.login || ''}/${repo.name}`;
      return formatRepo(repo, languagesByRepo.get(key));
    });

  const significantRepoCount = processedRepos.filter((repo) => {
    const hasEnoughSize = repo.size_kb >= 50;
    const hasSignal = repo.stars > 0 || repo.forks > 0 || repo.topics.length > 0;
    return hasEnoughSize || hasSignal;
  }).length;

  return {
    userProfile: {
      username: user.login,
      name: user.name,
      bio: user.bio,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      created_at: user.created_at,
      repos: processedRepos.slice(0, 20),
      languages,
      total_stars: processedRepos.reduce((sum, repo) => sum + repo.stars, 0),
      language_bytes: aggregatedLanguageBytes,
      significant_repo_count: significantRepoCount,
    },
    rawRepos: repos,
    languageBytesByRepo: languagesByRepo,
  };
}

async function buildContributionHistory(
  octokit: Octokit,
  username: string,
  rawRepos: RawRepo[]
): Promise<ContributionHistory> {
  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - COMMITS_LOOKBACK_DAYS);
    const sinceIso = sinceDate.toISOString();

    const commitDates: string[] = [];
    const recentRepos = sortReposByFreshness(rawRepos)
      .filter((repo) => !repo.fork)
      .slice(0, MAX_REPOS_FOR_COMMIT_HISTORY);

    for (const repo of recentRepos) {
      const owner = repo.owner?.login || username;
      try {
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner,
          repo: repo.name,
          author: username,
          since: sinceIso,
          per_page: 100,
        });

        for (const commit of commits) {
          const authoredAt = commit.commit?.author?.date;
          if (authoredAt) {
            commitDates.push(authoredAt);
          }
        }
      } catch (error) {
        const status = (error as { status?: number } | null)?.status;
        if (status !== 409) {
          console.error(`Error fetching commits for ${owner}/${repo.name}:`, error);
        }
      }
    }

    if (commitDates.length === 0) {
      const latestRepoPush = sortReposByFreshness(recentRepos)[0]?.pushed_at || null;
      return {
        total_commits_last_year: 0,
        commit_frequency: 'low',
        active_months: 0,
        longest_streak_days: 0,
        recent_activity_score: scoreRecency(latestRepoPush ? Math.floor((Date.now() - Date.parse(latestRepoPush)) / (1000 * 60 * 60 * 24)) : null),
        latest_commit_at: latestRepoPush,
        commits_last_90_days: 0,
        commits_last_30_days: 0,
      };
    }

    const monthKeys = new Set<string>();
    const dayKeys: string[] = [];
    let commitsLast30Days = 0;
    let commitsLast90Days = 0;
    let latestCommitAt: string | null = null;

    for (const commitDate of commitDates) {
      const date = new Date(commitDate);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const dayKey = date.toISOString().slice(0, 10);
      monthKeys.add(monthKey);
      dayKeys.push(dayKey);

      if (!latestCommitAt || date.getTime() > Date.parse(latestCommitAt)) {
        latestCommitAt = date.toISOString();
      }

      const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 30) commitsLast30Days += 1;
      if (ageDays <= 90) commitsLast90Days += 1;
    }

    const totalCommits = commitDates.length;
    const activeMonths = monthKeys.size;
    const longestStreakDays = calculateLongestStreakDays(dayKeys);

    let commitFrequency: 'high' | 'medium' | 'low' = 'low';
    if (totalCommits >= 120 || activeMonths >= 10 || commitsLast90Days >= 45) {
      commitFrequency = 'high';
    } else if (totalCommits >= 36 || activeMonths >= 5 || commitsLast90Days >= 12) {
      commitFrequency = 'medium';
    }

    const latestCommitAgeDays = latestCommitAt
      ? Math.floor((Date.now() - Date.parse(latestCommitAt)) / (1000 * 60 * 60 * 24))
      : null;

    const recencyBase = scoreRecency(latestCommitAgeDays);
    const recentActivityScore = clampScore(
      (recencyBase * 0.6) +
      Math.min(25, commitsLast90Days * 1.25) +
      Math.min(15, activeMonths * 1.25)
    );

    return {
      total_commits_last_year: totalCommits,
      commit_frequency: commitFrequency,
      active_months: activeMonths,
      longest_streak_days: longestStreakDays,
      recent_activity_score: recentActivityScore,
      latest_commit_at: latestCommitAt,
      commits_last_90_days: commitsLast90Days,
      commits_last_30_days: commitsLast30Days,
    };
  } catch (error) {
    console.error('Error fetching contribution history:', error);
    return {
      total_commits_last_year: 0,
      commit_frequency: 'low',
      active_months: 0,
      longest_streak_days: 0,
      recent_activity_score: 0,
      latest_commit_at: null,
      commits_last_90_days: 0,
      commits_last_30_days: 0,
    };
  }
}

function extractRepoFullName(item: JsonRecord): string | null {
  if (typeof item.repository_url === 'string') {
    const parts = item.repository_url.split('/repos/')[1];
    return parts || null;
  }

  if (typeof item.html_url === 'string') {
    const match = item.html_url.match(/github\.com\/([^/]+\/[^/]+)/);
    return match?.[1] || null;
  }

  return null;
}

async function buildCollaborationSignals(octokit: Octokit, username: string): Promise<CollaborationSignals> {
  try {
    const baseQuery = `author:${username} -user:${username} archived:false`;

    const [externalPrs, mergedExternalPrs, externalIssues] = await Promise.all([
      octokit.rest.search.issuesAndPullRequests({
        q: `${baseQuery} is:pr`,
        per_page: 100,
      }),
      octokit.rest.search.issuesAndPullRequests({
        q: `${baseQuery} is:pr is:merged`,
        per_page: 100,
      }),
      octokit.rest.search.issuesAndPullRequests({
        q: `${baseQuery} is:issue`,
        per_page: 100,
      }),
    ]);

    const repoNames = new Set<string>();
    for (const item of [
      ...externalPrs.data.items,
      ...mergedExternalPrs.data.items,
      ...externalIssues.data.items,
    ]) {
      const repoFullName = extractRepoFullName(item as JsonRecord);
      if (repoFullName) {
        repoNames.add(repoFullName);
      }
    }

    const prsOpened = externalPrs.data.total_count;
    const prsMerged = mergedExternalPrs.data.total_count;
    const issuesOpened = externalIssues.data.total_count;
    const reposContributedTo = repoNames.size;

    const collaborationScore = clampScore(
      (prsMerged * 12) +
      (prsOpened * 2.5) +
      (issuesOpened * 1.5) +
      (reposContributedTo * 6)
    );

    return {
      prs_merged_to_external_repos: prsMerged,
      issues_opened_on_external_repos: issuesOpened,
      repos_contributed_to: reposContributedTo,
      collaboration_score: collaborationScore,
      prs_opened_to_external_repos: prsOpened,
    };
  } catch (error) {
    console.error('Error fetching collaboration signals:', error);
    return {
      prs_merged_to_external_repos: 0,
      issues_opened_on_external_repos: 0,
      repos_contributed_to: 0,
      collaboration_score: 0,
      prs_opened_to_external_repos: 0,
    };
  }
}

export async function fetchGitHubSignals(
  username: string,
  options: GitHubFetchOptions = {}
): Promise<GitHubSignals> {
  const octokit = createOctokit(options);
  const rawRepos = await fetchRawRepos(octokit, username);
  const nonForkRepos = rawRepos.filter((repo) => !repo.fork);
  const languageBytesByRepo = await fetchLanguageBytesForRepos(octokit, nonForkRepos);
  const { userProfile } = await buildUserProfile(octokit, username, rawRepos, languageBytesByRepo);
  const [contributions, collaboration] = await Promise.all([
    buildContributionHistory(octokit, username, rawRepos),
    buildCollaborationSignals(octokit, username),
  ]);

  return {
    userProfile,
    contributions,
    collaboration,
  };
}

/**
 * Fetch user profile and repository information.
 */
export async function fetchUserProfile(
  username: string,
  options: GitHubFetchOptions = {}
): Promise<GitHubUserProfile> {
  const { userProfile } = await fetchGitHubSignals(username, options);
  return userProfile;
}

/**
 * Fetch contribution history with authored-commit sampling across recent public repos.
 */
export async function fetchContributionHistory(
  username: string,
  options: GitHubFetchOptions = {}
): Promise<ContributionHistory> {
  const { contributions } = await fetchGitHubSignals(username, options);
  return contributions;
}

/**
 * Fetch collaboration signals using GitHub search over external PRs/issues.
 */
export async function fetchCollaborationSignals(
  username: string,
  options: GitHubFetchOptions = {}
): Promise<CollaborationSignals> {
  const { collaboration } = await fetchGitHubSignals(username, options);
  return collaboration;
}
