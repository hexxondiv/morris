


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_pledges"("page_index" integer, "page_size" integer, "filter" "text") RETURNS TABLE("id" "uuid", "user_id" "text", "user_email" "text", "first_name" "text", "last_name" "text", "project_id" "uuid", "project_title" "text", "amount" numeric, "pledge_type" "text", "recurrence_interval" "text", "payment_day" "text", "status" "text", "created_at" timestamp with time zone, "total_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT 
      p.id,
      p.user_id,
      pr.email AS user_email,
      pr.first_name,
      pr.last_name,
      p.project_id,
      proj.title AS project_title,
      p.amount,
      p.pledge_type,
      p.recurrence_interval,
      p.payment_day,
      p.status,
      p.created_at,
      COUNT(*) OVER () AS total_count
    FROM pledges p
    LEFT JOIN profiles pr ON p.user_id = pr.id
    LEFT JOIN projects proj ON p.project_id = proj.id
    WHERE filter IS NULL OR (
      pr.email ILIKE '%' || filter || '%' OR
      proj.title ILIKE '%' || filter || '%' OR
      p.status ILIKE '%' || filter || '%'
    )
    ORDER BY p.created_at DESC
    LIMIT page_size OFFSET (page_index * page_size)
  )
  SELECT * FROM filtered;
END;
$$;


ALTER FUNCTION "public"."get_pledges"("page_index" integer, "page_size" integer, "filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supabase_user_id"("clerk_user_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  supabase_user_id uuid;
BEGIN
  SELECT id INTO supabase_user_id 
  FROM auth.users 
  WHERE raw_user_meta_data->>'clerk_user_id' = clerk_user_id;
  
  RETURN supabase_user_id;
END;
$$;


ALTER FUNCTION "public"."get_supabase_user_id"("clerk_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_dashboard_data"("p_user_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  dashboard_data JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'profile', JSONB_BUILD_OBJECT(
      'id', p.id,
      'first_name', COALESCE(p.first_name, ''),
      'last_name', COALESCE(p.last_name, ''),
      'email', COALESCE(p.email, ''),
      'role', COALESCE(p.role, 'user'),
      'avatar_url', p.avatar_url,
      'created_at', COALESCE(p.created_at, NOW())
    ),
    'total_contributions', COALESCE((
      SELECT SUM(t.amount)
      FROM transactions t
      WHERE t.user_id = p_user_id
        AND t.payment_status = 'completed'
    ), 0),
    'current_recurring_pledge', COALESCE((
      SELECT JSONB_BUILD_OBJECT(
        'pledge_id', pl.id,
        'project_title', pr.title,
        'amount', pl.amount,
        'status', pl.status,
        'recurrence_interval', pl.recurrence_interval
      )
      FROM pledges pl
      JOIN projects pr ON pl.project_id = pr.id
      WHERE pl.user_id = p_user_id
        AND pl.pledge_type = 'recurring'
        AND pl.status = 'active'
      ORDER BY pl.created_at DESC
      LIMIT 1
    ), NULL),
    'project_involvement', COALESCE((
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'project_id', pr.id,
          'project_title', pr.title,
          'total_contributed', COALESCE((
            SELECT SUM(t.amount)
            FROM transactions t
            WHERE (t.user_id = p_user_id OR t.metadata->>'userId' = p_user_id)
              AND t.metadata->>'projectId' IS NOT NULL
              AND (t.metadata->>'projectId')::UUID = pr.id
              AND t.payment_status = 'completed'
          ), 0)
        )
        ORDER BY (
          SELECT SUM(t.amount)
          FROM transactions t
          WHERE (t.user_id = p_user_id OR t.metadata->>'userId' = p_user_id)
            AND t.metadata->>'projectId' IS NOT NULL
            AND (t.metadata->>'projectId')::UUID = pr.id
            AND t.payment_status = 'completed'
        ) DESC NULLS LAST
      )
      FROM projects pr
      WHERE pr.id IN (
        SELECT DISTINCT (t.metadata->>'projectId')::UUID
        FROM transactions t
        WHERE (t.user_id = p_user_id OR t.metadata->>'userId' = p_user_id)
          AND t.metadata->>'projectId' IS NOT NULL
          AND t.metadata->>'projectId' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      )
      LIMIT 5
    ), '[]'::JSONB),
    'pledge_status_summary', JSONB_BUILD_OBJECT(
      'active', COALESCE((
        SELECT COUNT(*)
        FROM pledges pl
        WHERE pl.user_id = p_user_id
          AND pl.status = 'active'
      ), 0),
      'completed', COALESCE((
        SELECT COUNT(*)
        FROM pledges pl
        WHERE pl.user_id = p_user_id
          AND pl.status = 'completed'
      ), 0),
      'pending', COALESCE((
        SELECT COUNT(*)
        FROM pledges pl
        WHERE pl.user_id = p_user_id
          AND pl.status = 'pending'
      ), 0)
    ),
    'recent_transactions', COALESCE((
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', t.id,
          'amount', t.amount,
          'payment_method', t.payment_method,
          'paid_at', t.paid_at
        )
        ORDER BY t.paid_at DESC
      )
      FROM transactions t
      WHERE t.user_id = p_user_id
        AND t.payment_status = 'completed'
      LIMIT 5
    ), '[]'::JSONB)
  ) INTO dashboard_data
  FROM profiles p
  WHERE p.id = p_user_id;

  IF dashboard_data IS NULL THEN
    RAISE EXCEPTION 'User with id % not found', p_user_id;
  END IF;

  RETURN dashboard_data;
END;
$_$;


ALTER FUNCTION "public"."get_user_dashboard_data"("p_user_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_project_current_amount"("row_id" "uuid", "increment_by" numeric) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_amount NUMERIC;
BEGIN
  UPDATE projects
  SET current_amount = COALESCE(current_amount, 0) + increment_by,
      updated_at = NOW()
  WHERE id = row_id
  RETURNING current_amount INTO new_amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project with id % not found', row_id;
  END IF;
  
  RETURN new_amount;
END;
$$;


ALTER FUNCTION "public"."increment_project_current_amount"("row_id" "uuid", "increment_by" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."pledges" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "text" NOT NULL,
    "project_id" "uuid",
    "amount" numeric NOT NULL,
    "pledge_type" "text" NOT NULL,
    "recurrence_interval" "text",
    "payment_day" "text",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pledges_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "pledges_payment_day_check" CHECK (("payment_day" = ANY (ARRAY['today'::"text", '1st'::"text", '28th'::"text"]))),
    CONSTRAINT "pledges_pledge_type_check" CHECK (("pledge_type" = ANY (ARRAY['one_time'::"text", 'recurring'::"text"]))),
    CONSTRAINT "pledges_recurrence_interval_check" CHECK (("recurrence_interval" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "pledges_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."pledges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "role" "text",
    "updated_at" timestamp with time zone DEFAULT "now()",
    CONSTRAINT "profiles_email_key" UNIQUE ("email"),
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'moderator'::"text", 'editor'::"text"]))),
    CONSTRAINT "email_format_check" CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Stores user information linked to Clerk authentication';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "creator_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "goal_amount" numeric(12,2) NOT NULL,
    "current_amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "status" "text" NOT NULL,
    "cover_image" "text",
    "state" "text",
    "country" "text",
    "sector" "text",
    "slug" "text" NOT NULL,
    "body_html" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "projects_current_amount_check" CHECK (("current_amount" >= (0)::numeric)),
    CONSTRAINT "projects_goal_amount_check" CHECK (("goal_amount" > (0)::numeric)),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'voting'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text", 'proposed'::"text", 'archived'::"text"]))),
    CONSTRAINT "valid_amounts" CHECK (("current_amount" <= "goal_amount"))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Crowdfunding projects';



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pledge_id" "uuid",
    "user_id" "text" NOT NULL,
    "payment_type" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'NGN'::"text" NOT NULL,
    "payment_method" "text",
    "payment_status" "text" NOT NULL,
    "payment_ref" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paid_at" timestamp with time zone,
    CONSTRAINT "transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "transactions_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "transactions_payment_type_check" CHECK (("payment_type" = ANY (ARRAY['pledge'::"text", 'donation'::"text", 'subscription'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "vote" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voting_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "voting_periods_check" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."voting_periods" OWNER TO "postgres";


ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "pledges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_payment_ref_key" UNIQUE ("payment_ref");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_user_id_project_id_key" UNIQUE ("user_id", "project_id");



ALTER TABLE ONLY "public"."voting_periods"
    ADD CONSTRAINT "voting_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_periods"
    ADD CONSTRAINT "voting_periods_project_id_key" UNIQUE ("project_id");



CREATE INDEX "idx_pledges_user_id" ON "public"."pledges" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_projects_creator_id" ON "public"."projects" USING "btree" ("creator_id");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_transactions_payment_ref" ON "public"."transactions" USING "btree" ("payment_ref");



CREATE INDEX "idx_transactions_payment_type" ON "public"."transactions" USING "btree" ("payment_type");



CREATE INDEX "idx_transactions_pledge_id" ON "public"."transactions" USING "btree" ("pledge_id");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "fk_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "fk_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_periods"
    ADD CONSTRAINT "fk_project" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pledges"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pledge_id_fkey" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledges"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



CREATE POLICY "Users can create their own profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ("auth"."jwt"() ->> 'sub'::"text")));



CREATE POLICY "Users can delete their own profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "id"));



CREATE POLICY "Users can update their own profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid"))::"text" = "id")) WITH CHECK (((( SELECT "auth"."uid"() AS "uid"))::"text" = "id"));



CREATE POLICY "Users can view their own profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = ("auth"."jwt"() ->> 'sub'::"text")));



CREATE POLICY "insert_vote" ON "public"."votes" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "manage_voting_periods_admin" ON "public"."voting_periods" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"text")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_votes" ON "public"."votes" FOR SELECT TO "authenticated" USING ((("auth"."uid"())::"text" = "user_id"));



CREATE POLICY "select_votes_admin" ON "public"."votes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = ("auth"."uid"())::"text") AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "select_voting_periods" ON "public"."voting_periods" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "update_vote" ON "public"."votes" FOR UPDATE TO "authenticated" USING ((("auth"."uid"())::"text" = "user_id")) WITH CHECK ((("auth"."uid"())::"text" = "user_id"));



ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pledges"("page_index" integer, "page_size" integer, "filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pledges"("page_index" integer, "page_size" integer, "filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pledges"("page_index" integer, "page_size" integer, "filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_supabase_user_id"("clerk_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_supabase_user_id"("clerk_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_supabase_user_id"("clerk_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_dashboard_data"("p_user_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_data"("p_user_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_data"("p_user_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_project_current_amount"("row_id" "uuid", "increment_by" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_project_current_amount"("row_id" "uuid", "increment_by" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_project_current_amount"("row_id" "uuid", "increment_by" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."pledges" TO "anon";
GRANT ALL ON TABLE "public"."pledges" TO "authenticated";
GRANT ALL ON TABLE "public"."pledges" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



GRANT ALL ON TABLE "public"."voting_periods" TO "anon";
GRANT ALL ON TABLE "public"."voting_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."voting_periods" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
