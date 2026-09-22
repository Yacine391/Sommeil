# YSleep

PWA mobile de journal et d’analyse personnelle du sommeil. Les données sont conservées localement dans IndexedDB : aucun compte et aucun serveur de données.

## Fonctionnalités

- journal du matin rapide et modifiable par date ;
- durée estimée, latence, réveils mémorisés, temps éveillé, qualité, forme et concentration ;
- score personnel non médical ;
- tendances 7, 30, 90 jours et depuis le début ;
- comparaisons téléphone, sport, semaine/week-end et seul/avec quelqu’un ;
- seuil de 5 nuits par groupe avant la tendance seul/avec quelqu’un ;
- coach local qui sépare fait, hypothèse et conseil ;
- exports JSON et CSV, suppression complète ;
- mode nuit sans horloge, statistique ni notification ;
- manifest, service worker, icônes maskables, safe areas iPhone et fonctionnement hors ligne.

## Lancer le projet

Node.js 22.13 ou plus récent est requis.

```bash
npm ci
npm run dev
```

Ouvrir ensuite l’URL locale indiquée dans le terminal.

## Vérifier et construire

```bash
npx tsc --noEmit
node --experimental-strip-types lib/sleep.test.ts
npm run build
npm run start
```

## Déploiement

Le dépôt peut être déployé sur une plateforme compatible Cloudflare Workers. Pour une installation iPhone, le site doit être servi en HTTPS.

## Installer sur iPhone

1. Ouvrir l’URL HTTPS dans Safari.
2. Toucher **Partager**.
3. Choisir **Ajouter à l’écran d’accueil**.
4. Confirmer **Ajouter**.

Ouvrir ensuite YSleep depuis son icône. Les données restent attachées à cette installation et à cet appareil : exporter régulièrement le JSON pour conserver une sauvegarde.

## Notifications

La V1 peut demander l’autorisation de notification, mais une PWA 100 % locale ne peut pas garantir un rappel programmé à 08:30 lorsque l’application est fermée. Une planification fiable demanderait un service de push ; aucun service distant n’est inclus afin de respecter le stockage local par défaut. Aucune notification nocturne n’est créée.

## Limites médicales

YSleep ne pose aucun diagnostic, ne recommande aucun médicament ou complément et ne transforme jamais une corrélation en causalité. Les résultats sont des descriptions prudentes des données saisies.
