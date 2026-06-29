"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@aegis/api";

export const trpc = createTRPCReact<AppRouter>();
