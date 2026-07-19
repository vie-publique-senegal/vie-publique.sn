// server/api/documents/detail/[id].ts
import { readItem } from '@directus/sdk';

interface Document {
  id: string;
  title: string;
  slug: string;
  type: string;
  publish_date: string;
  date_updated?: string;
  description?: string;
  audit_institution?: string;
  cover_image?: string;
  content_html?: string;
  file?: {
    id: string;
    type: string;
    filesize: string;
    filename_download: string;
  };
}

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig();
    const id = getRouterParam(event, 'id');

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID du document manquant',
      });
    }

    // Les ids documents sont numériques ; un slug ou autre chaîne (vieux liens,
    // bots) doit donner un 404 propre, pas une erreur Directus convertie en 500
    if (!/^\d+$/.test(id)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Document non trouvé',
      });
    }

    try {
      const directus = getCmsClient();

      const documentData = await directus.request(
        readItem('documents', id, {
          fields: [
            'id',
            'title',
            'slug',
            'status',
            'type',
            'publish_date',
            'date_updated',
            'description',
            'audit_institution',
            'cover_image',
            'content_html',
            'file.id',
            'file.type',
            'file.filesize',
            'file.filename_download',
          ],
        }),
      );

      // Vérifier si le document est publié
      if (documentData.status !== 'published') {
        throw createError({
          statusCode: 404,
          statusMessage: 'Document non trouvé',
        });
      }

      // Transformation des données
      const transformedDocument: Document = {
        id: documentData.id,
        title: documentData.title,
        slug: documentData.slug,
        type: documentData.type,
        publish_date: documentData.publish_date,
        ...(documentData.date_updated ? { date_updated: documentData.date_updated } : {}),
        ...(documentData.description ? { description: documentData.description } : {}),
        ...(documentData.audit_institution
          ? { audit_institution: documentData.audit_institution }
          : {}),
        ...(documentData.cover_image ? { cover_image: documentData.cover_image } : {}),
        ...(documentData.content_html ? { content_html: documentData.content_html } : {}),
        ...(documentData.file ? { file: documentData.file } : {}),
      };

      return {
        document: transformedDocument,
      };
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }

      // Directus répond 403 FORBIDDEN pour un item inexistant (token restreint) :
      // c'est un « non trouvé », pas une panne à monitorer
      const cmsStatus = error?.response?.status;
      if (cmsStatus === 403 || cmsStatus === 404) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Document non trouvé',
        });
      }

      reportServerError(error, 'api/documents/[id]', { id });
      throw createError({
        statusCode: 500,
        statusMessage: 'Erreur lors de la récupération du document',
      });
    }
  },
  {
    maxAge: 5 * 60, // 5 minutes
    name: 'document-detail',
    getKey: (event) => {
      const id = getRouterParam(event, 'id');
      return `document-detail-${id}`;
    },
  },
);
