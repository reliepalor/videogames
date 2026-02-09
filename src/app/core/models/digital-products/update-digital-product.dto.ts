import { DigitalProduct } from "./digital-product.model";
import { LicenseDuration } from "./enums/license-duration.enum";

export interface UpdateDigitalProductDto {
  name: string;
  brand: string;
  platform: string;

  productType: DigitalProduct;
  licenseDuration: LicenseDuration;
  description?: string;
  price: number;
  isActive: boolean;

  image?: File;
}
