/**
 * ruleRetriever.js
 *
 * GROUNDED BUSINESS RULE RETRIEVER & KNOWLEDGE BASE
 * ===================================================
 *
 * Implements a lightweight, local Document Chunker and Section Retrieval Engine
 * for arena-specific business policies.
 *
 * Key Principles:
 *   1. Unstructured/semi-structured business knowledge is loaded from markdown policy documents.
 *   2. Document is chunked by section (Discount Policy, Peak Restrictions, Notification Policy, etc.).
 *   3. Retrieval selects relevant rule chunks and extracts grounded constraints.
 *   4. Safe fallback is provided if an arena policy is missing (never fabricates rules).
 */

const fs = require('fs');
const path = require('path');
const actionConfig = require('../../config/actionConfig');

const POLICIES_DIR = path.resolve(__dirname, '../../../../docs/arena-policies');

// In-memory knowledge chunk cache
let cachedChunks = null;

/**
 * Load and chunk all markdown policy documents in docs/arena-policies.
 *
 * @returns {Array<Object>} List of policy chunks with metadata
 */
function loadAndChunkPolicies() {
  if (cachedChunks) return cachedChunks;

  const chunks = [];

  try {
    if (!fs.existsSync(POLICIES_DIR)) {
      console.warn(`[RuleRetriever] Policy directory not found at: ${POLICIES_DIR}`);
      return [];
    }

    const files = fs.readdirSync(POLICIES_DIR).filter(f => f.endsWith('.md'));

    for (const filename of files) {
      const filePath = path.join(POLICIES_DIR, filename);
      const rawContent = fs.readFileSync(filePath, 'utf8');

      // Extract Arena ID and Name from header
      let arenaId = null;
      const arenaIdMatch = rawContent.match(/\*\*Arena ID\*\*:\s*(\d+)/i) || filename.match(/arena-(\d+)/i);
      if (arenaIdMatch) {
        arenaId = parseInt(arenaIdMatch[1], 10);
      }

      let arenaName = 'Unknown Arena';
      const nameMatch = rawContent.match(/\*\*Arena Name\*\*:\s*([^\n\r]+)/i);
      if (nameMatch) {
        arenaName = nameMatch[1].trim();
      }

      // Split document into section chunks by '## '
      const sections = rawContent.split(/\n(?=##\s+)/);

      for (const sectionBlock of sections) {
        const lines = sectionBlock.trim().split('\n');
        const headerLine = lines[0];
        if (!headerLine.startsWith('##')) continue;

        const sectionTitle = headerLine.replace(/^##\s*\d*\.?\s*/, '').trim();
        const contentLines = lines.slice(1);
        const sectionContent = contentLines.join('\n').trim();

        // Extract individual bullet rules
        const rules = contentLines
          .filter(l => l.trim().startsWith('*') || l.trim().startsWith('-'))
          .map(l => l.replace(/^[\*\-]\s*/, '').trim());

        chunks.push({
          arenaId,
          arenaName,
          source: filename,
          section: sectionTitle,
          content: sectionContent,
          rules,
        });
      }
    }

    cachedChunks = chunks;
  } catch (err) {
    console.error('[RuleRetriever] Failed to load policy documents:', err.message);
    cachedChunks = [];
  }

  return cachedChunks;
}

/**
 * Retrieve grounded business rules for a specific slot and arena.
 *
 * @param {{ arenaId: number|string, slot?: Object, query?: string }} options
 * @returns {Promise<Object>} Grounded rules and source document citations
 */
async function getRelevantRules(options = {}) {
  const arenaId = parseInt(options.arenaId || options.slot?.arenaId || 1, 10);
  const slot = options.slot || null;
  const chunks = loadAndChunkPolicies();

  const arenaChunks = chunks.filter(c => c.arenaId === arenaId);

  // Safe fallback if no policy document exists for arenaId
  if (!arenaChunks || arenaChunks.length === 0) {
    console.warn(`[RuleRetriever] No policy document found for Arena ID ${arenaId}. Using safe system defaults.`);
    return {
      arenaId,
      arenaName: `Arena #${arenaId}`,
      maxDiscountPercentage: actionConfig.maxDiscountPercentage || 20,
      allowPeakDiscounts: actionConfig.allowPeakDiscounts || false,
      allowWeekendDiscounts: true,
      notificationCost: 15,
      minimumFinalPrice: 0,
      isGroundedPolicy: false,
      policySource: 'Default System Constraints (No Arena Policy Found)',
      rulesUsed: [],
      sourceDocuments: [],
      retrievedAt: new Date().toISOString(),
    };
  }

  const primarySource = arenaChunks[0].source;
  const arenaName = arenaChunks[0].arenaName;

  // Extract structured constraints by analyzing relevant chunks
  let maxDiscountPercentage = 20;
  let allowPeakDiscounts = false;
  let allowWeekendDiscounts = true;
  let notificationCost = 15;
  let minimumFinalPrice = 0;

  const rulesUsed = [];
  const sourcesSet = new Set();

  for (const chunk of arenaChunks) {
    sourcesSet.add(chunk.source);
    const text = chunk.content.toLowerCase();
    const title = chunk.section.toLowerCase();

    // 1. Discount Policy
    if (title.includes('discount')) {
      const maxDiscMatch = chunk.content.match(/(\d+)%\s*(?:maximum|strict cap|max)/i) ||
                           chunk.content.match(/maximum.*?(\d+)%/i);
      if (maxDiscMatch) {
        maxDiscountPercentage = parseInt(maxDiscMatch[1], 10);
      }

      const floorMatch = chunk.content.match(/₹\s*(\d+)/);
      if (floorMatch) {
        minimumFinalPrice = parseInt(floorMatch[1], 10);
      }

      chunk.rules.forEach(r => {
        rulesUsed.push({
          rule: r,
          source: chunk.source,
          section: chunk.section,
          score: 0.95,
        });
      });
    }

    // 2. Peak-Hour Restrictions
    if (title.includes('peak')) {
      if (text.includes('zero discounts') || text.includes('no discounts') || text.includes('prohibition on peak')) {
        allowPeakDiscounts = false;
      }

      chunk.rules.forEach(r => {
        rulesUsed.push({
          rule: r,
          source: chunk.source,
          section: chunk.section,
          score: 0.92,
        });
      });
    }

    // 3. Weekend Restrictions
    if (title.includes('weekend')) {
      if (text.includes('no weekend discounts') || text.includes('zero discounts are permitted on saturday')) {
        allowWeekendDiscounts = false;
      }

      chunk.rules.forEach(r => {
        rulesUsed.push({
          rule: r,
          source: chunk.source,
          section: chunk.section,
          score: 0.90,
        });
      });
    }

    // 4. Notification Policy
    if (title.includes('notification')) {
      const costMatch = chunk.content.match(/₹\s*(\d+)\s*per slot/i);
      if (costMatch) {
        notificationCost = parseInt(costMatch[1], 10);
      }

      chunk.rules.forEach(r => {
        rulesUsed.push({
          rule: r,
          source: chunk.source,
          section: chunk.section,
          score: 0.88,
        });
      });
    }
  }

  return {
    arenaId,
    arenaName,
    maxDiscountPercentage,
    allowPeakDiscounts,
    allowWeekendDiscounts,
    notificationCost,
    minimumFinalPrice,
    isGroundedPolicy: true,
    policySource: primarySource,
    rulesUsed: rulesUsed.slice(0, 8), // Top relevant rules
    sourceDocuments: Array.from(sourcesSet),
    retrievedAt: new Date().toISOString(),
  };
}

// Backwards compatibility alias
async function getRules(arenaId) {
  return getRelevantRules({ arenaId });
}

module.exports = {
  loadAndChunkPolicies,
  getRelevantRules,
  getRules,
};
