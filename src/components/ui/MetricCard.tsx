// src/components/ui/MetricCard.tsx
import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  /** Optional chart component (e.g., sparkline) */
  chart?: React.ReactNode;
  /** Optional badge text */
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, chart, badge }) => {
  return (
    <div className="bg-card border-2 border-primary rounded-lg p-4 box-glow transition-transform hover:scale-[1.02]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-primary font-mono text-sm font-semibold">{title}</h3>
        {badge && (
          <span className="px-2 py-0.5 text-xs font-mono bg-primary/20 text-primary border border-primary rounded">
            {badge}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground font-mono mb-2">{value}</div>
      {chart && <div className="mt-2">{chart}</div>}
    </div>
  );
};

export default MetricCard;
