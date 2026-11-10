export type AquariumFish = { id: string; name: string; creator: string; imageUrl: string; createdAt: number; active: boolean; owned: boolean; bounds: { x: number; y: number; width: number; height: number } };
export type AquariumState = { code: string; title: string; accepting: boolean; role: 'host' | 'participant'; participantName: string | null; fish: AquariumFish[]; activeCount: number; savedCount: number; limits: { active: number; saved: number; perPerson: number }; updatedAt: number };
export type AquariumSummary = { code: string; title: string; accepting: boolean };
// All mutations use JSON except PNG upload; same-origin HttpOnly cookies authenticate roles.
// POST /api/aquariums {title} -> {code,recoveryKey}; creates host cookie.
// POST /api/aquariums/:code/recover {recoveryKey} -> {code}; restores host cookie.
// GET /api/aquariums/:code -> AquariumState if authenticated, otherwise AquariumSummary with role:null.
// POST /api/aquariums/:code/join {name} -> AquariumState; reuses participant cookie.
// POST /api/aquariums/:code/fish PNG body, X-Fish-Name and X-Action-Id headers -> {fishId,active}; idempotent.
// POST /api/aquariums/:code/control {action:'set-active',ids:string[]} | {action:'end'} | {action:'start'} -> AquariumState.
// Host set-active replaces current selection atomically, max 40. End hides all and closes submissions, never deletes saved fish.
// GET /api/aquariums/:code/media/:fishId serves PNG only to authenticated room host/participant.
