/**
 * Keyword Overlap Worker
 * Optimized O(N*M) algorithm using inverted index.
 */

self.onmessage = (e: MessageEvent) => {
  const { items, threshold = 0.3 } = e.data;
  const results = [];
  const keywordIndex = new Map<string, any[]>();

  // 1. Build Inverted Index
  items.forEach((item: any) => {
    item.keywords.forEach((keyword: string) => {
      const normalized = keyword.toLowerCase().trim();
      if (!keywordIndex.has(normalized)) {
        keywordIndex.set(normalized, []);
      }
      keywordIndex.get(normalized)!.push(item);
    });
  });

  // 2. Track processed pairs to avoid duplicates
  const processedPairs = new Set<string>();

  // 3. Scan Index for overlaps
  keywordIndex.forEach((itemsWithKeyword) => {
    if (itemsWithKeyword.length > 1) {
      for (let i = 0; i < itemsWithKeyword.length; i++) {
        for (let j = i + 1; j < itemsWithKeyword.length; j++) {
          const item1 = itemsWithKeyword[i];
          const item2 = itemsWithKeyword[j];
          const pairKey = [item1.id, item2.id].sort().join('_');

          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);

            // Calculate exact intersection
            const set1 = new Set(item1.keywords.map((k: string) => k.toLowerCase().trim()));
            const set2 = new Set(item2.keywords.map((k: string) => k.toLowerCase().trim()));
            const intersection = [...set1].filter(k => set2.has(k));
            const percentage = intersection.length / Math.max(set1.size, set2.size);

            if (percentage >= threshold) {
              results.push({
                item1Id: item1.id,
                item2Id: item2.id,
                overlap: intersection,
                percentage
              });
            }
          }
        }
      }
    }
  });

  self.postMessage(results);
};
