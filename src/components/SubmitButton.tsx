"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  children: React.ReactNode;
};

export function SubmitButton({ children, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Saving..." : children}
    </Button>
  );
}
