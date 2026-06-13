"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResearchPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/family");
  }, [router]);

  return (
    <main className="wrap" style={{ padding: "4rem 0" }}>
      Redirecting research to the family control room.
    </main>
  );
}

