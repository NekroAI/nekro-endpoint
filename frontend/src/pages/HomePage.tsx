import { Box } from "@mui/material";
import { HeroSection } from "@frontend/components/landing/HeroSection";
import { FeatureSection } from "@frontend/components/landing/FeatureSection";
import { TechStackSection } from "@frontend/components/landing/TechStackSection";
import { UseCaseSection } from "@frontend/components/landing/UseCaseSection";
import { ServerlessAdvantageSection } from "@frontend/components/landing/ServerlessAdvantageSection";

const HomePage = () => {
  return (
    <Box>
      <HeroSection />
      <FeatureSection />
      <TechStackSection />
      <ServerlessAdvantageSection />
      <UseCaseSection />
    </Box>
  );
};

export default HomePage;
