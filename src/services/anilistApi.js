// Service to fetch Anime & Manga data directly from AniList GraphQL API

const ANILIST_API_URL = 'https://graphql.anilist.co';

export const MEDIA_TYPES = {
  ANIME: 'ANIME',
  MANGA: 'MANGA',
};

const BROWSE_QUERY = `
query ($page: Int, $perPage: Int, $type: MediaType, $search: String, $sort: [MediaSort], $season: MediaSeason, $seasonYear: Int, $genre: String, $format: MediaFormat, $status: MediaStatus) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: $type, search: $search, sort: $sort, season: $season, seasonYear: $seasonYear, genre: $genre, format: $format, status: $status, isAdult: false) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      type
      format
      status
      description
      season
      seasonYear
      episodes
      chapters
      volumes
      duration
      averageScore
      popularity
      genres
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
    }
  }
}
`;

const MEDIA_DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    type
    format
    status
    description(asHtml: false)
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    season
    seasonYear
    episodes
    duration
    chapters
    volumes
    averageScore
    meanScore
    popularity
    favourites
    genres
    studios(isMain: true) {
      nodes {
        id
        name
      }
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    trailer {
      id
      site
      thumbnail
    }
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
    characters(sort: [ROLE, RELEVANCE], perPage: 8) {
      edges {
        role
        node {
          id
          name {
            full
            native
          }
          image {
            medium
          }
        }
        voiceActors(language: JAPANESE) {
          id
          name {
            full
          }
          image {
            medium
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
        }
      }
    }
    recommendations(perPage: 6, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
          id
          type
          format
          title {
            romaji
            english
          }
          coverImage {
            medium
          }
          averageScore
        }
      }
    }
  }
}
`;

// Simple memory cache to make navigation instantaneous and prevent duplicate calls
const queryCache = new Map();

export async function fetchAniList(query, variables = {}) {
  const cacheKey = JSON.stringify({ query, variables });
  if (queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey);
    // 5 min cache
    if (Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
  }

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AniList API error (${response.status}): ${errText}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0].message);
    }

    queryCache.set(cacheKey, { timestamp: Date.now(), data: json.data });
    return json.data;
  } catch (err) {
    console.warn("AniList request failed, falling back if available:", err);
    throw err;
  }
}

export async function searchMedia({
  page = 1,
  perPage = 20,
  type = 'ANIME',
  search = undefined,
  sort = ['TRENDING_DESC', 'POPULARITY_DESC'],
  season = undefined,
  seasonYear = undefined,
  genre = undefined,
  format = undefined,
  status = undefined
}) {
  const variables = {
    page,
    perPage,
    type,
    search: search ? search.trim() : undefined,
    sort,
    season: season || undefined,
    seasonYear: seasonYear ? parseInt(seasonYear, 10) : undefined,
    genre: genre || undefined,
    format: format || undefined,
    status: status || undefined,
  };

  const data = await fetchAniList(BROWSE_QUERY, variables);
  return data.Page;
}

export async function getMediaDetail(id) {
  const data = await fetchAniList(MEDIA_DETAIL_QUERY, { id: parseInt(id, 10) });
  return data.Media;
}
