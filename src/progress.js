import { supabase } from "./supabaseclient.js";

export const MY_ROADMAPS_TABLE = "user_roadmaps";

const ord = (x) => x.position ?? x.order_index ?? x.sort_order ?? x.id;

export async function getUserId() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
}

// İstifadəçinin seçdiyi roadmap-lar, mərhələləri və dərsləri ilə
// İstifadəçinin seçdiyi roadmap-lar (dashboard ilə eyni mənbə: my_roadmap_progress)
export async function getMyRoadmaps() {
    const { data: mine, error: e1 } = await supabase
        .from("my_roadmap_progress")
        .select("roadmap_id");
    if (e1) {
        console.error("my_roadmap_progress error:", e1.code, e1.message);
        return [];
    }
    const ids = (mine || []).map((r) => r.roadmap_id);
    if (!ids.length) return [];

    const { data, error } = await supabase
        .from("roadmaps")
        .select("*, stages(*, lessons(*))")
        .in("id", ids);
    if (error) {
        console.error("roadmaps error:", error.code, error.message);
        return [];
    }

    return (data || []).map((r) => ({
        ...r,
        stages: (r.stages || [])
            .sort((a, b) => ord(a) - ord(b))
            .map((s) => ({
                ...s,
                lessons: (s.lessons || []).sort((a, b) => ord(a) - ord(b)),
            })),
    }));
}

// { [lessonId]: "completed" } — dərs + keçilmiş quiz + layihə (my_completed_items)
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

// Dərs açılanda / tamamlananda çağırılır (dərs səhifəsində istifadə olunacaq)
export async function setLessonStatus(lessonId, status) {
    const uid = await getUserId();
    if (!uid) return;
    const row = { user_id: uid, lesson_id: lessonId, status };
    if (status === "completed") row.completed_at = new Date().toISOString();
    const { error } = await supabase
        .from("user_progress")
        .upsert(row, { onConflict: "user_id,lesson_id" });
    if (error) console.error("setLessonStatus error:", error);
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
