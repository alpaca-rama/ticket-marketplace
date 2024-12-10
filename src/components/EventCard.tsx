'use client';

import { useUser } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

export default function EventCard({ eventId }: { eventId: Id<'events'> }) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <div className={''}>
      &lt;EventCard /&gt;
    </div>
  );
}