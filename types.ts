
export interface DesignStyle {
  id: string;
  name: string;
  prompt: string;
  thumbnail: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isImageAction?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}
