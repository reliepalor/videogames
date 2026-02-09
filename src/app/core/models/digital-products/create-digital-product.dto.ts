import { DigitalProduct } from "./digital-product.model";
import { LicenseDuration } from "./enums/license-duration.enum";

export interface CreateDigitalProductDto {
  name: string;
  brand: string;
  platform: string;

  productType: DigitalProduct;
  licenseDuration: LicenseDuration;
  description?: string;
  price: number;

  image?: File; 
}
