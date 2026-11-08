DROP INDEX "bookings_trip_passenger_phone_key";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "cancelled_at" timestamp (3) with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_trip_passenger_phone_key" ON "bookings" USING btree ("trip_id","passenger_phone") WHERE "bookings"."cancelled_at" is null;