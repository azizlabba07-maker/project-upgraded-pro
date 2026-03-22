import { useState } from "react";
import TerminalHeader from "@/components/TerminalHeader";
import MarketAnalysis from "@/components/MarketAnalysis";
import PromptGenerator from "@/components/PromptGenerator";
import ImagePromptGenerator from "@/components/ImagePromptGenerator";
import Dashboard from "@/components/Dashboard";
import PortfolioTracker from "@/components/PortfolioTracker";
import ToolsSection from "@/components/ToolsSection";
import ApiKeySettings from "@/components/ApiKeySettings";
import InspirationLab from "@/components/InspirationLab";

const Index = () => {
  const [activeTab, setActiveTab] = useState("market");

  return (
    <div className="min-h-screen bg-background">
      <TerminalHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="container mx-auto px-5 pb-10">
        {activeTab === "market"     && <MarketAnalysis />}
        {activeTab === "generator"  && <PromptGenerator />}
        {activeTab === "claude"     && <ImagePromptGenerator />}
        {activeTab === "dashboard"  && <Dashboard />}
        {activeTab === "portfolio"  && <PortfolioTracker />}
        {activeTab === "tools"      && <ToolsSection />}
        {activeTab === "inspiration" && <InspirationLab />}
        {activeTab === "settings"   && <ApiKeySettings />}
      </div>
    </div>
  );
};

export default Index;
