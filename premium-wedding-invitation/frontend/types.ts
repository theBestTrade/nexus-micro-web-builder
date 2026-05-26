
export interface WeddingData {
  groom: {
    name: string;
    phone: string;
    father: string;
    mother: string;
    account: string;
    bank: string;
  };
  bride: {
    name: string;
    phone: string;
    father: string;
    mother: string;
    account: string;
    bank: string;
  };
  date: string; // ISO format
  location: {
    name: string;
    address: string;
    hall: string;
    mapUrl: string;
  };
  message: string;
}

export interface GuestMessage {
  id: string;
  name: string;
  content: string;
  timestamp: number;
}
