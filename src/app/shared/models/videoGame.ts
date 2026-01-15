export interface VideoGame {
  id: number;
  title: string;
  platform: string;
  developer: string;
  publisher: string;
  price: number;
  imagePath?: string;
  imageUrl?: string; // mapped in service
}
