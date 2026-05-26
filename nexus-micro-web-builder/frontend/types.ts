import { LucideIcon } from 'lucide-react';

export interface BusinessModelDetails {
  priceTitle: string;
  priceDesc: string;
  design: string;
  sales: string;
}

export interface BusinessModel {
  id: string;
  title: string;
  priceRange: string;
  icon: LucideIcon;
  details: BusinessModelDetails;
  chartData: { x: number; y: number };
}
