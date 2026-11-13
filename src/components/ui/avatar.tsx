import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The platform's Avatar — an API compatible with shadcn/ui's (Avatar + AvatarImage + AvatarFallback),
 * without depending on @radix-ui/react-avatar. The AvatarImage disappears if the image is missing/fails; the
 * AvatarFallback shows up in that case.
 */
type Status = "idle" | "loaded" | "error";
const AvatarContext = React.createContext<{ status: Status; setStatus: (s: Status) => void }>({
  status: "idle",
  setStatus: () => {},
});

function Avatar({ className, children, ...props }: React.ComponentProps<"div">) {
  const [status, setStatus] = React.useState<Status>("idle");
  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <div
        className={cn(
          "relative flex size-9 shrink-0 overflow-hidden rounded-full bg-muted items-center justify-center text-sm font-medium",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  );
}

function AvatarImage({ className, src, onError, onLoad, ...props }: React.ComponentProps<"img">) {
  const { status, setStatus } = React.useContext(AvatarContext);
  React.useEffect(() => {
    if (!src) setStatus("error");
  }, [src, setStatus]);
  if (!src || status === "error") return null;
  return (
    <img
      className={cn("aspect-square h-full w-full object-cover", className)}
      src={src}
      onLoad={(e) => {
        setStatus("loaded");
        onLoad?.(e);
      }}
      onError={(e) => {
        setStatus("error");
        onError?.(e);
      }}
      {...props}
    />
  );
}

function AvatarFallback({ className, children, ...props }: React.ComponentProps<"span">) {
  const { status } = React.useContext(AvatarContext);
  if (status === "loaded") return null;
  return (
    <span
      className={cn("flex h-full w-full items-center justify-center rounded-full", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
