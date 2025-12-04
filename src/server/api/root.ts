import { apiKeyRouter } from "./routers/api-key";
import { contentRouter } from "./routers/content";
import { marketResearchRouter } from "./routers/market-research";
import { productRouter } from "./routers/product";
import { promptRouter } from "./routers/prompt";
import { snsResearchRouter } from "./routers/sns-research";
import { strategyRouter } from "./routers/strategy";
import { workflowRouter } from "./routers/workflow";
import { aiSessionRouter } from "./routers/ai-session";
import { aiSpaceRouter } from "./routers/ai-space";
import { aiSkillRouter } from "./routers/ai-skill";
import { router } from "./trpc";

export const appRouter = router({
  product: productRouter,
  marketResearch: marketResearchRouter,
  snsResearch: snsResearchRouter,
  strategy: strategyRouter,
  content: contentRouter,
  workflow: workflowRouter,
  apiKey: apiKeyRouter,
  prompt: promptRouter,
  aiSession: aiSessionRouter,
  aiSpace: aiSpaceRouter,
  aiSkill: aiSkillRouter,
});

export type AppRouter = typeof appRouter;

