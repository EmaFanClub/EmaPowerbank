export type AppPage = "dashboard" | "admin" | "requestLogs" | "feedback" | "feedbackReview";
export type UserRole = "admin" | "user";

export interface NavigationItem {
  id: AppPage;
}

export function navigationItemsForRole(role: UserRole): NavigationItem[] {
  const items: NavigationItem[] = [
    { id: "dashboard" },
    ...(role === "admin" ? [{ id: "admin" } satisfies NavigationItem] : []),
    { id: "requestLogs" },
    { id: "feedback" },
  ];

  if (role === "admin") items.push({ id: "feedbackReview" });
  return items;
}

export function normalizeActivePage(role: UserRole, active: AppPage): AppPage {
  return navigationItemsForRole(role).some((item) => item.id === active) ? active : "dashboard";
}
