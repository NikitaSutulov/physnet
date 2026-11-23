export type Selection = { kind: 'device'; id: string } | { kind: 'link'; id: string };

export interface WaypointDraft {
  linkId: string;
  waypoints: { x: number; y: number }[];
}
