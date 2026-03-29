import { Suspense, lazy } from "react";
import { useApp } from "@/contexts/AppContext";
import AppShell from "@/components/layout/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SkeletonPage } from "@/components/ui/Skeleton";

// Lazy load pages for better performance
const WelcomeDashboard = lazy(() => import("@/components/WelcomeDashboard"));
const MarketAnalysis = lazy(() => import("@/components/MarketAnalysis"));
const OpportunityEngine = lazy(() => import("@/components/OpportunityEngine"));
const UnifiedPromptHub = lazy(() => import("@/components/UnifiedPromptHub"));
const Dashboard = lazy(() => import("@/components/Dashboard"));
const ToolsSection = lazy(() => import("@/components/ToolsSection"));
const StoreAnalyzer = lazy(() => import("@/components/StoreAnalyzer"));
const PortfolioTracker = lazy(() => import("@/components/PortfolioTracker"));
const InspirationLab = lazy(() => import("@/components/InspirationLab"));
const ApiKeySettings = lazy(() => import("@/components/ApiKeySettings"));
const PromptHistory = lazy(() => import("@/components/PromptHistory"));
const AIBattle = lazy(() => import("@/components/AIBattle"));
const BatchProcessor = lazy(() => import("@/components/BatchProcessor"));
const NicheExplorer = lazy(() => import("@/components/NicheExplorer"));

const PageLoader = () => (
  <Suspense fallback={<SkeletonPage />}>
    <PageContent />
  </Suspense>
);

function PageContent() {
  const { activePage } = useApp();

  switch (activePage) {
    case "welcome":     return <WelcomeDashboard />;
    case "market":      return <MarketAnalysis />;
    case "opportunity": return <OpportunityEngine />;
    case "generator":   return <UnifiedPromptHub />;
    case "dashboard":   return <Dashboard />;
    case "tools":       return <ToolsSection />;
    case "store":       return <StoreAnalyzer />;
    case "portfolio":   return <PortfolioTracker />;
    case "inspiration": return <InspirationLab />;
    case "history":     return <PromptHistory />;
    case "battle":      return <AIBattle />;
    case "batch":       return <BatchProcessor />;
    case "niche":       return <NicheExplorer />;
    case "settings":    return <ApiKeySettings />;
    default:            return <WelcomeDashboard />;
  }
}

const Index = () => {
  return (
    <AppShell>
      <ErrorBoundary>
        <PageLoader />
      </ErrorBoundary>
    </AppShell>
  );
};

export default Index;
