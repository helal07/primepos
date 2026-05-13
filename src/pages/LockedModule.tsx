import { Link, useParams } from "react-router-dom";
import { Lock, Sparkles, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MODULE_CATALOG, type ModuleKey } from "@/lib/modules";

export default function LockedModule() {
  const { module } = useParams<{ module: string }>();
  const def = MODULE_CATALOG.find((m) => m.key === (module as ModuleKey));
  const label = def?.label ?? "This module";
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-2">
        <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{label} is locked</h1>
            <p className="text-muted-foreground">
              You are not allowed to access this module. Upgrade your plan to unlock {label}.
            </p>
            {def?.description && (
              <p className="text-sm text-muted-foreground/80 pt-2">{def.description}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild size="lg" className="gap-2">
              <Link to="/subscription">
                <Sparkles className="h-4 w-4" />
                Upgrade plan
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <a href="mailto:support@primepos.app">
                <Mail className="h-4 w-4" />
                Contact support
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}