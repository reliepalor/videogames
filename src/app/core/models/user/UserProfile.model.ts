export interface ProfileRecentOrder {
  id: number;
  type: 'game' | 'digital';
  title: string;
  quantity: number;
  totalPrice: number;
  createdAt: string;
  status: string;
}

export interface Profile {
  username: string;
  email: string;
  profilePicture?: string;
  createdAt?: string | Date;
  totalOrders?: number;
  totalReviews?: number;
  totalSpent?: number;
  isExternalAuth?: boolean;
  reviewedGames?: Array<{
    title: string;
    gameId?: number;
    imageUrl?: string;
  }>;
  recentOrders?: ProfileRecentOrder[];
  allOrders?: ProfileRecentOrder[];
}
