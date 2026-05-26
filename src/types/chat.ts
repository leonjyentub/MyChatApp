export type User = {
  id: string;
  username: string;
  name: string;
  birthday: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  created_at: string;
};

export type ChatSummary = {
  friend: User;
  last_message: Message | null;
  last_time: string | null;
};

export type RegisterInput = {
  username: string;
  password: string;
  display_name?: string;
};

export type LoginInput = {
  username: string;
  password: string;
};

export type ProfileInput = {
  name: string;
  birthday: string | null;
  avatar_url: string | null;
};
