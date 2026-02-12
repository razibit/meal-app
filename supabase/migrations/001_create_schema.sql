-- Create meal_period enum type
CREATE TYPE meal_period AS ENUM ('morning', 'night');

-- Create members table
CREATE TABLE members (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  rice_preference text DEFAULT 'boiled' CHECK (rice_preference IN ('boiled', 'atop')),
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on members email
CREATE INDEX idx_members_email ON members(email);

-- Create meals table
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  period meal_period NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, meal_date, period)
);

-- Create indexes on meals table
CREATE INDEX idx_meals_date_period ON meals(meal_date, period);
CREATE INDEX idx_meals_member_date ON meals(member_id, meal_date);

-- Create meal_details table
CREATE TABLE meal_details (
  id serial PRIMARY KEY,
  meal_date date UNIQUE NOT NULL,
  morning_details text,
  night_details text,
  updated_by uuid REFERENCES members(id),
  updated_at timestamptz DEFAULT now()
);

-- Create index on meal_details
CREATE INDEX idx_meal_details_date ON meal_details(meal_date);

-- Create chats table
CREATE TABLE chats (
  id bigserial PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  is_violation boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes on chats table
CREATE INDEX idx_chats_created_at ON chats(created_at DESC);
CREATE INDEX idx_chats_mentions ON chats USING GIN(mentions);

-- Create push_subscriptions table
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index on push_subscriptions
CREATE INDEX idx_push_subscriptions_member ON push_subscriptions(member_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_details_updated_at
  BEFORE UPDATE ON meal_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
