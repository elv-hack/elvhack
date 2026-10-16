import { execSync } from 'node:child_process';

/** 构建信息：Cloudflare Pages 构建时有 CF_PAGES_COMMIT_SHA，本地退回到 git。 */
function commitSha(): string {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

const sha = commitSha();
const time = new Date();
const two = (n: number) => String(n).padStart(2, '0');

export const build = {
  sha,
  short: sha ? sha.slice(0, 7) : 'local',
  url: sha ? `https://github.com/vx-zjr/elvhack/commit/${sha}` : undefined,
  /** 2026-10-16 05:05 UTC */
  stamp: `${time.getUTCFullYear()}-${two(time.getUTCMonth() + 1)}-${two(time.getUTCDate())} ${two(time.getUTCHours())}:${two(time.getUTCMinutes())} UTC`,
};
