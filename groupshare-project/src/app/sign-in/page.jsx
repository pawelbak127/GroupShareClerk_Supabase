// src/app/sign-in/page.jsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">Zaloguj się</h1>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-sm'
            }
          }}
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}