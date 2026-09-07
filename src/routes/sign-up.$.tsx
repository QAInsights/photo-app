import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mark } from "@/components/mark";

export const Route = createFileRoute("/sign-up/$")({
  component: Page,
});

function Page() {
  return (
    <main className="paper-grain flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10 text-foreground">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Back to Northlight">
        <Mark className="size-8 text-primary" />
        <span className="font-display text-2xl font-semibold tracking-tight">Northlight</span>
      </Link>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" />
      <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        Your account stores identity and future credit history. Northlight never stores your source
        or finished photos.
      </p>
    </main>
  );
}
