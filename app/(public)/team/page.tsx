import { Card, CardContent } from "@/components/ui/card";

export default function TeamPage() {
  return (
    <main className="max-w-[75rem] w-full mx-auto">
      <div className="container max-w-3xl mx-auto mb-12">
        <Card className="my-6 p-4">
          <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 bg-theme-50 text-theme-500 rounded-lg">
            <div className="space-y-2 text-left">
              <h2 className="text-xl font-medium text-mud-900">
                <span className="hidden md:inline">✨</span> Team details will
                be here soon!
              </h2>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
