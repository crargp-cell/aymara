import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { recomputeAnalytics } from "@/lib/analytics/aggregate";
import { trainRiskModel } from "@/lib/ml/model";
import { trainScoreModel } from "@/lib/ml/linear";

export async function POST() {
  const user = await getSessionUser();
  if (!user || !["maestro", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  const analytics = await recomputeAnalytics();
  const [model, linear] = await Promise.all([trainRiskModel(), trainScoreModel()]);
  return NextResponse.json({ ok: true, analytics, model, linear });
}
