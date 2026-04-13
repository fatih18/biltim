"use client";

import React from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useGenericApiActions } from "@/app/_hooks/UseGenericApiStore";
import { useGetUserRole } from "@/app/_hooks/user/useGetUserRole";
import {
  questions as SEED_QUESTIONS,
  steps as SEED_STEPS,
} from "../../denetim/constants";

/* ─── Types ─── */
type StepRow = {
  id: string;
  code: string;
  title: string;
  maxScore: number;
  order: number;
};

type QuestionRow = {
  id: string;
  stepId: string;
  externalId: string;
  stepCode: string;
  order: number;
  text: string;
  maxScore: string;
  requireExplanation: boolean;
  isActive: boolean;
};

/* ─── Helpers ─── */
function normRole(v: string) {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function extractArray(res: any): any[] {
  const candidates = [res?.data?.data, res?.data, res];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
    if (Array.isArray(c?.data)) return c.data;
  }
  return [];
}

function callAsPromise(start: (args: any) => void, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    start({
      payload,
      onAfterHandle: resolve,
      onErrorHandle: (err: any) => {
        if (err?.name === "AbortError") { resolve(null); return; }
        reject(err);
      },
    });
  });
}

/* ─── Component ─── */
export function QuestionsPanel() {
  const actions = useGenericApiActions();
  const { roleName, roles, isLoading: roleLoading } = useGetUserRole();

  const isAdmin = React.useMemo(() => {
    if (roleLoading) return false;
    const all = [roleName ?? "", ...(roles ?? []).map((r) => r.name ?? "")].map(normRole);
    return (
      all.includes(normRole("content manager core team")) ||
      all.includes(normRole("manager"))
    );
  }, [roleName, roles, roleLoading]);

  const [steps, setSteps] = React.useState<StepRow[]>([]);
  const [questions, setQuestions] = React.useState<QuestionRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [seeding, setSeeding] = React.useState(false);

  /* Edit */
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editMaxScore, setEditMaxScore] = React.useState("");
  const [editRequireExplanation, setEditRequireExplanation] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  /* Add question */
  const [addingStepId, setAddingStepId] = React.useState<string | null>(null);
  const [addText, setAddText] = React.useState("");
  const [addMaxScore, setAddMaxScore] = React.useState("2.5");
  const [addRequireExplanation, setAddRequireExplanation] = React.useState(true);
  const [addOrder, setAddOrder] = React.useState(1);
  const [adding, setAdding] = React.useState(false);

  /* Collapsed sections */
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  /* ─── Fetch all ─── */
  const fetchAll = React.useCallback(async () => {
    const A = actions as any;
    setLoading(true);
    try {
      const stepsStart = A?.GET_FIVE_S_STEPS?.start;
      const qStart = A?.GET_FIVE_S_QUESTIONS?.start;

      const [stepsRes, qRes] = await Promise.all([
        stepsStart
          ? callAsPromise(stepsStart, { page: 1, limit: 100, orderBy: "order", orderDirection: "asc" })
          : Promise.resolve(null),
        qStart
          ? callAsPromise(qStart, { page: 1, limit: 500, orderBy: "external_id", orderDirection: "asc" })
          : Promise.resolve(null),
      ]);

      const rawSteps = extractArray(stepsRes);
      setSteps(
        rawSteps.map((s: any) => ({
          id: String(s.id),
          code: String(s.code ?? ""),
          title: String(s.title ?? ""),
          maxScore: parseFloat(String(s.max_score ?? "0")),
          order: Number(s.order ?? 0),
        }))
      );

      const rawQ = extractArray(qRes);
      setQuestions(
        rawQ.map((q: any) => ({
          id: String(q.id ?? ""),
          stepId: String(q.step_id ?? ""),
          externalId: String(q.external_id ?? ""),
          stepCode: String(q.external_id ?? "").split("-")[0] ?? "",
          order: Number(q.order ?? 0),
          text: String(q.text ?? ""),
          maxScore: String(q.max_score ?? ""),
          requireExplanation: Boolean(q.require_explanation ?? true),
          isActive: Boolean(q.is_active ?? true),
        }))
      );
    } catch (err) {
      console.error("QuestionsPanel fetchAll error", err);
    } finally {
      setLoading(false);
    }
  }, [actions]);

  React.useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Seed ─── */
  const handleSeed = async () => {
    if (!window.confirm(`Hardcoded ${SEED_STEPS.length} adım ve ${SEED_QUESTIONS.length} soru veritabanına eklenecek. Devam edilsin mi?`)) return;
    const A = actions as any;
    const addStep = A?.ADD_FIVE_S_STEP?.start;
    const addQuestion = A?.ADD_FIVE_S_QUESTION?.start;
    if (!addStep || !addQuestion) return alert("API aksiyonları bulunamadı.");

    setSeeding(true);
    try {
      const stepIdMap: Record<string, string> = {};

      for (const s of SEED_STEPS) {
        const res = await callAsPromise(addStep, {
          code: s.code,
          title: s.title,
          max_score: String(s.maxScore),
          order: s.order,
        });
        const id = res?.data?.id ?? res?.id ?? res?.data?.[0]?.id;
        if (id) stepIdMap[s.code] = String(id);
      }

      for (const q of SEED_QUESTIONS) {
        const stepId = stepIdMap[q.stepCode];
        if (!stepId) continue;
        await callAsPromise(addQuestion, {
          step_id: stepId,
          external_id: q.id,
          order: q.order,
          text: q.text,
          max_score: String(q.maxScore),
          require_explanation: q.requireExplanation,
        });
      }

      await fetchAll();
    } catch (err) {
      console.error("Seed error", err);
      alert("Seed sırasında hata oluştu.");
    } finally {
      setSeeding(false);
    }
  };

  /* ─── Edit ─── */
  function openEdit(q: QuestionRow) {
    setEditingId(q.id);
    setEditText(q.text);
    setEditMaxScore(q.maxScore);
    setEditRequireExplanation(q.requireExplanation);
  }

  async function saveEdit(id: string) {
    const A = actions as any;
    const start = A?.UPDATE_FIVE_S_QUESTION?.start;
    if (!start) return;
    setSaving(true);
    try {
      await callAsPromise(start, {
        _id: id,
        text: editText.trim(),
        max_score: editMaxScore,
        require_explanation: editRequireExplanation,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, text: editText.trim(), maxScore: editMaxScore, requireExplanation: editRequireExplanation }
            : q
        )
      );
      setEditingId(null);
    } catch (err) {
      console.error("UPDATE_FIVE_S_QUESTION error", err);
      alert("Soru güncellenemedi.");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Delete ─── */
  async function handleDelete(q: QuestionRow) {
    if (!window.confirm(`"${q.externalId}" sorusu kalıcı olarak silinecek. Emin misiniz?`)) return;
    const A = actions as any;
    const start = A?.DELETE_FIVE_S_QUESTION?.start;
    if (!start) return;
    try {
      await callAsPromise(start, { _id: q.id });
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } catch (err) {
      console.error("DELETE_FIVE_S_QUESTION error", err);
      alert("Soru silinemedi.");
    }
  }

  /* ─── Add question ─── */
  function openAdd(step: StepRow) {
    const stepQs = questions.filter((q) => q.stepId === step.id);
    setAddingStepId(step.id);
    setAddText("");
    setAddMaxScore("2.5");
    setAddRequireExplanation(true);
    setAddOrder(stepQs.length + 1);
  }

  async function saveAdd(step: StepRow) {
    if (!addText.trim()) return alert("Soru metni zorunludur.");
    const A = actions as any;
    const start = A?.ADD_FIVE_S_QUESTION?.start;
    if (!start) return;
    const externalId = `${step.code}-Q${addOrder}`;
    setAdding(true);
    try {
      const res = await callAsPromise(start, {
        step_id: step.id,
        external_id: externalId,
        order: addOrder,
        text: addText.trim(),
        max_score: addMaxScore,
        require_explanation: addRequireExplanation,
      });
      const createdId = res?.data?.id ?? res?.id ?? res?.data?.[0]?.id ?? String(Date.now());
      setQuestions((prev) => [
        ...prev,
        {
          id: String(createdId),
          stepId: step.id,
          externalId,
          stepCode: step.code,
          order: addOrder,
          text: addText.trim(),
          maxScore: addMaxScore,
          requireExplanation: addRequireExplanation,
          isActive: true,
        },
      ]);
      setAddingStepId(null);
    } catch (err) {
      console.error("ADD_FIVE_S_QUESTION error", err);
      alert("Soru eklenemedi.");
    } finally {
      setAdding(false);
    }
  }

  /* ─── Grouped ─── */
  const grouped = React.useMemo(() => {
    const map = new Map<string, QuestionRow[]>();
    for (const q of questions) {
      const arr = map.get(q.stepId) ?? [];
      arr.push(q);
      map.set(q.stepId, arr);
    }
    return map;
  }, [questions]);

  const noSteps = !loading && steps.length === 0;

  /* ─── Render ─── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Soru Listesi</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {isAdmin
              ? "Adım ve sorular üzerinde tam yetkiniz var (yetkili admin)."
              : "Sorular yalnızca yetkili admin tarafından düzenlenebilir."}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && noSteps && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {seeding ? "Yükleniyor..." : "⬇ Varsayılan Soruları İçe Aktar"}
            </button>
          )}
          <button
            type="button"
            onClick={fetchAll}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-[11px] hover:bg-slate-950 disabled:opacity-50"
          >
            {loading ? "..." : "Yenile"}
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="text-xs text-slate-400">Yükleniyor...</div>
      ) : noSteps ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-8 text-center">
          <p className="text-xs text-slate-400">Kayıtlı adım veya soru bulunamadı.</p>
          {isAdmin && (
            <p className="mt-1 text-[11px] text-slate-500">
              Yukarıdaki "Varsayılan Soruları İçe Aktar" butonuyla veritabanını başlatın.
            </p>
          )}
        </div>
      ) : (
        steps
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((step) => {
            const stepQs = (grouped.get(step.id) ?? []).sort((a, b) => a.order - b.order);
            const isCollapsed = collapsed[step.id] ?? false;
            const isAdding = addingStepId === step.id;

            return (
              <section key={step.id} className="rounded-xl border border-slate-800 bg-slate-900/80">
                {/* Step header */}
                <div
                  className="flex cursor-pointer items-center justify-between border-b border-slate-800 px-4 py-2"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">{isCollapsed ? "▸" : "▾"}</span>
                    <h3 className="text-xs font-semibold text-slate-300">{step.title}</h3>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                      {stepQs.length}
                    </span>
                  </div>
                  {isAdmin && !isCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAdd(step);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-[10px] text-sky-300 hover:bg-sky-500/20"
                    >
                      <Plus className="h-3 w-3" />
                      Soru Ekle
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                  <div>
                    {/* Add form */}
                    {isAdding && isAdmin && (
                      <div className="border-b border-slate-800/60 bg-slate-950/40 px-4 py-3 space-y-2">
                        <p className="text-[11px] font-semibold text-emerald-300">Yeni Soru</p>
                        <textarea
                          rows={3}
                          value={addText}
                          onChange={(e) => setAddText(e.target.value)}
                          placeholder="Soru metni..."
                          className="w-full rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                        />
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <label className="text-slate-400">Maks. Puan:</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={addMaxScore}
                              onChange={(e) => setAddMaxScore(e.target.value)}
                              className="w-20 rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1 text-xs outline-none focus:border-sky-400"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-slate-400">Sıra:</label>
                            <input
                              type="number"
                              min="1"
                              value={addOrder}
                              onChange={(e) => setAddOrder(Number(e.target.value))}
                              className="w-16 rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1 text-xs outline-none focus:border-sky-400"
                            />
                          </div>
                          <label className="flex items-center gap-1.5 text-slate-400">
                            <input
                              type="checkbox"
                              checked={addRequireExplanation}
                              onChange={(e) => setAddRequireExplanation(e.target.checked)}
                              className="rounded border-slate-600"
                            />
                            Açıklama Zorunlu
                          </label>
                          <div className="ml-auto flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAddingStepId(null)}
                              disabled={adding}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />İptal
                            </button>
                            <button
                              type="button"
                              onClick={() => saveAdd(step)}
                              disabled={adding || !addText.trim()}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              {adding ? "Ekleniyor..." : "Ekle"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {stepQs.length === 0 && !isAdding && (
                      <div className="px-4 py-3 text-xs text-slate-500">Bu adımda soru yok.</div>
                    )}

                    {stepQs.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`px-4 py-3${idx > 0 || isAdding ? " border-t border-slate-800/60" : ""}`}
                      >
                        {editingId === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1.5 text-xs outline-none ring-sky-500/40 focus:border-sky-400 focus:ring-2"
                            />
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                <label className="text-slate-400">Maks. Puan:</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={editMaxScore}
                                  onChange={(e) => setEditMaxScore(e.target.value)}
                                  className="w-20 rounded-md border border-slate-600 bg-slate-950/70 px-2 py-1 text-xs outline-none focus:border-sky-400"
                                />
                              </div>
                              <label className="flex items-center gap-1.5 text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={editRequireExplanation}
                                  onChange={(e) => setEditRequireExplanation(e.target.checked)}
                                  className="rounded border-slate-600"
                                />
                                Açıklama Zorunlu
                              </label>
                              <div className="ml-auto flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  disabled={saving}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" />İptal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(q.id)}
                                  disabled={saving || !editText.trim()}
                                  className="inline-flex items-center gap-1 rounded-md bg-sky-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                                >
                                  <Check className="h-3 w-3" />
                                  {saving ? "Kaydediliyor..." : "Kaydet"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="text-[11px] text-slate-500">{q.externalId}</div>
                              <div className="mt-0.5 text-xs leading-relaxed text-slate-200">
                                {q.text}
                              </div>
                              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                                <span>
                                  Maks. Puan:{" "}
                                  <span className="text-sky-300">{q.maxScore}</span>
                                </span>
                                <span>
                                  {q.requireExplanation ? "Açıklama zorunlu" : "Açıklama opsiyonel"}
                                </span>
                                {!q.isActive && <span className="text-rose-400">Pasif</span>}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex flex-shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(q)}
                                  title="Düzenle"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(q)}
                                  title="Sil"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-900/40 hover:text-rose-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
      )}
    </div>
  );
}
