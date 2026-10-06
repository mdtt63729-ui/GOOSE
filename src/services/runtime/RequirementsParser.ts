export interface ParsedRequirement {
  name: string;
  raw: string;
  operator?: '==' | '>=' | '<=' | '~=' | '>' | '<';
  targetVersion?: string;
}

/**
 * Compare two semver-like version strings (e.g., '2.32.1' vs '2.31.0')
 * Returns 1 if a > b, -1 if a < b, 0 if a == b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((n) => parseInt(n.replace(/\D/g, '') || '0', 10));
  const partsB = b.split('.').map((n) => parseInt(n.replace(/\D/g, '') || '0', 10));
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const valA = partsA[i] || 0;
    const valB = partsB[i] || 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

/**
 * Check if an installed version satisfies the requirement specifier.
 */
export function isVersionCompatible(
  installedVersion: string,
  req: ParsedRequirement
): boolean {
  if (!req.operator || !req.targetVersion) {
    // Unpinned requirement, e.g. "requests" -> any installed version satisfies it
    return true;
  }

  const cmp = compareVersions(installedVersion, req.targetVersion);

  switch (req.operator) {
    case '==':
      return cmp === 0;
    case '>=':
      return cmp >= 0;
    case '<=':
      return cmp <= 0;
    case '>':
      return cmp > 0;
    case '<':
      return cmp < 0;
    case '~=': {
      // Compatible release clause (e.g. ~= 1.4 means >= 1.4 and == 1.*)
      if (cmp < 0) return false;
      const targetMajor = req.targetVersion.split('.')[0];
      const installedMajor = installedVersion.split('.')[0];
      return targetMajor === installedMajor;
    }
    default:
      return true;
  }
}

/**
 * Parse a pip requirements.txt file string into structured requirements.
 */
export function parseRequirements(content: string): ParsedRequirement[] {
  if (!content) return [];

  const lines = content.split('\n');
  const results: ParsedRequirement[] = [];

  for (const rawLine of lines) {
    let line = rawLine.trim();

    // Strip comments
    const commentIdx = line.indexOf('#');
    if (commentIdx !== -1) {
      line = line.substring(0, commentIdx).trim();
    }

    if (!line) continue;

    // Check for operators: ==, >=, <=, ~=, >, <
    const match = line.match(/^([a-zA-Z0-9_\-\.]+)\s*(==|>=|<=|~=|>|<)\s*([0-9a-zA-Z\.\-]+)/);

    if (match) {
      results.push({
        name: match[1].toLowerCase().replace(/_/g, '-'),
        operator: match[2] as ParsedRequirement['operator'],
        targetVersion: match[3],
        raw: line,
      });
    } else {
      // Unpinned package name
      const nameMatch = line.match(/^([a-zA-Z0-9_\-\.]+)/);
      if (nameMatch) {
        results.push({
          name: nameMatch[1].toLowerCase().replace(/_/g, '-'),
          raw: line,
        });
      }
    }
  }

  return results;
}
