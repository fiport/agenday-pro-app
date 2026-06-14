export type UserRole = 'admin' | 'user';

export type Appointment = {
  id: string;
  businessId: string;
  businessName: string;
  businessWhatsapp: string;
  serviceName: string;
  clientPhone: string;
  clientName: string;
  clientAvatarUrl?: string;
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type Service = {
  id: string;
  name: string;
  price?: string;
};

export type BusinessHours = {
  day: string;
  morningOpen: string;
  morningClose: string;
  afternoonOpen: string;
  afternoonClose: string;
  closed?: boolean;
};

export type Business = {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  instagram?: string;
  facebook?: string;
  whatsapp: string;
  // structured address (replaces freeform address)
  cep?: string;
  street?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address?: string; // kept for backwards compat / display fallback
  lat?: number;
  lng?: number;
  hours: BusinessHours[];
  services: Service[];
  planExpiresAt?: string;
  logoUrl?: string;
};

export type Sponsor = {
  id: string;
  name: string;
  tagline?: string;
  color: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  expiresAt?: string;
  imageUrl?: string;
  cep?: string;
  street?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  address?: string;
  lat?: number;
  lng?: number;
};
