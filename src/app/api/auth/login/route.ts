import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body; // identifier can be email or username

    // Validate required fields
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/username and password are required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Determine if identifier is email or username
    const isEmail = identifier.includes('@');
    let email = identifier.toLowerCase();

    // If not an email, look up user by username using admin API
    if (!isEmail) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // List users and find by username
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Admin list users error:', listError);
        return NextResponse.json(
          { error: 'Login failed', code: 'server_error' },
          { status: 500 }
        );
      }

      // Find user with matching username (case-insensitive)
      const foundUser = users?.find(
        u => u.user_metadata?.username?.toLowerCase() === identifier.toLowerCase()
      );

      if (!foundUser || !foundUser.email) {
        return NextResponse.json(
          { error: 'Invalid username or password. Please try again.', code: 'invalid_credentials' },
          { status: 401 }
        );
      }

      email = foundUser.email;
    }

    // Sign in with Supabase Auth using email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      
      // Check for specific error types
      if (authError.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: 'Please check your email and confirm your account before logging in', code: 'email_not_confirmed' },
          { status: 401 }
        );
      }
      
      if (authError.code === 'invalid_credentials') {
        return NextResponse.json(
          { error: 'Invalid email/username or password. Please try again.', code: 'invalid_credentials' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message || 'Login failed' },
        { status: 401 }
      );
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 401 }
      );
    }

    // Create response with session info
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: authData.user.user_metadata?.username,
        name: authData.user.user_metadata?.name,
      },
      session: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at,
      }
    });

    // Set auth cookies for middleware
    response.cookies.set('sb-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    response.cookies.set('sb-refresh-token', authData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
