import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Definicja ścieżek uwierzytelniania Clerk, które powinny być obsługiwane
const publicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api/auth/(.*)callback',
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
];

// Ignorowane ścieżki (zasoby statyczne)
const ignoredRoutes = [
  '/_next/static/(.*)',
  '/favicon.ico',
  '/images/(.*)',
  '/fonts/(.*)',
  '/api/images/(.*)',
  '/robots.txt',
  '/sitemap.xml'
];

// Użyj createRouteMatcher do poprawnej obsługi ścieżek
const isPublicRoute = createRouteMatcher([...publicRoutes, ...ignoredRoutes]);

export default clerkMiddleware({
  async afterAuth(auth, req, evt) {
    // Pobierz bieżącą ścieżkę z URL
    const path = req.nextUrl.pathname;
    
    // Obsługa specjalnych ścieżek Clerk
    if (path.includes('catchall_check') || path.includes('sso-callback')) {
      return NextResponse.next();
    }
    
    // Jeśli to publiczna ścieżka, pozwól na dostęp
    if (isPublicRoute(path)) {
      return NextResponse.next();
    }
    
    // Jeśli użytkownik nie jest zalogowany i próbuje uzyskać dostęp do chronionych zasobów
    if (!auth.userId && path.startsWith('/dashboard')) {
      // Przekieruj do strony logowania
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', path);
      return NextResponse.redirect(signInUrl);
    }
    
    // Kontynuuj standardowe przetwarzanie
    return NextResponse.next();
  }
});

// Konfiguracja dopasowania ścieżek
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};