// Simple Swagger UI that loads the OpenAPI spec from /openapi.yaml
import { NextRequest } from "next/server";

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>BegaIA API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener('load', () => {
        const ui = SwaggerUIBundle({
          url: '/openapi.yaml',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
        });
        window.ui = ui;
      });
    </script>
  </body>
</html>`;

export async function GET(_req: NextRequest) {
    return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        status: 200,
    });
}
