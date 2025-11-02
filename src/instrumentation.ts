export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkAIHealth } = await import("./server/services/ai-health-check");

    console.log("🔍 Starting AI health check on server startup...");

    try {
      const healthStatus = await checkAIHealth();
      const healthyAgents = healthStatus.filter((h) => h.status === "healthy");
      const unhealthyAgents = healthStatus.filter((h) => h.status === "unhealthy");

      console.log("✅ AI Health Check Results:");
      healthyAgents.forEach((agent) => {
        console.log(`  ✓ ${agent.agent.toUpperCase()}: Healthy`);
      });

      if (unhealthyAgents.length > 0) {
        console.warn("⚠️  Unhealthy AI Agents:");
        unhealthyAgents.forEach((agent) => {
          console.warn(
            `  ✗ ${agent.agent.toUpperCase()}: ${agent.error || "Unknown error"}`,
          );
        });
      }

      if (healthyAgents.length === 0) {
        console.error(
          "❌ ERROR: No healthy AI agents found. The system may not function properly.",
        );
      } else {
        console.log(
          `\n✨ System ready with ${healthyAgents.length}/${healthStatus.length} AI agents healthy.`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to check AI health on startup:", error);
    }
  }
}

