import { useState, useCallback, useEffect, useMemo } from 'react';

interface OverlapResult {
  item1Id: string;
  item2Id: string;
  overlap: string[];
  percentage: number;
}

export const useKeywordOptimizer = (items: any[], threshold: number = 0.3) => {
  const [results, setResults] = useState<OverlapResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processItems = useCallback(() => {
    if (items.length < 2) {
      setResults([]);
      return;
    }

    setIsProcessing(true);
    
    // In Vite, we can import the worker like this:
    const worker = new Worker(new URL('../workers/keywordWorker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      setResults(e.data);
      setIsProcessing(false);
      worker.terminate();
    };

    worker.postMessage({ items, threshold });

    return () => worker.terminate();
  }, [items, threshold]);

  useEffect(() => {
    const cleanup = processItems();
    return cleanup;
  }, [processItems]);

  return { results, isProcessing };
};
