
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type BackButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
    children?: React.ReactNode;
};

export function BackButton({ children, variant = "outline", ...props }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button type="button" variant={variant} onClick={() => router.back()} {...props}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children || "Back"}
    </Button>
  );
}
