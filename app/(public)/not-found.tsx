import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 flex flex-col items-center justify-center min-h-screen space-y-6 text-center">
      <Badge variant="secondary" className="px-4 py-2 text-lg font-medium">
        404
      </Badge>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
        This page does not exist
      </h1>
      <Link href="/projects">
        <Button variant="secondary" className="rounded-lg px-6 py-3 text-sm font-medium">
          Back to Projects
        </Button>
      </Link>
    </main>
  );
}