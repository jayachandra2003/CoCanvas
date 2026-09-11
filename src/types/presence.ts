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
  lastActive: number;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';
