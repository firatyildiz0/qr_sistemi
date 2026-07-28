export type BookingStatus = "upcoming" | "active" | "completed" | "cancelled";

export type Product = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  features: string[] | null;
  daily_price: number | null;
  stock: number;
  images: string[] | null;
  created_at: string;
};

export type Booking = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_city: string | null;
  customer_district: string | null;
  customer_address: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: BookingStatus;
  created_at: string;
};

export type Notification = {
  id: string;
  booking_id: string;
  product_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
