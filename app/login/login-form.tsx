'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react'
import { useUserAuth } from '@/lib/user-auth-context'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('next') || '/'
  const { login, isAuthenticated, isLoading: authLoading } = useUserAuth()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // If already signed in, bounce to where they came from.
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace(returnTo)
  }, [authLoading, isAuthenticated, returnTo, router])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = await login(email, name)
    setSubmitting(false)
    if (!result.success) {
      setError(result.error || 'Login failed')
      return
    }
    router.push(returnTo)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-[1440px] mx-auto w-full px-5 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-ink3 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/images/logo.png"
              alt="IPOGyani"
              width={160}
              height={40}
              className="h-10 w-auto mb-4"
              priority
            />
            <h1 className="text-2xl font-bold text-ink text-balance text-center">
              Sign in to write a review
            </h1>
            <p className="text-sm text-ink3 mt-2 text-center text-pretty">
              No password needed. Share your experience with thousands of IPO investors.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl card-shadow p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-ink2 mb-1.5">
                  Display name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-ink placeholder:text-ink4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-ink3 mt-1">Shown publicly next to your reviews.</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink2 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-ink placeholder:text-ink4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-ink3 mt-1">We never show your email publicly.</p>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="text-sm text-rose-mid bg-rose-bg border border-rose/20 rounded-lg px-3 py-2"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-mid text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    Continue
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-ink4 mt-4 text-pretty">
            By continuing you agree to our{' '}
            <Link href="/privacy" className="underline hover:text-ink3">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/disclaimer" className="underline hover:text-ink3">
              Disclaimer
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
