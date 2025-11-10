
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { ComponentProps } from "react";

type BackButtonProps = ComponentProps<typeof Button>;

export function BackButton({ children = "Back", variant = "outline", ...props }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button type="button" variant={variant} onClick={() => router.back()} {...props}>
      <ChevronLeft className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
