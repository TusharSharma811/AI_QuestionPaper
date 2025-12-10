import LoginForm from "../components/LoginForm"

export const metadata = {
  title: "Sign In",
  description: "Sign in to your account",
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <LoginForm />
    </main>
  )
}