import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/tanstack-react-start";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <UserButton
          appearance={{
            elements: {
              avatarBox: "size-9",
              userButtonTrigger: "focus:shadow-[0_0_0_2px_var(--ring)]",
            },
          }}
        />
      </Show>
    </>
  );
}
