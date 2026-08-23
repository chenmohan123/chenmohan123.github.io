/** @typedef {'required'|'recommended'|'labs'} RuleLevel */
/** @typedef {'pass'|'fail'|'skip'|'info'|'not-applicable'|'unknown'} FindingStatus */

/**
 * @typedef {Object} Finding
 * @property {string} id
 * @property {RuleLevel|string} level
 * @property {FindingStatus} status
 * @property {string} [path]
 * @property {string} message
 * @property {string} remediation
 * @property {string} [evidence]
 */

/**
 * @typedef {Object} RepositoryEvidence
 * @property {string} repository
 * @property {string|undefined} packageName
 * @property {string|undefined} packageVersion
 * @property {string[]} locales
 * @property {boolean} manifestDeclared
 * @property {boolean} demoEntry
 * @property {boolean} demoChineseDefault
 * @property {boolean} demoLanguageToggle
 * @property {boolean} cacheClear
 * @property {boolean} timingMarkers
 * @property {boolean} modelInformation
 * @property {boolean} runtimeInformation
 * @property {boolean} performanceTimings
 * @property {boolean} cacheContract
 * @property {boolean} releaseWorkflow
 * @property {boolean} ciWorkflow
 * @property {boolean} changelog
 * @property {boolean} publicLinks
 * @property {boolean} uiTokens
 * @property {string[]} examples
 * @property {string[]} paths
 * @property {Record<string, string[]>} evidenceByKey
 */

/** @typedef {Object} ScanReport
 * @property {string} repository
 * @property {string} standardVersion
 * @property {RepositoryEvidence} evidence
 * @property {Record<string, unknown>|null} manifest
 * @property {Finding[]} findings
 * @property {string[]} errors
 */

export {};
