import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-accent-fg hover:opacity-90",
        variant === "ghost" && "border border-line bg-surface text-ink hover:bg-bg",
        variant === "soft" && "bg-accent-soft text-accent hover:opacity-80",
        variant === "danger" && "bg-danger text-accent-fg hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const control =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "h-24 py-2", props.className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "danger";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-bg text-muted",
        tone === "ok" && "bg-accent-soft text-accent",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "danger" && "bg-danger-soft text-danger",
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): "neutral" | "ok" | "warn" | "danger" {
  if (status === "active" || status === "approved") return "ok";
  if (status === "pending" || status === "probation") return "warn";
  if (status === "rejected" || status === "resigned") return "danger";
  return "neutral";
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[min(100%-1.5rem,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-surface p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <Dialog.Title className="font-display text-2xl text-ink">{title}</Dialog.Title>
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-md text-muted hover:bg-bg" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-10 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  if (src) {
    return <img src={src} alt="" className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span className={cn("grid place-items-center rounded-full bg-accent-soft font-medium text-accent", className)}>
      {initials}
    </span>
  );
}

export function errText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read that image."));
      el.src = url;
    });
    const max = 320;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare that image.");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}
