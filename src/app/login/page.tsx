import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Seller sign in</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Manage your rental products and bookings.
        </p>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
