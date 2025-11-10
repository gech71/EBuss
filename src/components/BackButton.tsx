
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type BackButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
    children?: React.ReactNode;
    showText?: boolean;
};

export function BackButton({ children, showText = true, variant = "outline", ...props }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button type="button" variant={variant} onClick={() => router.back()} {...props}>
      <ChevronLeft className={cn("h-4 w-4", showText && children && "mr-2")} />
      {showText && children}
    </Button>
  );
}
