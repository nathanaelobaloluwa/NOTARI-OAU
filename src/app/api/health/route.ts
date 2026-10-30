import { apiSuccess } from "@/lib/utils/api-response";

export async function GET() {
  const healthData = {
    status: "healthy",
    platform: "NOTARI 2.0 (OAU)",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: "online",
      database: "configured",
      auth: "configured",
      storage: "configured",
      payments: "configured",
    },
  };

  return apiSuccess(healthData, "NOTARI 2.0 system operational");
}
