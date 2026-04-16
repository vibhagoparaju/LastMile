/**
 * PIM (Personal Identity Model) Utility Functions
 */

/**
 * Compute PIM Richness Score live
 * Formula: (nodeCount / 200 * 40) + (relationshipCount / 100 * 30) + (sessionCount / 50 * 30), capped at 100
 */
export function computeRichnessScore(pimLayers: any, memoriesCount: number, sessionCount: number): number {
  if (!pimLayers) return 0;

  // Extract counts from PIM layers
  const nodeCount = 
    (pimLayers.identityLayer?.traits?.length || 0) +
    (pimLayers.identityLayer?.phrases?.length || 0) +
    (pimLayers.narrativeLayer?.events?.length || 0) +
    (pimLayers.relationalLayer?.people?.length || 0) +
    (pimLayers.valuesLayer?.beliefs?.length || 0);

  // In this NoSQL implementation, relationships are often embedded, 
  // but we can estimate them by the depth of PIM records
  const relationshipCount = 
    (pimLayers.relationalLayer?.people?.reduce((acc: number, p: any) => acc + (p.memories?.length || 0), 0) || 0);

  const richness = (nodeCount / 200 * 40) + (relationshipCount / 100 * 30) + (sessionCount / 50 * 30);
  
  return Math.min(Math.round(richness), 100);
}

/**
 * Get Richness Badge
 */
export function getRichnessLabel(score: number): "Early Stage" | "Growing" | "Rich" {
  if (score < 40) return "Early Stage";
  if (score < 70) return "Growing";
  return "Rich";
}

/**
 * Cosine Similarity implementation for client-side vector search
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
}

/**
 * Find highest PIM categories that need coverage
 */
export function suggestNextTopic(pimLayers: any): string {
  const scores = {
    'Early Life': pimLayers?.narrativeLayer?.events?.length || 0,
    'Relationships': pimLayers?.relationalLayer?.people?.length || 0,
    'Values & Beliefs': pimLayers?.valuesLayer?.beliefs?.length || 0,
    'Daily Humor': pimLayers?.identityLayer?.humorStyle ? 10 : 0,
    'Places of Origin': pimLayers?.entities?.places?.length || 0
  };

  const lowest = Object.entries(scores).reduce((prev, curr) => prev[1] < curr[1] ? prev : curr);
  return lowest[0];
}
