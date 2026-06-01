import type { UserRow } from "./types";

declare global {
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

export {};
