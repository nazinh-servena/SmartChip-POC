export type Channel = "web" | "whatsapp";

export const CHANNEL_LIMITS: Record<Channel, number> = {
  web: 6,
  whatsapp: 3,
};
