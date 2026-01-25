/*
  # Create Instructions Table

  1. New Tables
    - `instructions`
      - `id` (uuid, primary key)
      - `user_idea` (text) - The user's app idea input
      - `category` (text) - App category (Education, Management, Tool, Game, Other)
      - `generated_instruction` (text) - The AI-generated system instruction
      - `html_template` (text) - The generated HTML template code
      - `created_at` (timestamptz) - Creation timestamp
      - `title` (text) - Generated title for the instruction
      
  2. Security
    - Enable RLS on `instructions` table
    - Add policy for anyone to read instructions (public app)
    - Add policy for anyone to insert instructions (public app)
*/

CREATE TABLE IF NOT EXISTS instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_idea text NOT NULL,
  category text DEFAULT 'Other',
  title text NOT NULL,
  generated_instruction text NOT NULL,
  html_template text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all instructions (public gallery)
CREATE POLICY "Anyone can view instructions"
  ON instructions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to insert new instructions
CREATE POLICY "Anyone can create instructions"
  ON instructions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_instructions_created_at ON instructions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructions_category ON instructions(category);