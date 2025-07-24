-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  longitude double precision NOT NULL,
  latitude double precision NOT NULL,
  speed double precision,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.locations_aggregated (
  user_id uuid NOT NULL,
  created_at timestamp without time zone NOT NULL,
  longitude double precision,
  latitude double precision,
  speed double precision,
  username character varying,
  age_range character varying,
  gender character varying,
  commute_mode character varying,
  CONSTRAINT locations_aggregated_pkey PRIMARY KEY (user_id, created_at)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  username text UNIQUE,
  email text UNIQUE,
  avatar_url text,
  age_range text,
  gender text,
  commute_mode text,
  crypto_chain text,
  wallet_address text,
  token_balance numeric DEFAULT 0.00,
  referral_code text,
  referred_by text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  type text,
  user_id uuid,
  location_id uuid,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT reports_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.visited_hexes (
  id integer NOT NULL DEFAULT nextval('visited_hexes_id_seq'::regclass),
  user_id uuid,
  h3_index character varying NOT NULL,
  first_visited bigint NOT NULL,
  last_visited bigint NOT NULL,
  visit_count integer DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT visited_hexes_pkey PRIMARY KEY (id),
  CONSTRAINT visited_hexes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);