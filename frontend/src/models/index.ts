export type Role = 'user' | 'agent' | 'error';

export interface Message {
  id: string;
  role: Role;
  text: string;
}
