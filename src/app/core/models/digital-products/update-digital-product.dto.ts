import { DigitalProductType } from "./enums/digital-product-type.enum";
import { LicenseDuration } from "./enums/license-duration.enum";

export interface UpdateDigitalProductDto {
  name: string;
  brand: string;
  platform: string;

  productType: DigitalProductType;
  licenseDuration: LicenseDuration;
  description?: string;
  price: number;
  isActive: boolean;

  image?: File;
}
