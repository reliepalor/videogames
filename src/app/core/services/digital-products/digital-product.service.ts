import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { DigitalProduct } from '../../models/digital-products/digital-product.model';
import { CreateDigitalProductDto } from '../../models/digital-products/create-digital-product.dto';
import { UpdateDigitalProductDto } from '../../models/digital-products/update-digital-product.dto';
import { DigitalProductKey } from '../../models/digital-products/digital-product-key.model';

import { environment } from 'src/environments/environment';


@Injectable({
    providedIn: 'root'
})

export class DigitalProductService{

    private readonly API_URL = 'http://localhost:5019/api';
    private readonly BASE_URL = environment.apiUrl;

    constructor(private http: HttpClient) {}

    // user------------

    //get all active digital products
    getActiveProducts(): Observable<DigitalProduct[]> {
        return this.http.get<DigitalProduct[]>(
            `${this.API_URL}/digital-products`
        ).pipe(
            map(products =>
                (products ?? []).map(product => ({
                    ...product,
                    imagePath: this.normalizeImagePath(product.imagePath)
                }))
            )
        );
    }

    
    //get single product by ID
    getProductById(id: number): Observable<DigitalProduct> {
        return this.http.get<DigitalProduct>(
            `${this.API_URL}/digital-products/${id}`
        ).pipe(
            map(product => ({
                ...product,
                imagePath: this.normalizeImagePath(product.imagePath)
            }))
        );
    }

    //admin--------------

    ///get all products
    getAdminProducts(includeInactive = false): Observable<DigitalProduct[]> {
        const params = new HttpParams()
        .set('includeInactive', includeInactive);

        return this.http.get<DigitalProduct[]>(
        `${this.API_URL}/admin/digital-products`,
        { params }
        ).pipe(
            map(products =>
                (products ?? []).map(product => ({
                    ...product,
                    imagePath: this.normalizeImagePath(product.imagePath)
                }))
            )
        );
    }

    private normalizeImagePath(path?: string | null): string | undefined {
        if (!path) return undefined;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `${this.BASE_URL}${normalized}`;
    }

    // create digital product
    createProduct(dto: CreateDigitalProductDto): Observable<any> {
        const formData = new FormData();

        formData.append('name', dto.name);
        formData.append('brand', dto.brand);
        formData.append('platform', dto.platform);
        formData.append('productType', dto.productType.toString());
        formData.append('licenseDuration', dto.licenseDuration.toString());
        formData.append('price', dto.price.toString());

        if(dto.description){
            formData.append('description', dto.description);
        }

        if(dto.image){
            formData.append('image', dto.image);
        }

        return this.http.post(
            `${this.API_URL}/admin/digital-products`,
            formData
        );
    }

    // update digital product
    updateProduct(id: number, dto: UpdateDigitalProductDto): Observable<any> {
        const formData = new FormData();

        formData.append('name', dto.name);
        formData.append('brand', dto.brand);
        formData.append('platform', dto.platform);
        formData.append('productType', dto.productType.toString());
        formData.append('licenseDuration', dto.licenseDuration.toString());
        formData.append('price', dto.price.toString());
        formData.append('isActive', dto.isActive.toString());

        if (dto.description) {
        formData.append('description', dto.description);
        }

        if (dto.image) {
        formData.append('image', dto.image);
        }

        return this.http.put(
        `${this.API_URL}/admin/digital-products/${id}`,
        formData
        );
    }

    //soft delete
    archiveProduct(id: number): Observable<any>{
        return this.http.delete(
            `${this.API_URL}/admin/digital-products/${id}`,
        );;
    }

    restoreProduct(id: number): Observable<any> {
        return this.http.post(
        `${this.API_URL}/admin/digital-products/${id}/restore`,
        {}
        );
    }

    /** Add product key */
    addProductKey(payload: { digitalProductId: number; productKey: string;
    }) {
        return this.http.post(
            `${this.API_URL}/admin/digital-products/keys`,
            payload
        );
    }

    getProductKeys(productId: number) {
        return this.http.get<DigitalProductKey[]>(
            `${this.API_URL}/admin/digital-products/${productId}/keys`
        )
    }
}
