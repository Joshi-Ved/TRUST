export interface CrawledPost {
  externalPostId: string;
  url: string;
  contentText: string;
  mediaType: "text" | "image" | "video";
  likes: number;
  reposts: number;
  views: number;
  commentCount: number;
  postedAt: Date;
  comments: Array<{
    author: string;
    text: string;
    postedAt: Date;
  }>;
}

export interface CrawlTarget {
  handle: string;
  platform: "TWITTER" | "LENS" | "INSTAGRAM";
  limit?: number;
}
