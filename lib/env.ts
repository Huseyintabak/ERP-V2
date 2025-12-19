import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  N8N_MCP_SERVER_URL: z.string().url().optional(),
  N8N_MCP_ACCESS_TOKEN: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  N8N_MCP_SERVER_URL: process.env.N8N_MCP_SERVER_URL,
  N8N_MCP_ACCESS_TOKEN: process.env.N8N_MCP_ACCESS_TOKEN,
});
