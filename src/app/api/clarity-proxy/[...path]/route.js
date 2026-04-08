import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function GET(req, { params }) {
  try {
    const { path } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('clarity_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Clarity token is missing.' }, { status: 401 });
    }

    const clarityPath = Array.isArray(path) ? path.join('/') : path;
    const searchParams = new URL(req.url).searchParams.toString();
    const clarityUrl = `https://www.clarity.ms/${clarityPath}${searchParams ? '?' + searchParams : ''}`;

    const res = await fetch(clarityUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Clarity Proxy] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
