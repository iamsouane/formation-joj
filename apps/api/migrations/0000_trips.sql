CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY NOT NULL,
	"departure_place" varchar(100) NOT NULL,
	"site" varchar(20) NOT NULL,
	"departure_at" timestamp (3) with time zone NOT NULL,
	"seats" integer NOT NULL,
	"price_per_seat" integer NOT NULL,
	"driver_phone" varchar(20) NOT NULL,
	"management_code" varchar(32) NOT NULL,
	"created_at" timestamp (3) with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trips_management_code_key" ON "trips" USING btree ("management_code");--> statement-breakpoint
CREATE INDEX "trips_site_departure_at_idx" ON "trips" USING btree ("site","departure_at");