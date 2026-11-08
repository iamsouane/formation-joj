import type { INestApplication } from '@nestjs/common';
import { publishedTripSchema, TRIP_SITES, tripListSchema } from '@joj/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { TripRepository } from '../src/modules/trips/application/trip.repository';
import { Trip } from '../src/modules/trips/domain/trip';
import { createTestApp } from './create-test-app';

const HOUR = 60 * 60 * 1000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

const pikineToDiamniadio = (departureAt = inHours(24)) => ({
  departurePlace: 'Pikine',
  site: 'Diamniadio',
  departureAt,
  seats: 3,
  pricePerSeat: 1000,
  driverPhone: '+221771234567',
});

describe('/api/trips (e2e)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const listDiamniadio = async () =>
    tripListSchema.parse((await api().get('/api/trips?site=diamniadio').expect(200)).body);

  // Une base neuve par test : chaque liste ne voit que les trajets de son test.
  beforeEach(async () => {
    await app?.close();
    app = await createTestApp();
  });

  afterAll(() => app?.close());

  it('001-AS1: publishes a trip (201) and returns it with a management code', async () => {
    const departureAt = inHours(24);
    const response = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(departureAt))
      .expect(201);

    expect(response.body).not.toHaveProperty('driverPhone');
    expect(publishedTripSchema.parse(response.body)).toMatchObject({
      departurePlace: 'Pikine',
      site: 'diamniadio',
      departureAt,
      seats: 3,
      pricePerSeat: 1000,
      managementCode: expect.stringMatching(/^\S{8,}$/),
    });
  });

  it('001-AS2: lists upcoming trips to a site sorted by departure, without phone or code', async () => {
    const at10 = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(inHours(26)))
      .expect(201);
    const at8 = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(inHours(24)))
      .expect(201);
    await api()
      .post('/api/trips')
      .send({ ...pikineToDiamniadio(), site: 'saly' })
      .expect(201);
    // Un trajet déjà parti ne peut pas être publié : on le place directement dans le dépôt.
    await app.get(TripRepository).insert(
      Trip.restore({
        id: '0199f5c2-0000-7000-8000-0000000000aa',
        departurePlace: 'Rufisque',
        site: 'diamniadio',
        departureAt: new Date(inHours(-2)),
        seats: 2,
        pricePerSeat: 500,
        driverPhone: '+221770000000',
        managementCode: 'departed-code',
        createdAt: new Date(inHours(-24)),
      }),
    );

    const response = await api().get('/api/trips?site=Diamniadio').expect(200);

    expect(response.body.map((trip: { id: string }) => trip.id)).toEqual([
      at8.body.id,
      at10.body.id,
    ]);
    for (const trip of response.body) {
      expect(trip).not.toHaveProperty('driverPhone');
      expect(trip).not.toHaveProperty('managementCode');
    }
  });

  it('001-AS3: rejects an unknown site (400 SITE_UNKNOWN) and creates nothing', async () => {
    const response = await api()
      .post('/api/trips')
      .send({ ...pikineToDiamniadio(), site: 'Thiès' })
      .expect(400);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ code: 'SITE_UNKNOWN' });
    // Preuve directe : le dépôt ne contient aucun trajet, quel que soit le site ou l'heure.
    const trips = app.get(TripRepository);
    const stored = await Promise.all(
      TRIP_SITES.map((site) => trips.listUpcomingBySite(site, new Date(0))),
    );
    expect(stored.flat()).toEqual([]);
  });

  it('001-AS3: rejects the list of an unknown site (400 SITE_UNKNOWN)', async () => {
    const response = await api().get('/api/trips?site=Thiès').expect(400);
    expect(response.body).toMatchObject({ code: 'SITE_UNKNOWN' });
  });

  it('001-AS4: rejects a departure in the past (400 DEPARTURE_IN_PAST) and creates nothing', async () => {
    const response = await api()
      .post('/api/trips')
      .send(pikineToDiamniadio(inHours(-24)))
      .expect(400);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ code: 'DEPARTURE_IN_PAST' });
    expect(await listDiamniadio()).toEqual([]);
  });
});
