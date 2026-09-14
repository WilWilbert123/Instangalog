import { NextRequest, NextResponse } from 'next/server';
import { getMagicLinkStatus } from '@/lib/auth/magicLinkStore';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ verified: false, error: 'Email query parameter required' }, { status: 400 });
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check in-memory cross-device heartbeat store
  const state = getMagicLinkStatus(cleanEmail);
  if (state?.status === 'verified' && state.session) {
    return NextResponse.json({
      verified: true,
      userId: state.userId,
      session: state.session,
    });
  }

  // 2. Secondary check against auth.users in case callback ran on another instance
  try {
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    if (targetUser && targetUser.email_confirmed_at) {
      // Check if profile exists
      const { data: prof } = await (supabaseAdmin.from('profiles') as any)
        .select('id')
        .eq('id', targetUser.id)
        .maybeSingle();

      if (prof) {
        return NextResponse.json({
          verified: true,
          userId: targetUser.id,
        });
      }
    }
  } catch (err) {
    // Ignore secondary check failure
  }

  return NextResponse.json({ verified: false });
}
