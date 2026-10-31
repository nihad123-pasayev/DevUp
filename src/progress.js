import { supabase } from "./supabaseclient.js";

const ord = (x) => x.position ?? x.order_index ?? x.sort_order ?? x.id;

export async function getUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// Dashboard-da seçilmiş field adları: profiles.fields (məs. ["Web", "Backend"])
export async function getMyFieldNames() {
  const uid = await getUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("fields")
    .eq("id", uid)
    .maybeSingle();
  if (error) {
    console.error("profiles error:", error.code, error.message);
    return [];
  }
  return data?.fields ?? [];
}

// Seçilmiş field-lərin roadmap-ları, mərhələləri və dərsləri ilə (Mobile üçün iki dənə)
export async function getMyRoadmaps() {
  const names = await getMyFieldNames();
  if (!names.length) return [];

  const { data, error } = await supabase
    .from("roadmaps")
    .select("*, stages(*, lessons(*))")
    .in("field", names);
  if (error) {
    console.error("roadmaps error:", error.code, error.message);
    return [];
  }

  return (data || [])
    .sort((a, b) => names.indexOf(a.field) - names.indexOf(b.field))
    .map((r) => ({
      ...r,
      stages: (r.stages || [])
        .sort((a, b) => ord(a) - ord(b))
        .map((s) => ({
          ...s,
          lessons: (s.lessons || []).sort((a, b) => ord(a) - ord(b)),
        })),
    }));
}

// { [lessonId]: "completed" } — dərs + keçilmiş quiz + layihə (my_completed_items view-su)
export async function getProgress() {
  const { data, error } = await supabase
    .from("my_completed_items")
    .select("lesson_id");
  if (error) {
    console.error("progress error:", error.code, error.message);
    return {};
  }
  const map = {};
  (data || []).forEach((p) => (map[p.lesson_id] = "completed"));
  return map;
}

// Dərsi tamamla (dərs səhifəsində "Mark as complete")
export async function markLessonComplete(lessonId) {
  const uid = await getUserId();
  if (!uid) return false;
  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: uid,
      lesson_id: lessonId,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );
  if (error) console.error("markLessonComplete error:", error.code, error.message);
  return !error;
}

// Tamamlamanı geri al
export async function unmarkLesson(lessonId) {
  const uid = await getUserId();
  if (!uid) return false;
  const { error } = await supabase
    .from("user_progress")
    .delete()
    .eq("user_id", uid)
    .eq("lesson_id", lessonId);
  if (error) console.error("unmarkLesson error:", error.code, error.message);
  return !error;
}

export function lessonsOf(roadmap) {
  return roadmap.stages.flatMap((s) => s.lessons);
}

export function roadmapStats(roadmap, progress) {
  const all = lessonsOf(roadmap);
  const done = all.filter((l) => progress[l.id] === "completed").length;
  const total = all.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

// field -> { done, total, percent } (Mobile-də irəli olan yol götürülür)
export function fieldStats(roadmaps, progress) {
  const out = {};
  roadmaps.forEach((r) => {
    const s = roadmapStats(r, progress);
    if (!out[r.field] || s.done > out[r.field].done) out[r.field] = s;
  });
  return out;
}

// Roadmap-dakı ilk tamamlanmamış dərs
export function nextLesson(roadmap, progress) {
  return lessonsOf(roadmap).find((l) => progress[l.id] !== "completed") || null;
}

// Ardıcıl gün sayı (user_progress.completed_at-a görə)
export async function getStreak() {
  const uid = await getUserId();
  if (!uid) return 0;
  const { data } = await supabase
    .from("user_progress")
    .select("completed_at")
    .eq("user_id", uid)
    .not("completed_at", "is", null);

  const days = new Set(
    (data || []).map((r) => new Date(r.completed_at).toDateString()),
  );
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}