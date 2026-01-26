export interface Review{
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
    username: string;
}
export interface GameReviewsResponse{
    videoGameId: number;
    videoGameTitle: string;
    averageRating: number;
    totalReviews: number;
    reviews: Review[];
}