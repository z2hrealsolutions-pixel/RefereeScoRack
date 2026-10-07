import { supabase } from '../supabaseClient';
import { cleanQuery, searchable } from './cleanQuery';

// Finding a tournament. Only what anyone can already see: the name of a venue that is active,
// and whether it has a match being played right now.

export async function searchVenues(q) {
  if (!searchable(q)) return { venues: [] };
  const term = cleanQuery(q);
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('status', 'active')
    .ilike('name', `%${term}%`)
    .order('name')
    .limit(8);
  if (error) return { error: error.message };
  return { venues: data };
}

// venues with at least one match being played now, with how many
export async function liveVenues() {
  const live = await supabase.from('matchups').select('tenant_id').eq('status', 'live').limit(1000);
  if (live.error) return { error: live.error.message };
  const counts = new Map();
  live.data.forEach((r) => counts.set(r.tenant_id, (counts.get(r.tenant_id) || 0) + 1));
  if (counts.size === 0) return { venues: [] };
  const tenants = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('status', 'active')
    .in('id', [...counts.keys()])
    .order('name');
  if (tenants.error) return { error: tenants.error.message };
  return { venues: tenants.data.map((v) => ({ ...v, live: counts.get(v.id) })) };
}
