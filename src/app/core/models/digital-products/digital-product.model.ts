import { DigitalProductType } from "./enums/digital-product-type.enum";
import { LicenseDuration } from "./enums/license-duration.enum";

export interface DigitalProduct{
  id: number;
  name: string;
  brand: string;
  platform: string;

  productType: DigitalProduct;      
  licenseDuration: LicenseDuration; 
  price: number;
  description?: string;
  imagePath?: string;

  stock: number;
  availableKeys: number;
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}