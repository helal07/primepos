import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description || `Manage ${title.toLowerCase()}`} />
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">
            {title} module coming soon. This page will be built in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
