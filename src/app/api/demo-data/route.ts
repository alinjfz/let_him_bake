import { NextResponse } from "next/server";
import { listDemoPackages, loadDemoPackage } from "@/lib/demo-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const demo = loadDemoPackage(id);
    if (!demo) {
      return NextResponse.json({ error: "Demo not found." }, { status: 404 });
    }
    return NextResponse.json(demo);
  }

  return NextResponse.json({ demos: listDemoPackages() });
}
