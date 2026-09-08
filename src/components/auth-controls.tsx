import { Show, SignInButton, SignUpButton, useClerk, useUser } from "@clerk/tanstack-react-start";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function SignedInAccountMenu() {
  const clerk = useClerk();
  const { user } = useUser();

  const displayName = user?.fullName || user?.firstName || "Your account";
  const email = user?.primaryEmailAddress?.emailAddress;

  function handleSignOut() {
    void clerk
      .signOut({ redirectUrl: "/" })
      .catch(() => toast.error("Couldn't sign out. Please try again."));
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 px-2 sm:pr-2.5"
          aria-label="Open account menu"
        >
          <span className="grid size-6 place-items-center rounded-[6px] bg-primary text-primary-foreground">
            <UserRound className="size-3.5" strokeWidth={1.8} />
          </span>
          <span className="hidden max-w-24 truncate sm:inline">Account</span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-md border border-border bg-card p-1.5 text-foreground shadow-print outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <UserRound className="size-4.5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
            </div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-default select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-secondary"
            onSelect={() => clerk.openUserProfile()}
          >
            <Settings className="size-4 text-muted-foreground" />
            Manage account
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-default select-none items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-secondary"
            onSelect={handleSignOut}
          >
            <LogOut className="size-4 text-muted-foreground" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AuthControls() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" fallbackRedirectUrl="/">
          <Button variant="outline" size="sm">
            <LogIn />
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal" fallbackRedirectUrl="/">
          <Button size="sm">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <SignedInAccountMenu />
      </Show>
    </>
  );
}
