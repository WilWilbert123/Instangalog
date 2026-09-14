export function ensureValidUuid(id?: string | null): string {
  if (!id) return '00000000-0000-0000-0000-000000000001';

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }

  if (id.includes('admin')) {
    return '2825c165-8cd1-4cd4-a42e-c2eedde378e0';
  }
  if (id.includes('pagpag') || id.includes('jollibee')) {
    return '07f84599-26cb-4fa1-b324-85e18eeb9567';
  }

  // Convert non-UUID string to a valid UUID format
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
}
