import * as Dialog from "@radix-ui/react-dialog";
import { Eye, EyeOff, KeyRound, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearBrowserApiKey, saveBrowserApiKey } from "@/lib/key-store";

export function SettingsDialog({
  open,
  onOpenChange,
  hasKey,
  onKeyChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasKey: boolean;
  onKeyChanged: () => void;
}) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    setVisible(false);
    setError(null);
  }, [open]);

  async function save() {
    const trimmed = value.trim();
    if (trimmed.length < 8) {
      setError("Paste the full key from console.x.ai.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveBrowserApiKey(trimmed);
      toast.success("xAI key saved to this browser.");
      onKeyChanged();
      onOpenChange(false);
    } catch {
      setError("Could not save the key in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await clearBrowserApiKey();
      toast.success("xAI key removed from this browser.");
      onKeyChanged();
    } catch {
      setError("Could not remove the key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay-in fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px]" />
        <Dialog.Content className="dialog-content-in fixed top-1/2 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-6 shadow-print outline-none">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold tracking-tight">
                Settings
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Bring your own xAI key to unlock Studio AI.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close settings">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label
                htmlFor="xai-key"
                className="text-xs font-medium tracking-wide text-subtle uppercase"
              >
                xAI API key
              </label>
              {hasKey ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-ok">
                  <span className="size-1.5 rounded-full bg-ok" />
                  Stored encrypted
                </span>
              ) : null}
            </div>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="xai-key"
                type={visible ? "text" : "password"}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void save();
                }}
                placeholder={hasKey ? "Replace the stored key" : "xai-…"}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-md border border-border bg-card-ink py-2.5 pr-11 pl-9 text-sm outline-none ring-ring focus:ring-2"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide key" : "Show key"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-secondary"
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Encrypted with a device-local key before it touches storage; the ciphertext and that
              key live in this browser only. When you press Finish, the key is sent to this
              app&rsquo;s server just to call x.ai — it is never stored there. Clearing site data
              removes it.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Button
              className="flex-1"
              disabled={busy || value.trim().length === 0}
              onClick={() => void save()}
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {hasKey ? "Replace key" : "Save key"}
            </Button>
            {hasKey ? (
              <Button variant="outline" disabled={busy} onClick={() => void remove()}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
