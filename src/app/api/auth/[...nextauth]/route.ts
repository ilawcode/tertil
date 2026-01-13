import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { authOptions }; // Re-export for backward compatibility if needed, but we should update consumers
