import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto mt-20">
      <form className="flex-1 flex flex-col w-full justify-center gap-2 text-foreground">
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />

        <button
          formAction={login}
          className="bg-blue-600 text-white rounded-md px-4 py-2 mb-2"
        >
          Sign In
        </button>
        <button
          formAction={signup}
          className="border border-slate-700 rounded-md px-4 py-2 mb-2"
        >
          Sign Up
        </button>

        {message && (
          <p className="mt-4 p-4 bg-red-100 text-red-600 text-center">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
