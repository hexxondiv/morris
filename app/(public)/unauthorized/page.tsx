export default function UnauthorizedPage() {
  return (
    <main className="max-w-[75rem] w-full mx-auto flex items-center justify-center py-12">
      <div className="container max-w-3xl mx-auto mb-12 text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Unauthorized Access
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          You do not have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>
        <a
          href="/"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Return to Home
        </a>
      </div>
    </main>
  );
}