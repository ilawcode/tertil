import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const pathname = req.nextUrl.pathname;

        // Admin routes protection
        if (pathname.startsWith('/admin') && token?.role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const pathname = req.nextUrl.pathname;

                // Public routes
                const publicRoutes = ['/', '/programs', '/auth/login', '/auth/register'];
                const isPublicRoute =
                    publicRoutes.includes(pathname) ||
                    pathname.startsWith('/programs/') && !pathname.includes('/create');

                if (isPublicRoute) {
                    return true;
                }

                // Protected routes require authentication
                return !!token;
            },
        },
    }
);

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/profile/:path*',
        '/programs/create',
    ],
};
