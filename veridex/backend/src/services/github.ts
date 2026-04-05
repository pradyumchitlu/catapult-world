import { Octokit } from 'octokit';

// Initialize Octokit (unauthenticated for public data, or with token for higher rate limits)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Optional: for higher rate limits
});

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
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  is_fork: boolean;
}

export interface ContributionHistory {
  total_commits_last_year: number;
  commit_frequency: 'high' | 'medium' | 'low';
  active_months: number;
  longest_streak_days: number;
  recent_activity_score: number; // 0-100
}

export interface CollaborationSignals {
  prs_merged_to_external_repos: number;
  issues_opened_on_external_repos: number;
  repos_contributed_to: number;
  collaboration_score: number; // 0-100
}

/**
 * Fetch user profile and repository information
 * Quality-over-quantity focus: weight signals that are hard to fake
 */
export async function fetchUserProfile(username: string): Promise<GitHubUserProfile> {
  try {
    // Get user info
    const { data: user } = await octokit.rest.users.getByUsername({ username });

    // Get repositories
    const { data: repos } = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      per_page: 100,
    });

    // Process repos
    const processedRepos: GitHubRepo[] = repos
      .filter((repo) => !repo.fork) // Exclude forks for quality signal
      .map((repo) => ({
        name: repo.name,
        description: repo.description,
        language: repo.language ?? null,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        topics: repo.topics || [],
        created_at: repo.created_at || '',
        updated_at: repo.updated_at || '',
        is_fork: repo.fork,
      }));

    // Extract languages
    const languageCounts: Record<string, number> = {};
    processedRepos.forEach((repo) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });
    const languages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);

    // Calculate total stars
    const totalStars = processedRepos.reduce((sum, repo) => sum + repo.stars, 0);

    return {
      username: user.login,
      name: user.name,
      bio: user.bio,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      created_at: user.created_at,
      repos: processedRepos.slice(0, 20), // Top 20 repos
      languages,
      total_stars: totalStars,
    };
  } catch (error) {
    console.error('Error fetching GitHub user profile:', error);
    throw error;
  }
}

/**
 * Fetch contribution history
 * Focus on consistency over time (hard to fake)
 */
export async function fetchContributionHistory(username: string): Promise<ContributionHistory> {
  try {
    // Note: GitHub's contribution graph data requires GraphQL API or scraping
    // For the hackathon, we'll estimate based on commit activity

    // Get recent commits across user's repos
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 100,
    });

    // Count push events (commits)
    const pushEvents = events.filter((e) => e.type === 'PushEvent');
    const totalCommits = pushEvents.length;

    // Estimate activity score based on event frequency
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const recentEvents = events.filter((e) => new Date(e.created_at!) > oneMonthAgo);

    let commitFrequency: 'high' | 'medium' | 'low';
    if (recentEvents.length > 50) {
      commitFrequency = 'high';
    } else if (recentEvents.length > 20) {
      commitFrequency = 'medium';
    } else {
      commitFrequency = 'low';
    }

    // Calculate recent activity score
    const recentActivityScore = Math.min(100, (recentEvents.length / 50) * 100);

    return {
      total_commits_last_year: totalCommits * 4, // Rough estimate
      commit_frequency: commitFrequency,
      active_months: Math.min(12, Math.ceil(totalCommits / 10)),
      longest_streak_days: Math.ceil(totalCommits / 2), // Rough estimate
      recent_activity_score: Math.round(recentActivityScore),
    };
  } catch (error) {
    console.error('Error fetching contribution history:', error);
    // Return default values on error
    return {
      total_commits_last_year: 0,
      commit_frequency: 'low',
      active_months: 0,
      longest_streak_days: 0,
      recent_activity_score: 0,
    };
  }
}

/**
 * Fetch collaboration signals
 * PRs merged to external repos are high-quality signals (hard to fake)
 */
export async function fetchCollaborationSignals(username: string): Promise<CollaborationSignals> {
  try {
    // Get user's events to find external contributions
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 100,
    });

    // Find PR events to non-owned repos
    const prEvents = events.filter((e) => e.type === 'PullRequestEvent');
    const issueEvents = events.filter((e) => e.type === 'IssuesEvent');

    // Count external contributions
    const externalPRs = prEvents.filter((e) => {
      const repo = e.repo.name.split('/')[0];
      return repo.toLowerCase() !== username.toLowerCase();
    });

    const externalIssues = issueEvents.filter((e) => {
      const repo = e.repo.name.split('/')[0];
      return repo.toLowerCase() !== username.toLowerCase();
    });

    // Get unique repos contributed to
    const contributedRepos = new Set([
      ...externalPRs.map((e) => e.repo.name),
      ...externalIssues.map((e) => e.repo.name),
    ]);

    // Calculate collaboration score
    const collaborationScore = Math.min(
      100,
      (externalPRs.length * 10) + (externalIssues.length * 2) + (contributedRepos.size * 5)
    );

    return {
      prs_merged_to_external_repos: externalPRs.length,
      issues_opened_on_external_repos: externalIssues.length,
      repos_contributed_to: contributedRepos.size,
      collaboration_score: collaborationScore,
    };
  } catch (error) {
    console.error('Error fetching collaboration signals:', error);
    return {
      prs_merged_to_external_repos: 0,
      issues_opened_on_external_repos: 0,
      repos_contributed_to: 0,
      collaboration_score: 0,
    };
  }
}
