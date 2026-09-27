import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface AvatarWithFallbackProps
  extends React.ComponentPropsWithoutRef<typeof Avatar> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

const AvatarWithFallback = React.forwardRef<
  React.ComponentRef<typeof Avatar>,
  AvatarWithFallbackProps
>(({ className, src, alt, fallback, ...props }, ref) => (
  <Avatar ref={ref} className={className} {...props}>
    <AvatarImage src={src ?? undefined} alt={alt} />
    <AvatarFallback>
      {fallback ? getInitials(fallback) : "?"}
    </AvatarFallback>
  </Avatar>
));
AvatarWithFallback.displayName = "AvatarWithFallback";

export { Avatar, AvatarImage, AvatarFallback, AvatarWithFallback, getInitials };
