import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/** apps/web/dist, depuis src/core/web comme depuis dist/core/web : le front construit par Vite. */
export const WEB_DIST_DIR = join(__dirname, '..', '..', '..', '..', 'web', 'dist');

/**
 * En production, un seul service : l'API sert aussi le front construit, sur la même origine (donc
 * sans CORS). Les fichiers du front sont servis tels quels (`express.static`, par Nest) ; toute
 * autre lecture hors de `/api` reçoit `index.html`, et le router du front affiche sa page (`/`,
 * `/publier`, `/reservation`, `/trajets/:id/gestion`). Tout ce qui est sous `/api` reste à l'API,
 * erreurs comprises. À appeler avant `listen()`. Renvoie `false`, sans rien brancher, si le front
 * n'a pas été construit.
 */
export function serveWebApp(app: NestExpressApplication, webDist: string): boolean {
  const indexHtml = join(webDist, 'index.html');
  if (!existsSync(indexHtml)) return false;

  app.useStaticAssets(webDist);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (isWebAppRoute(request)) response.sendFile(indexHtml);
    else next();
  });
  return true;
}

/** Une page du front : une lecture, hors de `/api`, qui ne vise pas un fichier (pas d'extension). */
function isWebAppRoute({ method, path }: Request): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (path === '/api' || path.startsWith('/api/')) return false;
  return extname(path) === '';
}
