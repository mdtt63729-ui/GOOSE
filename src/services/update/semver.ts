/**
 * Semantic version parser and comparator.
 * Accurately parses semver numbers ensuring e.g. "1.10.0" > "1.9.0", "1.0.1" > "1.0.0".
 */
export function cleanVersion(v: string): string {
  if (!v) return '0.0.0';
  return v.trim().replace(/^v/i, '');
}

export interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
}

export function parseSemver(v: string): ParsedSemver {
  const clean = cleanVersion(v);
  const [versionCore, ...preParts] = clean.split('-');
  const prerelease = preParts.join('-');

  const parts = versionCore.split('.').map((p) => {
    const num = parseInt(p, 10);
    return isNaN(num) ? 0 : num;
  });

  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease: prerelease || '',
  };
}

/**
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v2 is newer)
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) {
    return p1.major > p2.major ? 1 : -1;
  }
  if (p1.minor !== p2.minor) {
    return p1.minor > p2.minor ? 1 : -1;
  }
  if (p1.patch !== p2.patch) {
    return p1.patch > p2.patch ? 1 : -1;
  }

  // Pre-release versions have lower precedence than normal version
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}
