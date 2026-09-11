import { ToolType, Point } from './canvas';

export interface UserPresenceData {
  clientId: string;
  name: string;
  color: string;
}

export interface PeerAwarenessState {
  user: UserPresenceData;
  cursor: Point | null; // In world coordinates
  activeTool: ToolType;
  selectedElementIds: string[]; // IDs of elements currently selected by peer
  lastActive: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';
