import { useState } from "react";
import TerminalHeader from "@/components/TerminalHeader";
import MarketAnalysis from "@/components/MarketAnalysis";
import OpportunityEngine from "@/components/OpportunityEngine";
import UnifiedPromptHub from "@/components/UnifiedPromptHub";
import Dashboard from "@/components/Dashboard";
import ToolsSection from "@/components/ToolsSection";
import ApiKeySettings from "@/components/ApiKeySettings";
import InspirationLab from "@/components/InspirationLab";
import StoreAnalyzer from "@/components/StoreAnalyzer";

const Index = () => {
  const [activeTab, setActiveTab] = useState("market");

  return (
    <div className="min-h-screen bg-background">
      <TerminalHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="container mx-auto px-5 pb-10">
        {activeTab === "market"      && <MarketAnalysis />}
        {activeTab === "opportunity" && <OpportunityEngine />}
        {activeTab === "generator"   && <UnifiedPromptHub />}
        {activeTab === "dashboard"   && <Dashboard />}
        {activeTab === "tools"       && <ToolsSection />}
        {activeTab === "store"      && <StoreAnalyzer />}
        {activeTab === "inspiration" && <InspirationLab />}
        {activeTab === "settings"   && <ApiKeySettings />}
      </div>
    </div>
  );
};

export default Index;
