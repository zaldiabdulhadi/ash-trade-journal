"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionResult } from "./types";

export async function updateBrandSettings(
  formData: FormData
): Promise<ActionResult> {
  const brandName = String(formData.get("brandName") ?? "").trim().slice(0, 60);
  const brandTagline = String(formData.get("brandTagline") ?? "")
    .trim()
    .slice(0, 40);

  if (!brandName) return { ok: false, error: "Brand name is required." };

  try {
    await db.$transaction([
      db.appSetting.upsert({
        where: { key: "brandName" },
        update: { value: brandName },
        create: { key: "brandName", value: brandName },
      }),
      db.appSetting.upsert({
        where: { key: "brandTagline" },
        update: { value: brandTagline },
        create: { key: "brandTagline", value: brandTagline },
      }),
    ]);

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath("/recap");
    return { ok: true };
  } catch (err) {
    console.error("updateBrandSettings", err);
    return { ok: false, error: "Could not save branding." };
  }
}