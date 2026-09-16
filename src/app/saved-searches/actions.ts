"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { ConditionGrade } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/categories";
import { isCounty } from "@/lib/kenya";
import { CONDITION_GRADES } from "@/lib/validation";
import { majorToMinorUnits } from "@/lib/money";

function toMinorUnits(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return value && Number.isFinite(amount) && amount > 0 ? majorToMinorUnits(amount) : null;
}

function toConditionGrade(value: FormDataEntryValue | null): ConditionGrade | null {
  const grade = String(value ?? "");
  return (CONDITION_GRADES as readonly string[]).includes(grade) ? (grade as ConditionGrade) : null;
}

/** Saves the browse filters the user is looking at right now. */
export async function saveSearchAction(formData: FormData) {
  const user = await requireUser("/browse");
  const category = String(formData.get("category") ?? "");
  const county = String(formData.get("county") ?? "");

  const search = {
    userId: user.id,
    query: String(formData.get("q") ?? "").trim().slice(0, 100),
    category: isCategory(category) ? category : null,
    conditionGrade: toConditionGrade(formData.get("condition")),
    county: isCounty(county) ? county : null,
    minPriceMinorUnits: toMinorUnits(formData.get("minPrice")),
    maxPriceMinorUnits: toMinorUnits(formData.get("maxPrice")),
  };

  const existing = await db.savedSearch.findFirst({ where: search });
  if (!existing) await db.savedSearch.create({ data: search });

  redirect("/saved-searches");
}

export async function deleteSavedSearchAction(formData: FormData) {
  const user = await requireUser("/saved-searches");
  const id = String(formData.get("id") ?? "");
  await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  refresh();
}
