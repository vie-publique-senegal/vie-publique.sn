export interface NewsArticle {
  id: string;
  title: string;
  slug?: string;
  date_published: string;
  date_updated?: string;
  cover_image?: string;
  featured?: boolean;
  content?: string;
  tags?: string[];
  category?: {
    name: string;
    slug?: string;
  };
  document?: {
    file?: string;
  };
}

export interface NewsOptions {
  /** ID de l'article pour récupération unitaire */
  id?: string | Ref<string>; // Support reactive ID

  /** Filtrer uniquement les articles featured */
  featured?: boolean;

  /** Catégorie spécifique */
  category?: string;

  /** Tri par défaut */
  sort?: string;

  /** Nombre d'items par page */
  limit?: number;

  /** Synchroniser avec l'URL */
  syncUrl?: boolean;
}
