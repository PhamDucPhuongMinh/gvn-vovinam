import { readState } from "@/lib/store";
import { createEmptyState } from "@/lib/empty-state";
import Landing from "@/components/Landing";
export const dynamic = "force-dynamic";
export default async function Home() {
  let state;
  try {
    state = await readState();
  } catch {
    state = createEmptyState();
  }
  const { monthlyFee, dueDay, billingStart, ...settings } = state.settings;
  return (
    <Landing
      settings={settings}
      classes={state.classes}
      coaches={state.coaches}
      media={state.media}
      posts={state.posts.filter((p) => p.published)}
    />
  );
}
