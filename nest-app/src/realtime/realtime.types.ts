export interface MessageCreatedEvent {
  id: number;
  sender_id: number;
  receiver_id: number;
  created_at: string;
}
