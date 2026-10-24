import {
  createDirectus,
  createItem,
  readItems,
  readMe,
  rest,
  staticToken,
  uploadFiles,
} from "@directus/sdk";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo

/**
 * Upload d'un PV par un observateur authentifié
 * Route: POST /api/elections/pvs-upload/upload
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const cmsUrl = config.cmsApiUrl;

  // Vérifier l'authentification
  const token = getCookie(event, "election_cms_token");
  if (!token) {
    throw createError({ statusCode: 401, message: "Authentification requise" });
  }

  // Vérifier que le token est valide et récupérer les infos utilisateur
  const userClient = createDirectus(cmsUrl)
    .with(rest())
    .with(staticToken(token));

  let currentUser: any;
  try {
    currentUser = await userClient.request(
      readMe({
        fields: ["id", "email", "first_name", "last_name"],
      } as any)
    );
  } catch {
    deleteCookie(event, "election_cms_token", { path: "/" });
    throw createError({
      statusCode: 401,
      message: "Session expirée, veuillez vous reconnecter",
    });
  }

  // Vérifier qu'une élection active existe
  const adminDirectus = getCmsClient();
  const activeElections = await adminDirectus
    .request(
      readItems("elections", {
        fields: ["id", "name", "rounds"],
        filter: { pv_upload_active: { _eq: true } },
        sort: ["-year", "-id"],
        limit: 1,
      })
    )
    .catch(() => []);

  const activeElection = (activeElections as any[])[0];
  if (!activeElection) {
    throw createError({
      statusCode: 403,
      message: "L'upload de PVs n'est pas activé pour le moment.",
    });
  }

  // Lire le formulaire multipart
  const form = await readMultipartFormData(event);
  if (!form) {
    throw createError({ statusCode: 400, message: "Formulaire invalide" });
  }

  const getField = (name: string) => form.find((f) => f.name === name);

  const fileField = getField("file");
  const electionIdField = getField("election_id");
  const sourceField = getField("source");
  const tourField = getField("tour");
  const bureauField = getField("bureau");

  const requestedElectionId = Number(electionIdField?.data?.toString("utf-8").trim() || "0") || null;

  let selectedElection = activeElection;
  if (requestedElectionId) {
    const electionRows = await adminDirectus
      .request(
        readItems("elections", {
          fields: ["id", "name", "rounds", "pv_upload_active"],
          filter: { id: { _eq: requestedElectionId } },
          limit: 1,
        })
      )
      .catch(() => []);

    const requestedElection = (electionRows as any[])[0] || null;
    if (!requestedElection || !requestedElection.pv_upload_active) {
      throw createError({
        statusCode: 403,
        message: "L'élection sélectionnée n'accepte pas l'upload de PVs",
      });
    }

    selectedElection = requestedElection;
  }

  // National
  const regionField = getField("region");
  const departmentField = getField("department");
  const municipalityField = getField("municipality");
  const pollingPlaceField = getField("polling_place");

  // Diaspora
  const countryField = getField("country");
  const diplomaticRepresentationField = getField("diplomatic_representation");
  const localityField = getField("locality");

  // Validation des champs communs
  if (!fileField?.data) {
    throw createError({ statusCode: 400, message: "Le fichier est requis" });
  }

  const source = sourceField?.data?.toString("utf-8").trim() || "national";
  const submittedTour = tourField?.data?.toString("utf-8").trim();
  const rounds = Number((selectedElection as any)?.rounds || 0);
  const isSingleRoundElection = rounds === 1;
  const tour = isSingleRoundElection ? "1" : submittedTour;
  const bureau = bureauField?.data?.toString("utf-8").trim();

  if (!bureau) {
    throw createError({
      statusCode: 400,
      message: "Bureau requis",
    });
  }

  if (!isSingleRoundElection && !tour) {
    throw createError({
      statusCode: 400,
      message: "Tour requis",
    });
  }

  if (tour && !["1", "2"].includes(tour)) {
    throw createError({
      statusCode: 400,
      message: "Tour invalide (1 ou 2)",
    });
  }

  if (!["national", "diaspora"].includes(source)) {
    throw createError({
      statusCode: 400,
      message: "Source invalide (national ou diaspora)",
    });
  }

  // Validation conditionnelle selon source
  let region: string | undefined;
  let department: string | undefined;
  let municipality: string | undefined;
  let pollingPlace: string | undefined;
  let country: string | undefined;
  let diplomaticRepresentation: string | undefined;
  let locality: string | undefined;

  if (source === "national") {
    region = regionField?.data?.toString("utf-8").trim();
    department = departmentField?.data?.toString("utf-8").trim();
    municipality = municipalityField?.data?.toString("utf-8").trim();
    pollingPlace = pollingPlaceField?.data?.toString("utf-8").trim();

    if (!region || !department || !municipality || !pollingPlace) {
      throw createError({
        statusCode: 400,
        message: "Région, département, commune et lieu de vote sont requis pour un PV national",
      });
    }
  } else {
    // diaspora
    country = countryField?.data?.toString("utf-8").trim();
    diplomaticRepresentation = diplomaticRepresentationField?.data?.toString("utf-8").trim();
    locality = localityField?.data?.toString("utf-8").trim();

    if (!country || !diplomaticRepresentation) {
      throw createError({
        statusCode: 400,
        message: "Pays et représentation diplomatique sont requis pour un PV diaspora",
      });
    }
  }

  // Valider le type d'image
  const mimeType = fileField.type || "";
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw createError({
      statusCode: 400,
      message: "Seules les images JPG, PNG et WEBP sont acceptées",
    });
  }

  // Valider la taille
  if (fileField.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: "Le fichier ne doit pas dépasser 20 Mo",
    });
  }

  // 1. Upload l'image avec le token utilisateur
  const fileFormData = new FormData();
  const fileBytes = new Uint8Array(fileField.data);
  fileFormData.append(
    "file",
    new File([fileBytes], fileField.filename || "pv.jpg", {
      type: mimeType,
    })
  );

  let imageId: string;
  try {
    const uploaded = await userClient.request(uploadFiles(fileFormData));
    const fileObj = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    imageId = (fileObj as any)?.id ?? (fileObj as any)?.data?.id;
    if (!imageId) throw new Error("Directus n'a pas retourné d'ID de fichier");
  } catch (err: any) {
    const directusMsg = err?.errors?.[0]?.message || err?.message || String(err);
    console.error("[pvs-upload] Erreur upload fichier Directus:", directusMsg);
    const statusCode = err?.response?.status === 403 ? 403 : 500;
    const userMsg =
      statusCode === 403
        ? "Permissions insuffisantes pour uploader le fichier."
        : "L'upload de l'image a échoué. Vérifiez le format et la taille (max 20 Mo).";
    throw createError({ statusCode, message: userMsg });
  }

  // 2. Créer l'entrée election_pvs (avec le token utilisateur)
  const pvData: any = {
    status: "draft",
    election: selectedElection.id,
    source,
    tour,
    bureau,
    image: imageId,
  };

  if (source === "national") {
    pvData.region = region;
    pvData.department = department;
    pvData.municipality = municipality;
    pvData.polling_place = pollingPlace;
  } else {
    pvData.country = country;
    pvData.diplomatic_representation = diplomaticRepresentation;
    if (locality) pvData.locality = locality;
  }

  try {
    const pv = await userClient.request(createItem("election_pvs", pvData));

    // La notification email est gérée automatiquement par le Flow Directus
    // (Trigger sur items.create de election_pvs)

    return {
      success: true,
      message: "PV soumis avec succès ! Il sera publié après vérification.",
      pv,
    };
  } catch (err: any) {
    const directusMsg = err?.errors?.[0]?.message || err?.message || String(err);
    console.error("[pvs-upload] Erreur création PV:", directusMsg);
    throw createError({
      statusCode: 500,
      message: "Erreur lors de la création du PV",
    });
  }
});
