import { NextResponse } from 'next/server';
import { createClient } from '@/infra/services/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // next param contains the destination redirect (e.g. /auth/update-password)
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        } else {
            console.error('Error exchanging code for session:', error.message);
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(`${origin}/auth?error=InvalidToken`);
}
