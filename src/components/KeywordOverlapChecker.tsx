import React, { useEffect } from 'react';
import { useKeywordOptimizer } from '../hooks/useKeywordOptimizer';

interface KeywordItem {
  id: string;
  keywords: string[];
  title?: string;
  [key: string]: any;
}

interface OverlapResult {
  item1Id: string;
  item2Id: string;
  overlap: string[];
  percentage: number;
}

interface KeywordOverlapCheckerProps {
  items: KeywordItem[];
  threshold?: number;
  onOverlapFound?: (results: OverlapResult[]) => void;
}

export const KeywordOverlapChecker: React.FC<KeywordOverlapCheckerProps> = ({
  items,
  threshold = 0.3,
  onOverlapFound,
}) => {
  const { results, isProcessing } = useKeywordOptimizer(items, threshold);

  useEffect(() => {
    if (results.length > 0 && onOverlapFound) {
      onOverlapFound(results);
    }
  }, [results, onOverlapFound]);

  return (
    <div className="keyword-overlap-checker p-4 bg-slate-900 border border-slate-800 rounded-lg">
      {isProcessing && (
        <div className="flex items-center space-x-2 text-blue-400">
          <span className="animate-spin text-xl">⏳</span>
          <span>جاري فحص التداخل بين الكلمات المفتاحية...</span>
        </div>
      )}

      {!isProcessing && results.length > 0 && (
        <div className="results-container">
          <h3 className="text-yellow-400 font-bold mb-4">⚠️ تم العثور على {results.length} تداخل في الكلمات المفتاحية</h3>
          
          <ul className="space-y-4">
            {results.map((result, index) => {
              const item1 = items.find(i => i.id === result.item1Id);
              const item2 = items.find(i => i.id === result.item2Id);
              
              return (
                <li key={index} className="bg-slate-800 p-3 rounded-md">
                  <div className="flex items-center justify-between text-slate-300 mb-2">
                    <div className="flex space-x-2 space-x-reverse">
                      <strong className="text-white">{item1?.title || result.item1Id}</strong>
                      <span className="text-slate-500">↔</span>
                      <strong className="text-white">{item2?.title || result.item2Id}</strong>
                    </div>
                    <span className="text-red-400 text-sm font-semibold">
                      ({Math.round(result.percentage * 100)}% تداخل)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.overlap.map((keyword, i) => (
                      <span key={i} className="text-xs bg-red-900/50 text-red-200 px-2 py-1 rounded">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!isProcessing && results.length === 0 && items.length > 1 && (
        <div className="text-green-400 font-medium">
          ✅ لا يوجد تداخل مؤثر بين الكلمات المفتاحية
        </div>
      )}
    </div>
  );
};
