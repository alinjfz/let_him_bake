"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResearchPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/caretaker");
  }, [router]);

  return (
    <main className="wrap" style={{ padding: "4rem 0" }}>
      Redirecting to the caretaker home.
    </main>
  );
}

