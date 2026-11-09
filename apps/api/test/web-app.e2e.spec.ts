import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './create-test-app';

/**
 * En production, un seul service : l'API sert aussi le front construit. Ici, un faux front dans
 * un dossier temporaire : sa page, un fichier de `assets/`, et rien d'autre.
 */
describe('the web app served by the API (e2e)', () => {
  let app: INestApplication;
  let webDist: string;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    webDist = mkdtempSync(join(tmpdir(), 'joj-web-dist-'));
    writeFileSync(join(webDist, 'index.html'), '<!doctype html><title>Covoiturage des JOJ</title>');
    mkdirSync(join(webDist, 'assets'));
    writeFileSync(join(webDist, 'assets', 'app.js'), 'console.log("joj");');
    app = await createTestApp({ webDist });
  });

  afterAll(async () => {
    await app?.close();
    rmSync(webDist, { recursive: true, force: true });
  });

  it.each([
    '/',
    '/publier',
    '/reservation',
    '/trajets/0199f5c2-0000-7000-8000-000000000101/gestion',
  ])('answers the page of the web app on its route %s', async (route) => {
    const response = await api().get(route).expect(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('<title>Covoiturage des JOJ</title>');
  });

  it('serves the built files of the web app', async () => {
    const response = await api().get('/assets/app.js').expect(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.text).toBe('console.log("joj");');
  });

  it('keeps everything under /api for the API, errors included', async () => {
    const health = await api().get('/api/health').expect(200);
    expect(health.body).toMatchObject({ status: 'ok' });

    const unknown = await api().get('/api/inconnue').expect(404);
    expect(unknown.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(unknown.body).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('never answers the page for a missing file or for a write', async () => {
    const missing = await api().get('/assets/absent.js');
    const write = await api().post('/publier');

    expect(missing.status).toBe(404);
    expect(write.status).toBe(404);
    expect(write.text).not.toContain('<title>');
  });
});

describe('the API alone, without a built web app (e2e)', () => {
  it('answers 404 on a route of the web app', async () => {
    const app = await createTestApp({ webDist: join(tmpdir(), 'joj-no-web-dist') });
    try {
      const page = await request(app.getHttpServer()).get('/publier');
      const health = await request(app.getHttpServer()).get('/api/health');

      expect(page.status).toBe(404);
      expect(health.status).toBe(200);
    } finally {
      await app.close();
    }
  });
});
