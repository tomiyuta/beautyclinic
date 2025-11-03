import { apiKeyRouter } from "./routers/api-key";
import { contentRouter } from "./routers/content";
import { marketResearchRouter } from "./routers/market-research";
import { productRouter } from "./routers/product";
import { promptRouter } from "./routers/prompt";
import { snsResearchRouter } from "./routers/sns-research";
import { strategyManagementRouter } from "./routers/strategy-management";
import { strategyRouter } from "./routers/strategy";
import { workflowRouter } from "./routers/workflow";
import { router } from "./trpc";

export const appRouter = router({
  product: productRouter,
  marketResearch: marketResearchRouter,
  snsResearch: snsResearchRouter,
  strategy: strategyRouter,
  content: contentRouter,
  workflow: workflowRouter,
  strategyManagement: strategyManagementRouter,
  apiKey: apiKeyRouter,
  prompt: promptRouter,
});

export type AppRouter = typeof appRouter;

