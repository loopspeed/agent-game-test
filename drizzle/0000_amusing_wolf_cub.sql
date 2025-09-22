CREATE TYPE "public"."player_colour" AS ENUM('#3b82f6', '#14b8a6', '#a855f7');--> statement-breakpoint
CREATE TYPE "public"."player_shape" AS ENUM('orb');--> statement-breakpoint
CREATE TABLE "Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"userId" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"lastContext" jsonb
);
--> statement-breakpoint
CREATE TABLE "Message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"markdown" text NOT NULL,
	"playable" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64),
	"colour" "player_colour" DEFAULT '#14b8a6' NOT NULL,
	"shape" "player_shape" DEFAULT 'orb' NOT NULL,
	"hasSetupPlayer" boolean DEFAULT false NOT NULL,
	"hasSeenIntro" boolean DEFAULT false NOT NULL,
	"hasSeenControls" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Test" ADD CONSTRAINT "Test_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "Test_chatId_createdAt_idx" ON "Test" USING btree ("chatId","createdAt");