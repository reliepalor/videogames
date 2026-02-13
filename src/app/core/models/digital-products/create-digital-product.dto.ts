import { DigitalProductType } from "./enums/digital-product-type.enum";
import { LicenseDuration } from "./enums/license-duration.enum";

export interface CreateDigitalProductDto {
  name: string;
  brand: string;
  platform: string;

  productType: DigitalProductType;
  licenseDuration: LicenseDuration;
  description?: string;
  price: number;

  image?: File; 
}
