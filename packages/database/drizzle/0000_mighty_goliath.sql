CREATE TABLE "auth" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"refresh_token_jti" varchar(255) NOT NULL,
	"access_token_jti" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_refresh_token_jti_unique" UNIQUE("refresh_token_jti"),
	CONSTRAINT "auth_access_token_jti_unique" UNIQUE("access_token_jti")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"profile_picture" varchar(255) DEFAULT '',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auth" ADD CONSTRAINT "auth_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_user_id_idx" ON "auth" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_refresh_token_jti_idx" ON "auth" USING btree ("refresh_token_jti");--> statement-breakpoint
CREATE INDEX "auth_access_token_jti_idx" ON "auth" USING btree ("access_token_jti");--> statement-breakpoint
CREATE INDEX "user_email_index" ON "users" USING btree ("email");