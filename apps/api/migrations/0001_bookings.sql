CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trip_id" uuid NOT NULL,
	"passenger_name" varchar(100) NOT NULL,
	"passenger_phone" varchar(20) NOT NULL,
	"booking_code" varchar(32) NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_trip_passenger_phone_key" ON "bookings" USING btree ("trip_id","passenger_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings" USING btree ("booking_code");