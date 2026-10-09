-- アカウント（Better Auth が使う表）と、アカウントに残すお気に入り。
-- ログインは任意で、手段は Google だけ。ログインしていない人のお気に入りは、これまでどおりブラウザの localStorage だけに残る。
-- Better Auth の表の形は、comic-time（同じ作りで動いている）の 0004_better_auth.sql に合わせた

create table "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create table "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz not null
);

create table "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default current_timestamp not null,
  "updatedAt" timestamptz default current_timestamp not null
);

create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");

-- お気に入り。曲とボカロPは取り込みで入れ直されることがあるので、song・producer の表へは繋がない
-- （外れた曲は、読み出すときに流せる曲だけに絞って落とす）
create table favorite_song (
  user_id text not null references "user" ("id") on delete cascade,
  song_id integer not null,
  added_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table favorite_producer (
  user_id text not null references "user" ("id") on delete cascade,
  producer_id integer not null,
  added_at timestamptz not null default now(),
  primary key (user_id, producer_id)
);
