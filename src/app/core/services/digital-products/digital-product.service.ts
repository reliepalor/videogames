import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { DigitalProduct } from '../../models/digital-products/digital-product.model';
import { CreateDigitalProductDto } from '../../models/digital-products/create-digital-product.dto';
import { UpdateDigitalProductDto } from '../../models/digital-products/update-digital-product.dto';
import { DigitalProductKey } from '../../models/digital-products/digital-product-key.model';

import { environment } from 'environments/environment';


@Injectable({
    providedIn: 'root'
})

export class DigitalProductService{

    private readonly API_URL = `${environment.apiUrl}/api`;
    private readonly BASE_URL = environment.apiUrl;
    private readonly useMockData = environment.useMockData;

    private readonly mockProductsKey = 'mock_digital_products';
    private readonly mockProductKeysKey = 'mock_digital_product_keys';
    private readonly mockProductsSeedSignatureKey = 'mock_digital_products_seed_signature';
    private readonly mockProductsSeedPath = '/assets/mock/digital-products.json';
    private readonly defaultImagePath = '/assets/no-image.png';

    constructor(private http: HttpClient) {}

    // user------------

    //get all active digital products
    getActiveProducts(): Observable<DigitalProduct[]> {
        if (this.useMockData) {
            return this.ensureMockProductsLoaded().pipe(
                map(products => products.filter(product => product.isActive))
            );
        }

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
        if (this.useMockData) {
            return this.ensureMockProductsLoaded().pipe(
                map(products => {
                    const product = products.find(item => item.id === id);
                    if (!product) {
                        throw new Error('Digital product not found in mock data');
                    }

                    return product;
                })
            );
        }

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
        if (this.useMockData) {
            return this.ensureMockProductsLoaded().pipe(
                map(products => includeInactive
                    ? products
                    : products.filter(product => product.isActive)
                )
            );
        }

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
        if (path.startsWith('/assets/') || path.startsWith('assets/')) {
            return path.startsWith('/') ? path : `/${path}`;
        }
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `${this.BASE_URL}${normalized}`;
    }

    // create digital product
    createProduct(dto: CreateDigitalProductDto): Observable<any> {
        if (this.useMockData) {
            return this.ensureMockProductsLoaded().pipe(
                map(products => {
                    const nextId = products.length
                        ? Math.max(...products.map(product => product.id)) + 1
                        : 1;

                    const created: DigitalProduct = {
                        id: nextId,
                        name: dto.name,
                        brand: dto.brand,
                        platform: dto.platform,
                        productType: dto.productType,
                        licenseDuration: dto.licenseDuration,
                        price: Number(dto.price) || 0,
                        description: dto.description?.trim() || undefined,
                        imagePath: this.defaultImagePath,
                        stock: 0,
                        availableKeys: 0,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    const updated = [...products, created];
                    this.writeToStorage(this.mockProductsKey, updated);
                    return created;
                })
            );
        }

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
        if (this.useMockData) {
            return this.ensureMockProductsLoaded().pipe(
                map(products => {
                    const index = products.findIndex(product => product.id === id);
                    if (index < 0) {
                        throw new Error('Digital product not found for mock update');
                    }

                    const current = products[index];
                    const updatedProduct: DigitalProduct = {
                        ...current,
                        name: dto.name,
                        brand: dto.brand,
                        platform: dto.platform,
                        productType: dto.productType,
                        licenseDuration: dto.licenseDuration,
                        price: Number(dto.price) || current.price,
                        description: dto.description?.trim() || undefined,
                        isActive: dto.isActive,
                        updatedAt: new Date().toISOString(),
                    };

                    const updated = [...products];
                    updated[index] = updatedProduct;
                    this.writeToStorage(this.mockProductsKey, updated);
                    return updatedProduct;
                })
            );
        }

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
        if (this.useMockData) {
            return this.setProductActiveState(id, false);
        }

        return this.http.delete(
            `${this.API_URL}/admin/digital-products/${id}`,
        );;
    }

    restoreProduct(id: number): Observable<any> {
        if (this.useMockData) {
            return this.setProductActiveState(id, true);
        }

        return this.http.post(
        `${this.API_URL}/admin/digital-products/${id}/restore`,
        {}
        );
    }

    /** Add product key */
    addProductKey(payload: { digitalProductId: number; productKey: string;
    }) {
        if (this.useMockData) {
            return this.ensureMockProductsLoaded().pipe(
                map(products => {
                    const product = products.find(item => item.id === payload.digitalProductId);
                    if (!product) {
                        throw new Error('Digital product not found for key assignment');
                    }

                    const allKeys = this.readFromStorage<(DigitalProductKey & { digitalProductId: number })[]>(
                        this.mockProductKeysKey,
                        []
                    );
                    const productKeys = allKeys.filter(key => key.digitalProductId === payload.digitalProductId);
                    const nextKeyId = productKeys.length
                        ? Math.max(...productKeys.map(key => key.id)) + 1
                        : 1;

                    const createdKey: DigitalProductKey = {
                        id: nextKeyId,
                        productKey: payload.productKey,
                        isUsed: false,
                        assignedToUserId: null,
                        useAt: null,
                        createdAt: new Date().toISOString(),
                    };

                    this.writeToStorage(this.mockProductKeysKey, [
                        ...allKeys,
                        { ...createdKey, digitalProductId: payload.digitalProductId },
                    ]);

                    this.syncProductKeyCounts(payload.digitalProductId);
                    return createdKey;
                })
            );
        }

        return this.http.post(
            `${this.API_URL}/admin/digital-products/keys`,
            payload
        );
    }

    getProductKeys(productId: number) {
        if (this.useMockData) {
            const allKeys = this.readFromStorage<(DigitalProductKey & { digitalProductId: number })[]>(
                this.mockProductKeysKey,
                []
            );

            return of(
                allKeys
                    .filter(key => key.digitalProductId === productId)
                    .map(({ digitalProductId, ...key }) => key)
            );
        }

        return this.http.get<DigitalProductKey[]>(
            `${this.API_URL}/admin/digital-products/${productId}/keys`
        )
    }

    private ensureMockProductsLoaded(): Observable<DigitalProduct[]> {
        return this.http.get<DigitalProduct[]>(this.mockProductsSeedPath).pipe(
            map(products => (products ?? []).map(product => this.withNormalizedImage(product))),
            switchMap(products => {
                const stored = this.readFromStorage<DigitalProduct[]>(this.mockProductsKey, []);
                const storedSignature = this.readFromStorage<string>(
                    this.mockProductsSeedSignatureKey,
                    ''
                );
                const incomingSignature = this.createProductsSignature(products);

                const shouldRefreshFromSeed = !stored.length || storedSignature !== incomingSignature;

                if (shouldRefreshFromSeed) {
                    this.writeToStorage(this.mockProductsKey, products);
                    this.writeToStorage(this.mockProductsSeedSignatureKey, incomingSignature);
                    this.rebuildProductKeys(products);
                    return of(products);
                }

                const normalizedStored = stored.map(product => this.withNormalizedImage(product));
                const keys = this.readFromStorage<(DigitalProductKey & { digitalProductId: number })[]>(
                    this.mockProductKeysKey,
                    []
                );

                if (!keys.length) {
                    this.rebuildProductKeys(normalizedStored);
                }

                return of(normalizedStored);
            })
            ,
            catchError(() => {
                const stored = this.readFromStorage<DigitalProduct[]>(this.mockProductsKey, []);
                return of(stored.map(product => this.withNormalizedImage(product)));
            })
        );
    }

    private rebuildProductKeys(products: DigitalProduct[]): void {
        const generatedKeys: Array<DigitalProductKey & { digitalProductId: number }> = [];
        for (const product of products) {
            for (let i = 0; i < product.availableKeys; i++) {
                generatedKeys.push({
                    id: i + 1,
                    digitalProductId: product.id,
                    productKey: this.generateMockProductKey(product.id, i + 1),
                    isUsed: false,
                    assignedToUserId: null,
                    useAt: null,
                    createdAt: new Date().toISOString(),
                });
            }
        }

        this.writeToStorage(this.mockProductKeysKey, generatedKeys);
    }

    private createProductsSignature(products: DigitalProduct[]): string {
        return JSON.stringify(
            products.map(product => ({
                id: product.id,
                name: product.name,
                brand: product.brand,
                platform: product.platform,
                productType: product.productType,
                licenseDuration: product.licenseDuration,
                price: product.price,
                description: product.description,
                imagePath: product.imagePath,
                stock: product.stock,
                availableKeys: product.availableKeys,
                isActive: product.isActive,
            }))
        );
    }

    private setProductActiveState(id: number, isActive: boolean): Observable<DigitalProduct> {
        return this.ensureMockProductsLoaded().pipe(
            map(products => {
                const index = products.findIndex(product => product.id === id);
                if (index < 0) {
                    throw new Error('Digital product not found');
                }

                const updatedProduct: DigitalProduct = {
                    ...products[index],
                    isActive,
                    updatedAt: new Date().toISOString(),
                };

                const updated = [...products];
                updated[index] = updatedProduct;
                this.writeToStorage(this.mockProductsKey, updated);
                return updatedProduct;
            })
        );
    }

    private syncProductKeyCounts(digitalProductId: number): void {
        const products = this.readFromStorage<DigitalProduct[]>(this.mockProductsKey, []);
        const keys = this.readFromStorage<(DigitalProductKey & { digitalProductId: number })[]>(
            this.mockProductKeysKey,
            []
        );

        const productIndex = products.findIndex(product => product.id === digitalProductId);
        if (productIndex < 0) {
            return;
        }

        const productKeys = keys.filter(key => key.digitalProductId === digitalProductId);
        const availableKeys = productKeys.filter(key => !key.isUsed).length;

        const updatedProduct: DigitalProduct = {
            ...products[productIndex],
            stock: productKeys.length,
            availableKeys,
            updatedAt: new Date().toISOString(),
        };

        const updatedProducts = [...products];
        updatedProducts[productIndex] = updatedProduct;
        this.writeToStorage(this.mockProductsKey, updatedProducts);
    }

    private withNormalizedImage(product: DigitalProduct): DigitalProduct {
        return {
            ...product,
            imagePath: this.normalizeImagePath(product.imagePath || this.defaultImagePath),
        };
    }

    private generateMockProductKey(productId: number, keyIndex: number): string {
        const productPart = String(productId).padStart(2, '0');
        const keyPart = String(keyIndex).padStart(4, '0');
        return `DG-${productPart}-${keyPart}-MOCK`;
    }

    private readFromStorage<T>(key: string, fallback: T): T {
        if (typeof localStorage === 'undefined') {
            return fallback;
        }

        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            return fallback;
        }
    }

    private writeToStorage<T>(key: string, value: T): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(key, JSON.stringify(value));
    }
}
