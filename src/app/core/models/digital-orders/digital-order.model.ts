export interface DigitalOrderItem {
  id: number;
  productKey: string;
  isAssigned: boolean;
  assignedAt: string | null;
}

export interface DigitalOrder {
  id: number;
  userId: number;
  userName?: string;
  username?: string;
  fullName?: string;
  name?: string;
  userEmail?: string;
  email?: string;
  user?: {
    userName?: string;
    username?: string;
    fullName?: string;
    name?: string;
    email?: string;
  };
  digitalProductId: number;
  digitalProductName: string;
  digitalProductImagePath?: string;
  imagePath?: string;
  digitalProduct?: {
    imagePath?: string;
    name?: string;
  };
  quantity: number;
  totalPrice: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  approvedAt: string | null;
  items: DigitalOrderItem[];
}
