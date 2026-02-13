import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return user data from Supabase Auth
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username || null,
        name: user.user_metadata?.name || null,
        image: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at,
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
}
