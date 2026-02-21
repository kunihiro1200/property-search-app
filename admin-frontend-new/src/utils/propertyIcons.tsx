import {
  Home,
  Building,
  Calendar,
  Layout,
  Car,
  Train,
  GraduationCap,
  Hospital,
  ShoppingCart,
} from 'lucide-react';

export const PROPERTY_FEATURE_ICONS = {
  land_area: Home,
  building_area: Building,
  building_age: Calendar,
  floor_plan: Layout,
  parking: Car,
  station: Train,
  school: GraduationCap,
  hospital: Hospital,
  shopping: ShoppingCart,
} as const;

export type PropertyFeatureType = keyof typeof PROPERTY_FEATURE_ICONS;
