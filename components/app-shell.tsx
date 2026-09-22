"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  ChevronRight,
  Download,
  Home,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { buildInsights, chartValues, coachAnswer } from "@/lib/insights";
import {
  AwakeDuration,
  clearEntries,
  formatMinutes,
  getEntries,
  metrics,
  nightsWithin,
  PhoneUse,
  ProductUse,
  removeEntry,
  saveEntry,
  SleepCompany,
  SleepEntry,
  SportIntensity,
  summary,
  Ternary,
  toCsv,
} from "@/lib/sleep";

type View = "today" | "journal" | "analysis" | "coach" | "profile";
type Period = 7 | 30 | 90 | 0;
const today = () => new Date().toISOString().slice(0, 10),
  uid = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const fresh = (): SleepEntry => ({
  id: uid(),
  date: today(),
  bedTime: "00:30",
  sleepTime: "01:00",
  wakeTime: "08:30",
  outOfBedTime: "08:40",
  rememberedAwakenings: 4,
  awakeDuration: "30-60",
  quality: 6,
  morningEnergy: 6,
  concentration: 6,
  phoneUse: "30-60",
  company: "alone",
  sport: false,
  dream: "unknown",
  sleepThoughts: false,
  product: "none",
  createdAt: new Date().toISOString(),
});
const phoneLabels: Record<PhoneUse, string> = {
  none: "Aucun",
  lt15: "<15 min",
  "15-30": "15–30 min",
  "30-60": "30–60 min",
  gt60: ">60 min",
};
const awakeLabels: Record<AwakeDuration, string> = {
  lt10: "<10 min",
  "10-20": "10–20 min",
  "20-30": "20–30 min",
  "30-60": "30–60 min",
  gt60: ">60 min",
  unknown: "Je ne sais pas",
};
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function MiniChart({ values, max = 10 }: { values: number[]; max?: number }) {
  if (!values.length)
    return (
      <div className="chart-empty">
        Ajoute quelques nuits pour voir l’évolution.
      </div>
    );
  return (
    <div className="mini-chart" role="img" aria-label="Évolution récente">
      {values.map((v, i) => (
        <span
          key={i}
          className="chart-bar"
          style={{
            height: `${Math.max(8, Math.min(100, (v / max) * 100))}%`,
            opacity: 0.45 + (i / values.length) * 0.55,
          }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}
function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className={`metric-card ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="empty-state">
      <div className="moon-orbit">
        <Moon size={34} />
      </div>
      <h2>Commence avec ta dernière nuit</h2>
      <p>30 secondes suffisent. Tes données restent sur cet appareil.</p>
      <button className="primary-button" onClick={onAdd}>
        <Plus size={18} />
        Ajouter une nuit
      </button>
    </section>
  );
}

function Dashboard({
  entries,
  onAdd,
}: {
  entries: SleepEntry[];
  onAdd: () => void;
}) {
  if (!entries.length) return <EmptyState onAdd={onAdd} />;
  const latest = entries[0],
    m = metrics(latest),
    avg = summary(entries.slice(1, 15)),
    delta = (v: number, b: number, u = "") =>
      !b
        ? "Première mesure"
        : `${v - b > 0 ? "+" : ""}${Math.round(v - b)}${u} vs moyenne`;
  return (
    <>
      <section className="hero-card">
        <div>
          <p className="eyebrow">Cette nuit</p>
          <h2>{formatMinutes(m.duration)}</h2>
          <p className="muted">
            Sommeil estimé · score personnel <b>{m.score}</b>
          </p>
        </div>
        <div
          className="score-ring"
          style={{ "--score": `${m.score * 3.6}deg` } as React.CSSProperties}
        >
          <span>{m.score}</span>
          <small>/100</small>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Comment était ta nuit ?</p>
            <h2>Ton aperçu</h2>
          </div>
          <button
            className="icon-button"
            onClick={onAdd}
            aria-label="Ajouter une nuit"
          >
            <Plus />
          </button>
        </div>
        <div className="metric-grid">
          <MetricCard
            label="Endormissement"
            value={formatMinutes(m.latency)}
            note={delta(m.latency, avg.latency, " min")}
          />
          <MetricCard
            label="Réveils mémorisés"
            value={`${latest.rememberedAwakenings}`}
            note={delta(latest.rememberedAwakenings, avg.awakenings)}
          />
          <MetricCard
            label="Temps éveillé estimé"
            value={awakeLabels[latest.awakeDuration]}
          />
          <MetricCard
            label="Qualité ressentie"
            value={`${latest.quality}/10`}
            note={
              avg.quality
                ? delta(latest.quality, avg.quality)
                : "Première mesure"
            }
          />
          <MetricCard
            label="Forme au réveil"
            value={`${latest.morningEnergy}/10`}
          />
          <MetricCard
            label="Concentration"
            value={`${latest.concentration}/10`}
          />
        </div>
      </section>
      <section className="suggestion-card">
        <div className="suggestion-icon">
          <Sparkles size={19} />
        </div>
        <div>
          <p className="eyebrow">Suggestion pour ce soir</p>
          <h3>Ne vérifie pas l’heure si tu te réveilles.</h3>
          <p>
            Observe simplement le réveil sans calculer le temps qu’il reste.
          </p>
        </div>
      </section>
      <p className="medical-note">
        YSleep décrit tes propres observations. Il ne pose aucun diagnostic et
        ne remplace pas un professionnel de santé.
      </p>
    </>
  );
}

function Journal({
  entries,
  onAdd,
  onDelete,
}: {
  entries: SleepEntry[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Historique local</p>
          <h2>Journal</h2>
        </div>
        <button className="primary-button compact" onClick={onAdd}>
          <Plus size={17} />
          Ajouter
        </button>
      </div>
      {!entries.length ? (
        <EmptyState onAdd={onAdd} />
      ) : (
        <div className="night-list">
          {entries.map((e) => {
            const m = metrics(e),
              d = new Date(`${e.date}T12:00:00`);
            return (
              <article className="night-row" key={e.id}>
                <div className="date-badge">
                  <strong>
                    {d.toLocaleDateString("fr-FR", { day: "2-digit" })}
                  </strong>
                  <span>
                    {d.toLocaleDateString("fr-FR", { month: "short" })}
                  </span>
                </div>
                <div className="night-main">
                  <h3>
                    {formatMinutes(m.duration)} <span>· score {m.score}</span>
                  </h3>
                  <p>
                    {e.rememberedAwakenings} réveil(s) mémorisé(s) · qualité{" "}
                    {e.quality}/10 ·{" "}
                    {e.company === "together" ? "avec quelqu’un" : "seul"}
                  </p>
                </div>
                <button
                  className="ghost-button danger"
                  aria-label="Supprimer cette nuit"
                  onClick={() => onDelete(e.id)}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Analysis({ entries }: { entries: SleepEntry[] }) {
  const [period, setPeriod] = useState<Period>(30),
    selected = nightsWithin(entries, period || null),
    s = summary(selected),
    insights = buildInsights(selected),
    alone = selected.filter((e) => e.company === "alone"),
    together = selected.filter((e) => e.company === "together"),
    a = summary(alone),
    t = summary(together),
    values = chartValues(selected, "awakenings"),
    phoneGroups = (Object.entries(phoneLabels) as [PhoneUse, string][]).map(
      ([key, label]) => ({
        label,
        items: selected.filter((e) => e.phoneUse === key),
      }),
    ),
    sportGroups = [
      { label: "Aucun", items: selected.filter((e) => !e.sport) },
      {
        label: "Léger",
        items: selected.filter((e) => e.sportIntensity === "light"),
      },
      {
        label: "Moyen",
        items: selected.filter((e) => e.sportIntensity === "medium"),
      },
      {
        label: "Intense",
        items: selected.filter((e) => e.sportIntensity === "high"),
      },
    ];
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Associations, jamais causalité</p>
          <h2>Analyses</h2>
        </div>
      </div>
      <div className="segmented" role="group" aria-label="Période">
        {([7, 30, 90, 0] as Period[]).map((p) => (
          <button
            className={period === p ? "active" : ""}
            onClick={() => setPeriod(p)}
            key={p}
          >
            {p ? `${p} j` : "Tout"}
          </button>
        ))}
      </div>
      {!selected.length ? (
        <EmptyState onAdd={() => {}} />
      ) : (
        <>
          <div className="metric-grid analysis-grid">
            <MetricCard
              label="Sommeil moyen"
              value={formatMinutes(s.duration)}
            />
            <MetricCard
              label="Réveils mémorisés"
              value={s.awakenings.toFixed(1)}
            />
            <MetricCard
              label="Endormissement"
              value={formatMinutes(s.latency)}
            />
            <MetricCard
              label="Qualité moyenne"
              value={`${s.quality.toFixed(1)}/10`}
            />
          </div>
          <article className="data-card">
            <div className="card-title">
              <div>
                <p className="eyebrow">Réveils</p>
                <h3>Évolution récente</h3>
              </div>
              <strong>
                {s.awakenings.toFixed(1)}
                <small> / nuit</small>
              </strong>
            </div>
            <MiniChart values={values} max={Math.max(6, ...values)} />
            <p className="caption">
              Réveils dont tu te souviens — pas le nombre réel de micro-réveils.
            </p>
          </article>
          <article className="data-card">
            <p className="eyebrow">Comparaison dédiée</p>
            <h3>Seul vs avec quelqu’un</h3>
            {alone.length >= 5 && together.length >= 5 ? (
              <div className="comparison">
                <div>
                  <span>Seul · {alone.length} nuits</span>
                  <strong>{a.awakenings.toFixed(1)}</strong>
                  <small>réveils mémorisés</small>
                  <p>
                    {formatMinutes(a.latency)} pour s’endormir · qualité{" "}
                    {a.quality.toFixed(1)}/10
                  </p>
                </div>
                <div>
                  <span>Avec quelqu’un · {together.length} nuits</span>
                  <strong>{t.awakenings.toFixed(1)}</strong>
                  <small>réveils mémorisés</small>
                  <p>
                    {formatMinutes(t.latency)} pour s’endormir · qualité{" "}
                    {t.quality.toFixed(1)}/10
                  </p>
                </div>
              </div>
            ) : (
              <div className="locked-insight">
                <Moon size={20} />
                <p>
                  Il faut au moins 5 nuits dans chaque groupe avant d’afficher
                  une tendance.{" "}
                  <b>
                    {alone.length}/5 seul · {together.length}/5 accompagné
                  </b>
                </p>
              </div>
            )}
          </article>
          <FactorTable title="Téléphone avant de dormir" groups={phoneGroups} />
          <FactorTable title="Sport la veille" groups={sportGroups} />
          <div className="insights">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Dans tes données</p>
                <h2>Ce qui semble compter</h2>
              </div>
            </div>
            {insights.length ? (
              insights.map((x, i) => (
                <article className="insight-card" key={i}>
                  <span>Observation {i + 1}</span>
                  <h3>{x.title}</h3>
                  <p>{x.body}</p>
                  <small>{x.detail}</small>
                </article>
              ))
            ) : (
              <article className="data-card">
                <h3>Les tendances arrivent avec le temps.</h3>
                <p className="muted">
                  YSleep attend assez de nuits dans chaque groupe avant de
                  comparer, pour éviter les conclusions hâtives.
                </p>
              </article>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function FactorTable({
  title,
  groups,
}: {
  title: string;
  groups: { label: string; items: SleepEntry[] }[];
}) {
  return (
    <article className="data-card">
      <p className="eyebrow">Comparaison descriptive</p>
      <h3>{title}</h3>
      <div className="factor-table">
        {groups.map((group) => {
          const s = summary(group.items);
          return (
            <div key={group.label}>
              <span>
                {group.label}
                <small>
                  {group.items.length} nuit{group.items.length !== 1 ? "s" : ""}
                </small>
              </span>
              <b>
                {group.items.length ? s.awakenings.toFixed(1) : "—"}
                <small> réveils</small>
              </b>
              <em>
                {group.items.length
                  ? `${Math.round(s.latency)} min · ${s.quality.toFixed(1)}/10`
                  : "Pas de donnée"}
              </em>
            </div>
          );
        })}
      </div>
      <p className="caption">
        Comparaison de tes observations uniquement. D’autres facteurs peuvent
        intervenir.
      </p>
    </article>
  );
}

function Coach({ entries }: { entries: SleepEntry[] }) {
  const prompts = [
      "Pourquoi ai-je mal dormi cette semaine ?",
      "Est-ce que mon sommeil s’améliore ?",
      "Qu’est-ce qui semble associé à mes meilleures nuits ?",
      "Est-ce que mes réveils diminuent ?",
    ],
    [question, setQuestion] = useState(prompts[0]),
    answer = useMemo(() => coachAnswer(entries, question), [entries, question]);
  return (
    <section>
      <div className="coach-hero">
        <div className="coach-icon">
          <Brain />
        </div>
        <p className="eyebrow">Coach local</p>
        <h2>Une lecture prudente de tes données.</h2>
        <p>
          Aucune donnée n’est envoyée. Le coach distingue toujours observation,
          hypothèse et conseil.
        </p>
      </div>
      <div className="prompt-list">
        {prompts.map((p) => (
          <button
            className={question === p ? "selected" : ""}
            onClick={() => setQuestion(p)}
            key={p}
          >
            {p}
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      <article className="coach-answer">
        <div className="answer-block fact">
          <span>Fait observé</span>
          <p>{answer.fact}</p>
        </div>
        <div className="answer-block hypothesis">
          <span>Hypothèse prudente</span>
          <p>{answer.hypothesis}</p>
          <small>Une association ne démontre pas une cause.</small>
        </div>
        <div className="answer-block advice">
          <span>Conseil</span>
          <p>{answer.advice}</p>
        </div>
      </article>
    </section>
  );
}

function Profile({
  entries,
  onRefresh,
}: {
  entries: SleepEntry[];
  onRefresh: () => void;
}) {
  const s = summary(entries),
    enough = entries.length >= 5,
    frequentProduct =
      entries.slice(0, 14).filter((e) => e.product !== "none").length >= 3,
    [notifications, setNotifications] = useState(false),
    [confirm, setConfirm] = useState(false);
  async function notify() {
    if ("Notification" in window)
      setNotifications((await Notification.requestPermission()) === "granted");
  }
  async function erase() {
    await clearEntries();
    setConfirm(false);
    onRefresh();
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Privé par défaut</p>
          <h2>Mon profil de sommeil</h2>
        </div>
        <Settings />
      </div>
      <article className="profile-card">
        <div className="profile-count">
          <strong>{entries.length}</strong>
          <span>
            nuits enregistrées
            <br />
            sur cet appareil
          </span>
        </div>
        {enough ? (
          <div className="profile-stats">
            <p>
              <span>Endormissement moyen</span>
              <b>{formatMinutes(s.latency)}</b>
            </p>
            <p>
              <span>Réveils mémorisés</span>
              <b>{s.awakenings.toFixed(1)} / nuit</b>
            </p>
            <p>
              <span>Sommeil estimé</span>
              <b>{formatMinutes(s.duration)}</b>
            </p>
            <p>
              <span>Qualité ressentie</span>
              <b>{s.quality.toFixed(1)}/10</b>
            </p>
            <p>
              <span>Forme</span>
              <b>{s.energy.toFixed(1)}/10</b>
            </p>
            <p>
              <span>Concentration</span>
              <b>{s.concentration.toFixed(1)}/10</b>
            </p>
          </div>
        ) : (
          <p className="muted">
            Ton profil apparaîtra après 5 nuits, pour éviter de surinterpréter
            les premiers jours.
          </p>
        )}
      </article>
      <div className="settings-list">
        <button
          onClick={() =>
            download(
              "ysleep-export.json",
              JSON.stringify(
                { exportedAt: new Date().toISOString(), entries },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          <span className="setting-icon">
            <Download />
          </span>
          <span>
            <b>Exporter en JSON</b>
            <small>Sauvegarde complète</small>
          </span>
          <ChevronRight />
        </button>
        <button
          onClick={() =>
            download(
              "ysleep-export.csv",
              toCsv(entries),
              "text/csv;charset=utf-8",
            )
          }
        >
          <span className="setting-icon">
            <BarChart3 />
          </span>
          <span>
            <b>Exporter en CSV</b>
            <small>Pour un tableur ou un médecin</small>
          </span>
          <ChevronRight />
        </button>
        <button onClick={notify}>
          <span className="setting-icon">
            <Moon />
          </span>
          <span>
            <b>Rappel du matin</b>
            <small>
              {notifications
                ? "Notifications autorisées"
                : "Autorisation optionnelle, jamais la nuit"}
            </small>
          </span>
          <span className={`switch ${notifications ? "on" : ""}`} />
        </button>
        <button className="delete-setting" onClick={() => setConfirm(true)}>
          <span className="setting-icon">
            <Trash2 />
          </span>
          <span>
            <b>Supprimer toutes les données</b>
            <small>Action irréversible</small>
          </span>
          <ChevronRight />
        </button>
      </div>
      {confirm && (
        <div className="confirm-box">
          <p>
            Supprimer définitivement toutes les nuits enregistrées sur cet
            appareil ?
          </p>
          <div>
            <button className="ghost-button" onClick={() => setConfirm(false)}>
              Annuler
            </button>
            <button className="danger-button" onClick={erase}>
              Tout supprimer
            </button>
          </div>
        </div>
      )}
      {frequentProduct && (
        <article className="medical-card">
          <Moon />
          <div>
            <h3>Produits pour dormir</h3>
            <p>
              Si tu utilises régulièrement un produit pour dormir, parle-en à un
              professionnel de santé. YSleep ne recommande ni produit ni dosage.
            </p>
          </div>
        </article>
      )}
      <article className="medical-card">
        <Activity />
        <div>
          <h3>Quand en parler</h3>
          <p>
            Des difficultés persistantes depuis plusieurs années méritent d’être
            discutées avec un médecin. Tu peux lui montrer ton export, sans
            tirer toi-même de conclusion médicale.
          </p>
        </div>
      </article>
    </section>
  );
}

function JournalModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<SleepEntry>(fresh),
    [saving, setSaving] = useState(false),
    set = <K extends keyof SleepEntry>(k: K, v: SleepEntry[K]) =>
      setDraft((d) => ({ ...d, [k]: v }));
  if (!open) return null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await saveEntry({ ...draft, createdAt: new Date().toISOString() });
    setSaving(false);
    onSaved();
    onClose();
    setDraft(fresh());
  }
  return (
    <div className="modal-backdrop">
      <form className="journal-modal" onSubmit={submit}>
        <header>
          <div>
            <p className="eyebrow">Journal du matin</p>
            <h2>Comment était ta nuit ?</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X />
          </button>
        </header>
        <div className="form-scroll">
          <div className="form-section">
            <h3>Repères de la nuit</h3>
            <label>
              Date
              <input
                type="date"
                value={draft.date}
                required
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
            <div className="time-grid">
              <label>
                Au lit
                <input
                  type="time"
                  value={draft.bedTime}
                  required
                  onChange={(e) => set("bedTime", e.target.value)}
                />
              </label>
              <label>
                Endormi vers
                <input
                  type="time"
                  value={draft.sleepTime}
                  required
                  onChange={(e) => set("sleepTime", e.target.value)}
                />
              </label>
              <label>
                Réveil final
                <input
                  type="time"
                  value={draft.wakeTime}
                  required
                  onChange={(e) => set("wakeTime", e.target.value)}
                />
              </label>
              <label>
                Sorti du lit
                <input
                  type="time"
                  value={draft.outOfBedTime}
                  required
                  onChange={(e) => set("outOfBedTime", e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="form-section">
            <h3>Continuité</h3>
            <Range
              label="Réveils dont tu te souviens"
              value={draft.rememberedAwakenings}
              max={12}
              onChange={(v) => set("rememberedAwakenings", v)}
            />
            <Choice
              legend="Temps total éveillé, approximativement"
              values={Object.entries(awakeLabels)}
              selected={draft.awakeDuration}
              onPick={(v) => set("awakeDuration", v as AwakeDuration)}
            />
            <Choice
              legend="Pensées/analyse du sommeil pendant un réveil ?"
              values={[
                ["yes", "Oui"],
                ["no", "Non"],
              ]}
              selected={draft.sleepThoughts ? "yes" : "no"}
              onPick={(v) => set("sleepThoughts", v === "yes")}
            />
          </div>
          <div className="form-section">
            <h3>Ressenti</h3>
            <Range
              label="Qualité du sommeil"
              value={draft.quality}
              onChange={(v) => set("quality", v)}
            />
            <Range
              label="Forme au réveil"
              value={draft.morningEnergy}
              onChange={(v) => set("morningEnergy", v)}
            />
            <Range
              label="Concentration dans la journée"
              value={draft.concentration}
              onChange={(v) => set("concentration", v)}
            />
          </div>
          <div className="form-section">
            <h3>Contexte</h3>
            <Choice
              legend="Téléphone avant de dormir"
              values={Object.entries(phoneLabels)}
              selected={draft.phoneUse}
              onPick={(v) => set("phoneUse", v as PhoneUse)}
            />
            <Choice
              legend="Tu as dormi…"
              values={[
                ["alone", "Seul"],
                ["together", "Avec quelqu’un"],
              ]}
              selected={draft.company}
              onPick={(v) => set("company", v as SleepCompany)}
            />
            <Choice
              legend="Sport la veille ?"
              values={[
                ["no", "Non"],
                ["yes", "Oui"],
              ]}
              selected={draft.sport ? "yes" : "no"}
              onPick={(v) => set("sport", v === "yes")}
            />
            {draft.sport && (
              <div className="time-grid">
                <label>
                  Heure approximative
                  <input
                    type="time"
                    value={draft.sportTime ?? "18:00"}
                    onChange={(e) => set("sportTime", e.target.value)}
                  />
                </label>
                <label>
                  Intensité
                  <select
                    value={draft.sportIntensity ?? "medium"}
                    onChange={(e) =>
                      set("sportIntensity", e.target.value as SportIntensity)
                    }
                  >
                    <option value="light">Légère</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Élevée</option>
                  </select>
                </label>
              </div>
            )}
            <Choice
              legend="Souvenir d’un rêve au réveil ?"
              values={[
                ["yes", "Oui"],
                ["no", "Non"],
                ["unknown", "Incertain"],
              ]}
              selected={draft.dream}
              onPick={(v) => set("dream", v as Ternary)}
            />
            <label>
              Produit avant le sommeil ?
              <select
                value={draft.product}
                onChange={(e) => set("product", e.target.value as ProductUse)}
              >
                <option value="none">Aucun</option>
                <option value="gummies">Gummies</option>
                <option value="other">Autre</option>
                <option value="private">Je préfère ne pas préciser</option>
              </select>
            </label>
            <label>
              Commentaire facultatif
              <textarea
                rows={3}
                placeholder="Quelque chose d’utile à retenir ?"
                value={draft.comment ?? ""}
                onChange={(e) => set("comment", e.target.value)}
              />
            </label>
          </div>
        </div>
        <footer>
          <p>Une estimation suffit — pas besoin d’être précis à la minute.</p>
          <button className="primary-button" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la nuit"}
          </button>
        </footer>
      </form>
    </div>
  );
}
function Range({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="range-label">
      <span>
        {label}
        <b>
          {value}
          {max === 10 ? "/10" : ""}
        </b>
      </span>
      <input
        type="range"
        min={max === 10 ? 1 : 0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Choice({
  legend,
  values,
  selected,
  onPick,
}: {
  legend: string;
  values: string[][];
  selected: string;
  onPick: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className={`choice-grid ${values.length <= 3 ? "short" : ""}`}>
        {values.map(([v, l]) => (
          <button
            type="button"
            className={selected === v ? "selected" : ""}
            onClick={() => onPick(v)}
            key={v}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function AppShell() {
  const [view, setView] = useState<View>("today"),
    [entries, setEntries] = useState<SleepEntry[]>([]),
    [modal, setModal] = useState(false),
    [loaded, setLoaded] = useState(false);
  async function refresh() {
    setEntries(await getEntries());
    setLoaded(true);
  }
  useEffect(() => {
    refresh();
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js");
  }, []);
  if (!loaded)
    return (
      <main className="loading-screen">
        <Moon />
        <p>YSleep</p>
      </main>
    );
  const hour = new Date().getHours(),
    night = hour >= 23 || hour < 7;
  if (night)
    return (
      <main className="night-screen">
        <div className="night-mark">
          <Moon />
        </div>
        <h1>La nuit n’a rien à mesurer.</h1>
        <p>
          Pose le téléphone. S’il y a un réveil, laisse-le passer sans vérifier
          l’heure.
        </p>
        <button onClick={() => setModal(true)}>
          Remplir quand même le journal
        </button>
        <JournalModal
          open={modal}
          onClose={() => setModal(false)}
          onSaved={refresh}
        />
      </main>
    );
  const tabs: { id: View; label: string; icon: React.ElementType }[] = [
    { id: "today", label: "Aujourd’hui", icon: Home },
    { id: "journal", label: "Journal", icon: Moon },
    { id: "analysis", label: "Analyses", icon: BarChart3 },
    { id: "coach", label: "Coach", icon: Brain },
    { id: "profile", label: "Profil", icon: Settings },
  ];
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>
            <Moon size={18} />
          </span>
          <b>YSleep</b>
        </div>
        <p>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <button
          className="primary-button compact desktop-add"
          onClick={() => setModal(true)}
        >
          <Plus size={17} />
          Ajouter une nuit
        </button>
      </header>
      <div className="layout">
        <nav className="side-nav" aria-label="Navigation principale">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="content">
          <div className="page-intro">
            <p className="eyebrow">Bonjour</p>
            <h1>
              {view === "today"
                ? "Comment était ta nuit ?"
                : tabs.find((t) => t.id === view)?.label}
            </h1>
          </div>
          {view === "today" && (
            <Dashboard entries={entries} onAdd={() => setModal(true)} />
          )}{" "}
          {view === "journal" && (
            <Journal
              entries={entries}
              onAdd={() => setModal(true)}
              onDelete={async (id) => {
                await removeEntry(id);
                refresh();
              }}
            />
          )}{" "}
          {view === "analysis" && <Analysis entries={entries} />}{" "}
          {view === "coach" && <Coach entries={entries} />}{" "}
          {view === "profile" && (
            <Profile entries={entries} onRefresh={refresh} />
          )}
        </div>
      </div>
      <nav className="bottom-nav" aria-label="Navigation principale">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <JournalModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={refresh}
      />
    </main>
  );
}
