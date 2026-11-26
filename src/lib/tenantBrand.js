import { supabase } from '../supabaseClient';
import { normalizeHex } from './brandTheme';

const BUCKET = 'tenant-brand';

// the saved brand kit of one tenant, shaped for the pages. null when there is none.
export function shapeBrand(row, publicUrl) {
  if (!row) return null;
  const primary = normalizeHex(row.primary_color);
  const accent = normalizeHex(row.accent_color);
  const logoUrl = row.logo_path ? publicUrl(row.logo_path) : null;
  const bannerUrl = row.banner_path ? publicUrl(row.banner_path) : null;
  if (!primary && !accent && !logoUrl && !bannerUrl) return null;
  return { primary, accent, logoUrl, bannerUrl };
}

// The brand is a nicety: if it cannot be loaded the page simply shows the ScoreIt look.
export async function loadTenantBrand(tenantId) {
  try {
    const { data, error } = await supabase
      .from('tenant_brand')
      .select('logo_path, banner_path, primary_color, accent_color')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) return null;
    return shapeBrand(data, (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  } catch {
    return null;
  }
}
