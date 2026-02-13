export interface DigitalProductKey{
    id: number;
    productKey: string;
    isUsed: boolean;
    assignedToUserId: number | null;
    useAt: string | null;
    createdAt: string;
}