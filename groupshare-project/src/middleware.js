import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Definicja ścieżek uwierzytelniania Clerk, które powinny być obsługiwane
const clerkPublicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api/auth/(.*)callback',
];

// Użyj createRouteMatcher do poprawnej obsługi ścieżek Clerk
const isPublicRoute = createRouteMatcher(clerkPublicRoutes);

export default clerkMiddleware({
  afterAuth(auth, req, evt) {
    // Pobierz bieżącą ścieżkę z URL
    const path = req.nextUrl.pathname;
    
    // Obsługa ścieżek Clerk
    if (path.includes('catchall_check') || 
        path.includes('sso-callback') || 
        isPublicRoute(path)) {
      return NextResponse.next();
    }
    
    // Jeśli użytkownik nie jest zalogowany i próbuje uzyskać dostęp do chronionych zasobów
    if (!auth.userId && path.startsWith('/dashboard')) {
      // Przekieruj do strony logowania z powrotem do aktualnej ścieżki
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', path);
      return NextResponse.redirect(signInUrl);
    }
    
    // Jeśli ścieżka to API, pozwól na obsługę przez funkcje API
    if (path.startsWith('/api/')) {
      return NextResponse.next();
    }
    
    // Kontynuuj standardowe przetwarzanie
    return NextResponse.next();
  },
  
  // Pozostała część middleware pozostaje bez zmian
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/auth/profile(.*)',
    '/api/webhook/clerk',
    '/api/webhook/stripe',
    '/api/webhook/payu',
    '/api/platforms',
    '/api/offers',
    '/api/offers/(.*)',
    '/how-it-works',
    '/about',
    '/contact',
    '/legal/(.*)',
    '/privacy-policy',
    '/terms',
    '/faq',
    '/blog',
    '/blog/(.*)'
  ],
  
  protectedRoutes: [
    '/dashboard(.*)',
    '/applications(.*)',
    '/groups(.*)',
    '/profile(.*)',
    '/settings(.*)',
    '/admin(.*)',
    '/create(.*)',
    '/access(.*)'
  ],
  
  ignoredRoutes: [
    '/_next/static/(.*)',
    '/favicon.ico',
    '/images/(.*)',
    '/fonts/(.*)',
    '/api/images/(.*)',
    '/robots.txt',
    '/sitemap.xml'
  ]
});

// Konfiguracja dopasowania ścieżek
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};