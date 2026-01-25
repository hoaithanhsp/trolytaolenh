import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Instruction {
  id: string;
  user_idea: string;
  category: string;
  title: string;
  generated_instruction: string;
  html_template: string;
  created_at: string;
}

export interface NewInstruction {
  user_idea: string;
  category: string;
  title: string;
  generated_instruction: string;
  html_template: string;
}
