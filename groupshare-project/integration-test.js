/**
 * Integration Test Script for Clerk-Supabase integration
 * 
 * Instrukcja użycia:
 * 1. Zapisz ten plik jako scripts/integration-test.js
 * 2. Uruchom skrypt komendą: node scripts/integration-test.js
 * 
 * Uwaga: Niektóre testy wymagają ręcznej interakcji z przeglądarką.
 */

const { chromium } = require('playwright');
const assert = require('assert');
require('dotenv').config();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'StrongTestPassword123!';

(async () => {
  console.log('🚀 Rozpoczynanie testów integracji Clerk-Supabase...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. Test rejestracji użytkownika
    console.log('📝 Test rejestracji użytkownika...');
    await page.goto(`${BASE_URL}/sign-up`);
    
    // Sprawdź czy strona rejestracji się załadowała
    await page.waitForSelector('text=Utwórz konto', { timeout: 10000 });
    console.log('✓ Strona rejestracji załadowana');
    
    // Wypełnij formularz rejestracji
    await page.fill('input[name="emailAddress"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    
    // Kliknij przycisk rejestracji
    await page.click('button:has-text("Zarejestruj się")');
    
    // Poczekaj na komunikat o weryfikacji lub przekierowanie do dashboardu
    try {
      await page.waitForSelector('text=Sprawdź swoją skrzynkę', { timeout: 10000 });
      console.log('✓ Test rejestracji zakończony pomyślnie - wymagana weryfikacja email');
      
      console.log('⚠️ Aby kontynuować testy, potrzebna jest ręczna weryfikacja. Zweryfikuj email i zaloguj się ręcznie.');
      console.log('Następnie uruchom ponownie z flagą --skip-registration');
      
      // Zatrzymaj testy tutaj, jeśli wymagana jest weryfikacja email
      if (!process.argv.includes('--skip-registration')) {
        await browser.close();
        return;
      }
    } catch (e) {
      // Jeśli nie pojawił się komunikat o weryfikacji, mogliśmy zostać przekierowani do dashboardu
      try {
        await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
        console.log('✓ Test rejestracji zakończony pomyślnie - zalogowany automatycznie');
      } catch (err) {
        console.error('❌ Błąd podczas rejestracji:', err);
        throw err;
      }
    }
    
    // 2. Test logowania (jeśli przeskakujemy rejestrację)
    if (process.argv.includes('--skip-registration')) {
      console.log('🔑 Test logowania...');
      await page.goto(`${BASE_URL}/sign-in`);
      
      // Sprawdź czy strona logowania się załadowała
      await page.waitForSelector('text=Zaloguj się', { timeout: 10000 });
      console.log('✓ Strona logowania załadowana');
      
      // Wypełnij formularz logowania
      await page.fill('input[name="emailAddress"]', TEST_EMAIL);
      await page.fill('input[name="password"]', TEST_PASSWORD);
      
      // Kliknij przycisk logowania
      await page.click('button:has-text("Zaloguj")');
      
      // Poczekaj na przekierowanie do dashboardu
      await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
      console.log('✓ Test logowania zakończony pomyślnie');
    }
    
    // 3. Test dostępu do chronionych ścieżek
    console.log('🛡️ Test dostępu do chronionych ścieżek...');
    
    // Sprawdź dostęp do dashboardu
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    console.log('✓ Dostęp do dashboardu działa poprawnie');
    
    // Sprawdź dostęp do strony grup
    await page.goto(`${BASE_URL}/groups`);
    await page.waitForSelector('text=Grupy', { timeout: 10000 });
    console.log('✓ Dostęp do strony grup działa poprawnie');
    
    // 4. Test operacji bazodanowych z uwierzytelnieniem
    console.log('💾 Test operacji bazodanowych z uwierzytelnieniem...');
    
    // Sprawdź, czy możesz utworzyć nową grupę
    await page.goto(`${BASE_URL}/groups/create`);
    await page.waitForSelector('input[name="name"]', { timeout: 10000 });
    
    // Wypełnij formularz tworzenia grupy
    const testGroupName = `Test Group ${Date.now()}`;
    await page.fill('input[name="name"]', testGroupName);
    await page.fill('textarea[name="description"]', 'Test description created by integration test');
    
    // Wyślij formularz
    await page.click('button:has-text("Utwórz grupę")');
    
    // Sprawdź czy grupa została utworzona (przekierowanie do strony grupy)
    await page.waitForURL(/\/groups\/.*/, { timeout: 20000 });
    
    // Sprawdź, czy nazwa grupy jest widoczna na stronie
    const groupNameVisible = await page.isVisible(`text="${testGroupName}"`);
    assert(groupNameVisible, 'Nazwa grupy powinna być widoczna na stronie');
    console.log('✓ Tworzenie grupy działa poprawnie');
    
    // 5. Test wylogowania
    console.log('🚪 Test wylogowania...');
    
    // Kliknij przycisk profilu użytkownika
    await page.click('button.cl-userButtonTrigger');
    
    // Kliknij opcję wylogowania
    await page.click('button:has-text("Wyloguj się")');
    
    // Poczekaj na przekierowanie na stronę główną
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
    console.log('✓ Test wylogowania zakończony pomyślnie');
    
    console.log('🎉 Wszystkie testy zakończone pomyślnie!');
  } catch (error) {
    console.error('❌ Błąd podczas testów:', error);
  } finally {
    await browser.close();
  }
})();