/**
 * Cloudflare Pages Function: /health
 * Global Edge Health & Service Status Check
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Correlation-Id"
      }
    });
  }

  return new Response(
    JSON.stringify({
      status: "healthy",
      service: "pharmatech-os",
      version: "MVP-0.1",
      runtime: "cloudflare-pages-edge",
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Correlation-Id"
      }
    }
  );
}
