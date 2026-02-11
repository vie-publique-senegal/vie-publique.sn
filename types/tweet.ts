export interface TweetMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url?: string;
  preview_image_url?: string;
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  url: string;
  media?: TweetMedia[];
}
