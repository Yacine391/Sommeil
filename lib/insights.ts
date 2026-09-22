import { isWeekend, metrics, SleepEntry, summary } from "./sleep";
export interface Insight {
  title: string;
  body: string;
  detail: string;
}
const compare = (entries: SleepEntry[], p: (e: SleepEntry) => boolean) => {
  const yes = entries.filter(p),
    no = entries.filter((e) => !p(e));
  return { yes, no, a: summary(yes), b: summary(no) };
};
export function buildInsights(entries: SleepEntry[]): Insight[] {
  if (entries.length < 5) return [];
  const e = entries.slice(0, 30),
    out: Insight[] = [];
  const c = compare(e, (x) => x.company === "together");
  if (c.yes.length >= 5 && c.no.length >= 5)
    out.push({
      title: "Seul vs avec quelqu’un",
      body: `Avec quelqu’un : ${c.a.awakenings.toFixed(1)} réveil(s) mémorisé(s), contre ${c.b.awakenings.toFixed(1)} seul.`,
      detail: `Association observée sur ${c.yes.length + c.no.length} nuits, sans preuve de causalité.`,
    });
  const p = compare(e, (x) => ["none", "lt15", "15-30"].includes(x.phoneUse));
  if (p.yes.length >= 5 && p.no.length >= 5)
    out.push({
      title: "Téléphone avant le coucher",
      body: `Avec 30 min ou moins de téléphone : ${Math.round(p.a.latency)} min pour t’endormir, contre ${Math.round(p.b.latency)} min au-delà.`,
      detail: `Corrélation observée sur ${p.yes.length + p.no.length} nuits.`,
    });
  const s = compare(e, (x) => x.sport);
  if (s.yes.length >= 5 && s.no.length >= 5)
    out.push({
      title: "Sport",
      body: `Après le sport : qualité moyenne ${s.a.quality.toFixed(1)}/10, contre ${s.b.quality.toFixed(1)}/10 sans sport.`,
      detail: `Association observée sur ${s.yes.length + s.no.length} nuits.`,
    });
  const w = compare(e, (x) => isWeekend(x.date));
  if (w.yes.length >= 3 && w.no.length >= 5)
    out.push({
      title: "Semaine et week-end",
      body: `Week-end : ${w.a.awakenings.toFixed(1)} réveil(s) mémorisé(s), contre ${w.b.awakenings.toFixed(1)} en semaine.`,
      detail: "Tendance descriptive, sans interprétation médicale.",
    });
  return out.slice(0, 3);
}
export function coachAnswer(entries: SleepEntry[], question: string) {
  const r = entries.slice(0, 7);
  if (r.length < 3)
    return {
      fact: "Il me faut au moins 3 nuits pour décrire une tendance courte.",
      hypothesis: "Aucune hypothèse prudente n’est encore possible.",
      advice:
        "Continue simplement le journal, sans chercher à contrôler ta nuit.",
    };
  const s = summary(r),
    old = summary(entries.slice(7, 14)),
    d = s.quality - old.quality,
    ins = buildInsights(entries),
    wake = /réveil/i.test(question),
    improve = /amélior|évolu/i.test(question);
  return {
    fact: wake
      ? `Sur tes ${r.length} dernières nuits : ${s.awakenings.toFixed(1)} réveil(s) mémorisé(s) et environ ${Math.round(s.awake)} min éveillé.`
      : improve
        ? `Ta qualité récente est de ${s.quality.toFixed(1)}/10${entries.length >= 10 ? `, ${Math.abs(d).toFixed(1)} point ${d >= 0 ? "au-dessus" : "au-dessous"} de la période précédente` : ""}.`
        : `Sur tes ${r.length} dernières nuits : ${Math.round(s.latency)} min pour t’endormir, ${s.awakenings.toFixed(1)} réveil(s) mémorisé(s) et ${s.quality.toFixed(1)}/10 de qualité.`,
    hypothesis:
      ins[0]?.body ??
      "Les données ne distinguent pas encore clairement un facteur associé à tes meilleures nuits.",
    advice:
      "Ce soir, évite de vérifier l’heure si tu te réveilles et laisse le réveil passer sans calculer le temps restant.",
  };
}
export const chartValues = (
  entries: SleepEntry[],
  field: "awakenings" | "score",
) =>
  entries
    .slice(0, 14)
    .reverse()
    .map((e) =>
      field === "awakenings" ? e.rememberedAwakenings : metrics(e).score,
    );
